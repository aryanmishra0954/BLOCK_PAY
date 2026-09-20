"""
BlockPay Flask Backend — Configuration
Loads settings from environment variables (.env file).
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration loaded from environment variables."""

    PORT = int(os.getenv("PORT", 3000))
    FLASK_ENV = os.getenv("FLASK_ENV", os.getenv("NODE_ENV", "development"))
    DEBUG = FLASK_ENV != "production"

    ALLOWED_ORIGINS = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:5500,https://teamBlockPay.vercel.app",
    ).split(",")

    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
