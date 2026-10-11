import uuid
import io
import pytest
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.database import (
    check_mongo_connection,
    get_word_reports_collection,
    get_reported_words_collection,
    init_db_indexes
)
from app.services.migration_service import migrate_json_to_mongo


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def auth_headers():
    return {"x-api-key": settings.api_key}


def test_01_mongodb_connection_succeeds(client):
    """Case 1: MongoDB connection succeeds and health check reports accurate status."""
    health = check_mongo_connection()
    assert health["connected"] is True
    assert health["status"] == "connected"
    assert health["database"] == settings.mongo_db_name

    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["status"] == "healthy"
    assert data["database"]["status"] == "connected"
    assert data["database"]["name"] == settings.mongo_db_name


def test_02_api_key_authentication_enforced(client, auth_headers):
    """Case 8: Existing API-key authentication still works."""
    test_word = f"auth_test_{uuid.uuid4().hex[:6]}"
    payload = {"word": test_word, "toxicity_score": 0.5, "user_id": "auth_user"}

    # Missing API key -> 401
    res_no_key = client.post("/api/v1/report/word", json=payload)
    assert res_no_key.status_code == 401
    assert "API key is required" in res_no_key.json()["detail"]

    # Invalid API key -> 403
    res_bad_key = client.post("/api/v1/report/word", json=payload, headers={"x-api-key": "invalid-wrong-key"})
    assert res_bad_key.status_code == 403
    assert "Invalid API key" in res_bad_key.json()["detail"]

    # Valid API key -> 200
    res_ok = client.post("/api/v1/report/word", json=payload, headers=auth_headers)
    assert res_ok.status_code == 200
    assert res_ok.json()["success"] is True


def test_03_invalid_scores_and_empty_inputs_rejected(client, auth_headers):
    """Case 7: Invalid scores and empty inputs are rejected."""
    # Empty word
    res = client.post(
        "/api/v1/report/word",
        json={"word": "   ", "toxicity_score": 0.5, "user_id": "u1"},
        headers=auth_headers
    )
    assert res.status_code == 400
    assert "Word cannot be empty" in res.json()["detail"]

    # Empty user_id
    res = client.post(
        "/api/v1/report/word",
        json={"word": "toxicword", "toxicity_score": 0.5, "user_id": "   "},
        headers=auth_headers
    )
    assert res.status_code == 400
    assert "user_id cannot be empty" in res.json()["detail"]

    # Score below 0
    res = client.post(
        "/api/v1/report/word",
        json={"word": "toxicword", "toxicity_score": -0.1, "user_id": "u1"},
        headers=auth_headers
    )
    assert res.status_code == 400
    assert "between 0 and 1" in res.json()["detail"]

    # Score above 1
    res = client.post(
        "/api/v1/report/word",
        json={"word": "toxicword", "toxicity_score": 1.25, "user_id": "u1"},
        headers=auth_headers
    )
    assert res.status_code == 400
    assert "between 0 and 1" in res.json()["detail"]


