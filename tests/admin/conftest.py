import json
import os

# Dedicated Redis db so tests never touch dev data. Must be set before admin_api imports settings.
os.environ["REDIS_URL"] = os.environ.get("TEST_REDIS_URL", "redis://localhost:6379/15")
os.environ["FAKE_CUSTOMERS"] = "20"
os.environ["FAKE_SEED"] = "42"

import pytest
import redis
from fastapi.testclient import TestClient

from admin_api.deps import get_lakehouse, get_store
from admin_api.main import app
from admin_api.settings import settings
from admin_api.stores.fake_lakehouse import FakeLakehouse
from admin_api.stores.redis_store import KEY_PREFIX, Customer360Store, make_client
from admin_api.stores.sample_data import build_dataset


@pytest.fixture(scope="session")
def dataset():
    return build_dataset(settings.fake_customers, settings.fake_seed)


@pytest.fixture
def redis_client():
    client = make_client(settings.redis_url, settings.redis_timeout_seconds)
    try:
        client.ping()
    except redis.RedisError:
        pytest.skip("Redis not running (docker compose up -d redis)")
    client.flushdb()
    yield client
    client.flushdb()


@pytest.fixture
def seeded(redis_client, dataset):
    """Stand-in for Flink: put every 360 doc in Redis."""
    for doc in dataset.docs:
        redis_client.set(f"{KEY_PREFIX}{doc['profile']['customer_id']}", json.dumps(doc))
    return dataset


@pytest.fixture
def client(redis_client, dataset):
    app.dependency_overrides[get_store] = lambda: Customer360Store(redis_client)
    app.dependency_overrides[get_lakehouse] = lambda: FakeLakehouse(dataset)
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def dead_redis_client(dataset):
    """Client whose Redis is unreachable -> exercises the lakehouse fallback."""
    dead = make_client("redis://localhost:1/0", 0.2)
    app.dependency_overrides[get_store] = lambda: Customer360Store(dead)
    app.dependency_overrides[get_lakehouse] = lambda: FakeLakehouse(dataset)
    yield TestClient(app)
    app.dependency_overrides.clear()


def first_doc(dataset, *, with_accounts=True):
    return next(d for d in dataset.docs if bool(d["accounts"]) == with_accounts)
