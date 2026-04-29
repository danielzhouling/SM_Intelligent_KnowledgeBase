from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PORT: int = 8000
    PYTHON_ENV: str = "development"

    # JWT
    JWT_SECRET: str = "change-me"
    JWT_ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # PostgreSQL
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "knowledge_base_app"
    POSTGRES_USER: str = "kb_app"
    POSTGRES_PASSWORD: str = "kb_password_change_me"

    # Dify
    DIFY_API_BASE_URL: str = "http://localhost:3001/v1"
    DIFY_API_KEY_APP_A: str = ""
    DIFY_API_KEY_APP_B: str = ""
    DIFY_API_KEY_APP_C: str = ""

    # Ollama
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_EMBED_MODEL: str = "bge-m3"

    # Qdrant
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333

    # Feishu
    FEISHU_APP_ID: str = ""
    FEISHU_APP_SECRET: str = ""
    FEISHU_APP_TOKEN: str = ""
    FEISHU_TABLE_ID: str = ""

    # Sync
    SYNC_CRON: str = "disabled"

    # CORS
    CORS_ALLOWED_ORIGINS: str = ""  # comma-separated list, e.g. "http://localhost:3000,http://localhost:3001"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def DATABASE_URL_SYNC(self) -> str:
        """Sync URL for aiosqlite in tests."""
        return "sqlite+aiosqlite://"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
