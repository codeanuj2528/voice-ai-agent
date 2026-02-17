import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Groq API
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")

    # Jina AI API
    jina_api_key: str = os.getenv("JINA_API_KEY", "")

    # LiveKit
    livekit_url: str = os.getenv("LIVEKIT_URL", "ws://localhost:7880")
    livekit_api_key: str = os.getenv("LIVEKIT_API_KEY", "devkey")
    livekit_api_secret: str = os.getenv("LIVEKIT_API_SECRET", "secret")

    # Deepgram API
    deepgram_api_key: str = os.getenv("DEEPGRAM_API_KEY", "")

    # Firebase / Firestore
    firebase_project_id: str = os.getenv("FIREBASE_PROJECT_ID", "")
    firebase_client_email: str = os.getenv("FIREBASE_CLIENT_EMAIL", "")
    firebase_private_key: str = os.getenv("FIREBASE_PRIVATE_KEY", "")

    # App
    prompt_file: str = os.getenv("PROMPT_FILE", "system_prompt.json")

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
