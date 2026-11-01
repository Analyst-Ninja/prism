"""Admin API settings. Deliberately separate from common.settings: admin has NO Postgres config (ADR 0002)."""

from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class AdminSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    redis_url: str = "redis://localhost:6379/0"
    redis_timeout_seconds: float = 1.0
    lakehouse_backend: Literal["fake", "iceberg"] = "fake"
    # Fake data parameters. The Redis seeder and the fake lakehouse must use the same values.
    fake_customers: int = 20
    fake_seed: int = 42


settings = AdminSettings()
