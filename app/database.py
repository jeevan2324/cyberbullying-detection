import logging
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError

from app.config import settings

logger = logging.getLogger(__name__)

_mongo_client: MongoClient | None = None


def get_mongo_client(uri: str | None = None) -> MongoClient:
    """
    Returns a singleton MongoClient instance configured with connection timeouts.
    """
    global _mongo_client
    if _mongo_client is None:
        target_uri = uri or settings.mongo_uri
        _mongo_client = MongoClient(
            target_uri,
            serverSelectionTimeoutMS=2000,
            connectTimeoutMS=2000,
            socketTimeoutMS=3000,
            maxPoolSize=50,
            minPoolSize=5,
        )
    return _mongo_client


def get_db(db_name: str | None = None) -> Database:
    """
    Returns the target database instance (defaults to Settings.mongo_db_name).
    """
    client = get_mongo_client()
    return client[db_name or settings.mongo_db_name]


def get_word_reports_collection() -> Collection:
    """
    Returns the 'word_reports' collection.
    Stores individual user reports with uniqueness on (word, user_id).
    """
    return get_db()["word_reports"]


def get_reported_words_collection() -> Collection:
    """
    Returns the 'reported_words' collection.
    Stores aggregated word records (report count, average toxicity, verified status).
    """
    return get_db()["reported_words"]


def init_db_indexes() -> dict:
    """
    Creates necessary indexes for word_reports and reported_words collections:
    1. word_reports: Unique compound index on (word, user_id) to prevent duplicate reports.
    2. word_reports: Index on word for fast lookups and aggregations.
    3. reported_words: Unique index on word to prevent duplicate aggregate records.
    """
    try:
        word_reports = get_word_reports_collection()
        reported_words = get_reported_words_collection()

        # Enforce uniqueness of (word, user_id) at DB level
        idx_report_user = word_reports.create_index(
            [("word", 1), ("user_id", 1)],
            unique=True,
            name="uniq_word_user"
        )
        idx_report_word = word_reports.create_index(
            [("word", 1)],
            name="idx_report_word"
        )

        # Enforce uniqueness of word in aggregated collection
        idx_aggregated_word = reported_words.create_index(
            [("word", 1)],
            unique=True,
            name="uniq_reported_word"
        )

        logger.info("MongoDB indexes verified/created successfully.")
        return {
            "success": True,
            "indexes": {
                "word_reports": [idx_report_user, idx_report_word],
                "reported_words": [idx_aggregated_word],
            }
        }
    except PyMongoError as e:
        logger.error(f"Failed to create MongoDB indexes: {e}")
        return {
            "success": False,
            "error": "Failed to initialize database indexes."
        }


def check_mongo_connection() -> dict:
    """
    Performs a connection health check using admin ping.
    Returns status without exposing connection strings, passwords, or credentials.
    """
    try:
        client = get_mongo_client()
        # Admin command 'ping' validates server availability within serverSelectionTimeoutMS
        client.admin.command("ping")
        return {
            "connected": True,
            "database": settings.mongo_db_name,
            "status": "connected"
        }
    except ServerSelectionTimeoutError:
        logger.warning("MongoDB connection timed out.")
        return {
            "connected": False,
            "database": settings.mongo_db_name,
            "status": "timeout",
            "error": "Database server selection timed out."
        }
    except PyMongoError as e:
        logger.error(f"MongoDB connection error: {e}")
        return {
            "connected": False,
            "database": settings.mongo_db_name,
            "status": "error",
            "error": "Database connection error."
        }


def close_mongo_client():
    """
    Closes the global MongoDB client connection.
    """
    global _mongo_client
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None
