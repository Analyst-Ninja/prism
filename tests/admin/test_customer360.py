from decimal import Decimal

from tests.admin.conftest import first_doc


def test_360_from_redis_masks_pii(client, seeded):
    doc = first_doc(seeded)
    r = client.get(f"/customers/{doc['profile']['customer_id']}/360")
    assert r.status_code == 200
    body = r.json()
    assert body["source"] == "redis" and body["degraded"] is False
    assert body["profile"]["email"] != doc["profile"]["email"]
    assert "***@" in body["profile"]["email"]
    assert body["profile"]["phone"].endswith(doc["profile"]["phone"][-4:])
    assert "*" in body["profile"]["phone"]
    assert Decimal(body["totals"]["total_balance"]) == Decimal(doc["totals"]["total_balance"])
    assert len(body["recent_transactions"]) <= 10
    assert set(body["flags"]) == {"kyc_pending", "has_frozen_account", "has_no_accounts", "dormant"}


def test_total_balance_equals_sum_of_accounts(client, seeded):
    for doc in seeded.docs[:5]:
        body = client.get(f"/customers/{doc['profile']['customer_id']}/360").json()
        assert Decimal(body["totals"]["total_balance"]) == sum(Decimal(a["balance"]) for a in body["accounts"])


def test_unknown_customer_404(client, seeded):
    assert client.get("/customers/999999999/360").status_code == 404


def test_malformed_id_422(client):
    assert client.get("/customers/abc/360").status_code == 422
    assert client.get("/customers/12345/360").status_code == 422


def test_accounts_slice(client, seeded):
    doc = first_doc(seeded)
    body = client.get(f"/customers/{doc['profile']['customer_id']}/accounts").json()
    assert [a["account_number"] for a in body["accounts"]] == [a["account_number"] for a in doc["accounts"]]
    assert body["totals"]["account_count"] == len(doc["accounts"])


def test_transactions_slice_respects_limit(client, seeded):
    doc = max(seeded.docs, key=lambda d: len(d["recent_transactions"]))
    cid = doc["profile"]["customer_id"]
    assert len(client.get(f"/customers/{cid}/transactions").json()["transactions"]) == len(doc["recent_transactions"])
    assert len(client.get(f"/customers/{cid}/transactions?limit=2").json()["transactions"]) == 2
    assert client.get(f"/customers/{cid}/transactions?limit=11").status_code == 422


def test_freshness(client, seeded):
    doc = first_doc(seeded)
    body = client.get(f"/customers/{doc['profile']['customer_id']}/freshness").json()
    assert body["source_lsn"] == doc["meta"]["source_lsn"]
    assert body["lag_seconds"] >= 0


def test_redis_down_falls_back_to_lakehouse(dead_redis_client, dataset):
    doc = first_doc(dataset)
    r = dead_redis_client.get(f"/customers/{doc['profile']['customer_id']}/360")
    assert r.status_code == 200
    body = r.json()
    assert body["source"] == "iceberg" and body["degraded"] is True
    assert "lakehouse" in body["notice"].lower()
    assert "***@" in body["profile"]["email"]  # still masked in degraded mode


def test_redis_down_unknown_customer_404(dead_redis_client):
    assert dead_redis_client.get("/customers/999999999/360").status_code == 404
