import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    app_name: str = os.getenv("APP_NAME", "AI-Based Cyberbullying Detection & Moderation API")
    api_key: str = os.getenv("API_KEY", "")
    mongo_uri: str = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
    mongo_db_name: str = os.getenv("MONGO_DB_NAME", "cyberbullying_db")


settings = Settings()