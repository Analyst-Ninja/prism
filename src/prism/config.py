"""Single switch between local and AWS runtime. Everything reads config from here."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Literal

StorageBackend = Literal["local", "s3"]


@dataclass(frozen=True)
class Settings:
    storage_backend: StorageBackend
    warehouse_uri: str  # file:///data/warehouse (local) or s3://<bucket>/warehouse (aws)
    catalog_type: str  # sql (local sqlite) or glue (aws)
    catalog_uri: str | None
    kafka_bootstrap: str
    postgres_dsn: str
    redis_url: str

    @classmethod
    def from_env(cls) -> Settings:
        backend = os.getenv("STORAGE_BACKEND", "local")
        if backend not in ("local", "s3"):
            raise ValueError(f"STORAGE_BACKEND must be 'local' or 's3', got {backend!r}")
        return cls(
            storage_backend=backend,  # type: ignore[arg-type]
            warehouse_uri=os.getenv("WAREHOUSE_URI", "file:///data/warehouse"),
            catalog_type=os.getenv("CATALOG_TYPE", "sql"),
            catalog_uri=os.getenv("CATALOG_URI"),
            kafka_bootstrap=os.getenv("KAFKA_BOOTSTRAP", "localhost:9092"),
            postgres_dsn=os.getenv("POSTGRES_DSN", "postgresql://prism:prism@localhost:5432/bank"),
            redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        )
