from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+psycopg2://wolf:wolf@localhost:5432/wolfbrain"
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_MODEL: str = "openai/gpt-4o-mini"
    STOCKFISH_PATH: str = "stockfish"
    ENGINE_DEPTH_IMPORT: int = 18
    ENGINE_DEPTH_LIVE: int = 14
    DEFAULT_RATING: int = 800
    STOCKFISH_MIN_ELO: int = 1320
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

settings = Settings()
