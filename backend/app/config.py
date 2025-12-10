"""Application configuration via environment variables."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Database configuration
    database_url: str = "memory://"
    database_echo: bool = False
    database_pool_size: int = 5
    database_max_overflow: int = 10

    # Repository selection
    repository_type: Literal["memory", "postgres"] = "memory"

    @property
    def is_postgres(self) -> bool:
        """Check if using PostgreSQL backend."""
        return self.repository_type == "postgres" or self.database_url.startswith(
            "postgresql"
        )

    @property
    def async_database_url(self) -> str:
        """Get database URL with asyncpg driver for SQLAlchemy async."""
        url = self.database_url
        # Convert standard PostgreSQL URL to asyncpg format
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
