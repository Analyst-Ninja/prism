from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    postgres_dsn: str = "postgresql://prism:prism@localhost:5432/bank"

    @property
    def sqlalchemy_url(self) -> str:
        return self.postgres_dsn.replace("postgresql://", "postgresql+psycopg://", 1)


settings = Settings()
