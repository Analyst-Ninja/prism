"""ADR 0002: admin_api must never reach Postgres."""

import re
from pathlib import Path

FORBIDDEN = re.compile(r"^\s*(from|import)\s+(customer_api|sqlalchemy|psycopg|common\.settings|alembic)\b", re.MULTILINE)


def test_admin_api_has_no_postgres_imports():
    root = Path(__file__).resolve().parents[2] / "app" / "backend" / "admin_api"
    offenders = [str(p) for p in root.rglob("*.py") if FORBIDDEN.search(p.read_text())]
    assert offenders == []
