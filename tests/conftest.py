import os

# Must happen before customer_api imports settings.
TEST_DB = "bank_test"
ADMIN_DSN = os.environ.get("POSTGRES_ADMIN_DSN", "postgresql://prism:prism@localhost:5432/postgres")
os.environ["POSTGRES_DSN"] = ADMIN_DSN.rsplit("/", 1)[0] + f"/{TEST_DB}"

import psycopg
import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text

from alembic import command
from customer_api.db import engine
from customer_api.main import app
from tests.factories import customer_payload


@pytest.fixture(scope="session", autouse=True)
def _database():
    with psycopg.connect(ADMIN_DSN, autocommit=True) as conn:
        exists = conn.execute("SELECT 1 FROM pg_database WHERE datname = %s", (TEST_DB,)).fetchone()
        if not exists:
            conn.execute(f"CREATE DATABASE {TEST_DB}")
    command.upgrade(Config("alembic.ini"), "head")
    yield
    engine.dispose()


@pytest.fixture(autouse=True)
def _clean():
    yield
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE transactions, accounts, customers RESTART IDENTITY CASCADE"))


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def active_customer(client):
    cid = client.post("/customers", json=customer_payload()).json()["customer_id"]
    r = client.patch(f"/customers/{cid}", json={"kyc_status": "active"})
    assert r.json()["status"] == "active"
    return cid


@pytest.fixture
def make_account(client, active_customer):
    def _make(customer_id: str | None = None, type_: str = "savings") -> str:
        r = client.post("/accounts", json={"customer_id": customer_id or active_customer, "type": type_})
        assert r.status_code == 201, r.text
        return r.json()["account_number"]

    return _make