def test_04_first_report_creates_word_record(client, auth_headers):
    """Case 2: First report creates the word record."""
    test_word = f"flow_word_{uuid.uuid4().hex[:6]}"
    res = client.post(
        "/api/v1/report/word",
        json={"word": test_word, "toxicity_score": 0.70, "user_id": "user_alpha"},
        headers=auth_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["message"] == "Word reported successfully."
    assert data["word"] == test_word
    assert data["report_count"] == 1
    assert data["average_toxicity"] == 0.70
    assert data["verified"] is False

    # Check MongoDB collection records
    wr_col = get_word_reports_collection()
    rw_col = get_reported_words_collection()
    assert wr_col.count_documents({"word": test_word}) == 1
    rw_doc = rw_col.find_one({"word": test_word})
    assert rw_doc is not None
    assert rw_doc["report_count"] == 1
    assert rw_doc["verified"] is False


def test_05_second_distinct_user_increases_count_and_duplicate_blocked(client, auth_headers):
    """Cases 3 & 4: Second distinct user increases count; duplicate user does not."""
    test_word = f"flow_word_{uuid.uuid4().hex[:6]}"

    # User 1 report
    r1 = client.post(
        "/api/v1/report/word",
        json={"word": test_word, "toxicity_score": 0.60, "user_id": "user_one"},
        headers=auth_headers
    )
    assert r1.status_code == 200
    assert r1.json()["report_count"] == 1

    # User 2 report (distinct user -> count increases)
    r2 = client.post(
        "/api/v1/report/word",
        json={"word": test_word, "toxicity_score": 0.80, "user_id": "user_two"},
        headers=auth_headers
    )
    assert r2.status_code == 200
    assert r2.json()["report_count"] == 2
    assert r2.json()["average_toxicity"] == 0.70
    assert r2.json()["message"] == "Report added successfully."

    # User 1 reports same word again (duplicate user -> count does not increase)
    r_dup = client.post(
        "/api/v1/report/word",
        json={"word": test_word, "toxicity_score": 0.99, "user_id": "user_one"},
        headers=auth_headers
    )
    assert r_dup.status_code == 200
    dup_data = r_dup.json()
    assert dup_data["success"] is True
    assert dup_data["message"] == "This user has already reported this word."
    assert dup_data["report_count"] == 2
    assert dup_data["average_toxicity"] == 0.70
    assert dup_data["verified"] is False

    # Check database: only 2 individual reports exist
    wr_col = get_word_reports_collection()
    assert wr_col.count_documents({"word": test_word}) == 2


def test_06_five_distinct_users_verify_word_and_average_score(client, auth_headers):
    """Cases 5 & 6: Five distinct users verify word and average toxicity score is exact."""
    test_word = f"verify_word_{uuid.uuid4().hex[:6]}"
    scores = [0.60, 0.70, 0.80, 0.90, 1.00]
    # Expected average: (0.6 + 0.7 + 0.8 + 0.9 + 1.0) / 5 = 4.0 / 5 = 0.80

    for i in range(4):
        res = client.post(
            "/api/v1/report/word",
            json={"word": test_word, "toxicity_score": scores[i], "user_id": f"distinct_user_{i+1}"},
            headers=auth_headers
        )
        assert res.status_code == 200
        assert res.json()["report_count"] == i + 1
        assert res.json()["verified"] is False

    # 5th report triggers verification
    res_5 = client.post(
        "/api/v1/report/word",
        json={"word": test_word, "toxicity_score": scores[4], "user_id": "distinct_user_5"},
        headers=auth_headers
    )
    assert res_5.status_code == 200
    data_5 = res_5.json()
    assert data_5["report_count"] == 5
    assert data_5["average_toxicity"] == 0.80
    assert data_5["verified"] is True
    assert data_5["message"] == "Word verified and added to custom moderation vocabulary."

    # Verify MongoDB record
    rw_col = get_reported_words_collection()
    doc = rw_col.find_one({"word": test_word})
    assert doc is not None
    assert doc["verified"] is True
    assert doc["report_count"] == 5
    assert doc["average_toxicity"] == 0.80


def test_07_text_and_image_analysis_endpoints_work(client, auth_headers):
    """Case 9: Text and image analysis endpoints continue working."""
    # 1. Text analysis
    res_text = client.post(
        "/api/v1/analyze/text",
        json={"text": "Good morning, hope you have a great day!", "moderation_level": "intermediate"},
        headers=auth_headers
    )
    assert res_text.status_code == 200
    data_text = res_text.json()
    assert data_text["success"] is True
    assert data_text["input_type"] == "text"
    assert "toxicity_score" in data_text
    assert "action" in data_text
    assert data_text["is_toxic"] is False

    # 2. Image analysis (create a clean in-memory PNG)
    img = Image.new("RGB", (200, 100), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((20, 40), "hello world", fill=(0, 0, 0))
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    res_img = client.post(
        "/api/v1/analyze/image",
        files={"file": ("test.png", buffer, "image/png")},
        data={"moderation_level": "beginner"},
        headers=auth_headers
    )
    assert res_img.status_code == 200
    data_img = res_img.json()
    assert data_img["success"] is True
    assert data_img["input_type"] == "image"
    assert "toxicity_score" in data_img


def test_08_migration_idempotent_no_duplicates():
    """Case 10: Running the migration twice does not duplicate reports."""
    # First run
    m1 = migrate_json_to_mongo()
    assert m1["success"] is True

    # Second run immediately
    m2 = migrate_json_to_mongo()
    assert m2["success"] is True
    assert m2["newly_inserted_reports"] == 0
    assert m2["already_existing_reports"] >= 5


def test_09_concurrent_reports_handled_safely(client, auth_headers):
    """Concurrency verification: Simultaneous reports handle race conditions cleanly."""
    from concurrent.futures import ThreadPoolExecutor

    test_word = f"concurrent_word_{uuid.uuid4().hex[:6]}"

    # 10 concurrent requests:
    # 5 unique users, and 5 repeated attempts from user_1
    tasks = []
    # 5 unique users
    for i in range(1, 6):
        tasks.append((test_word, 0.80, f"conc_user_{i}"))
    # 5 duplicate attempts from conc_user_1
    for _ in range(5):
        tasks.append((test_word, 0.80, "conc_user_1"))

    def send_report(item):
        w, s, u = item
        return client.post(
            "/api/v1/report/word",
            json={"word": w, "toxicity_score": s, "user_id": u},
            headers=auth_headers
        )

    with ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(send_report, tasks))

    # All requests should return 200 OK
    assert all(r.status_code == 200 for r in results)

    # Check database state: exactly 5 distinct user reports exist
    wr_col = get_word_reports_collection()
    rw_col = get_reported_words_collection()

    distinct_count = wr_col.count_documents({"word": test_word})
    assert distinct_count == 5

    # Check aggregated record
    doc = rw_col.find_one({"word": test_word})
    assert doc is not None
    assert doc["report_count"] == 5
    assert doc["verified"] is True

