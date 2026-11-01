from decimal import Decimal

from tests.admin.conftest import first_doc


def test_search_by_last_name_masks(client, dataset):
    doc = first_doc(dataset)
    rows = client.get("/customers/search", params={"last_name": doc["profile"]["last_name"]}).json()
    assert any(r["customer_id"] == doc["profile"]["customer_id"] for r in rows)
    assert all("***@" in r["email"] for r in rows)


def test_search_by_id_fragment(client, dataset):
    cid = dataset.docs[3]["profile"]["customer_id"]
    rows = client.get("/customers/search", params={"q": cid}).json()
    assert [r["customer_id"] for r in rows] == [cid]


def test_search_is_not_read_as_customer_id(client):
    assert client.get("/customers/search").status_code == 200


def test_explore_transactions_filters(client, dataset):
    expected = [t for t in dataset.transactions if t["type"] == "deposit" and t["account_type"] == "savings"]
    rows = client.get(
        "/explore/transactions", params={"txn_type": "deposit", "account_type": "savings", "limit": 200}
    ).json()
    assert len(rows) == len(expected)
    assert all(r["type"] == "deposit" and r["account_type"] == "savings" for r in rows)
    assert [r["created_at"] for r in rows] == sorted((r["created_at"] for r in rows), reverse=True)


def test_explore_pagination(client, dataset):
    first = client.get("/explore/transactions", params={"limit": 5, "offset": 0}).json()
    second = client.get("/explore/transactions", params={"limit": 5, "offset": 5}).json()
    assert len(first) == 5 and not {r["id"] for r in first} & {r["id"] for r in second}


def test_explore_summary_matches_raw_data(client, dataset):
    rows = {r["group"]: r for r in client.get("/explore/summary", params={"group_by": "txn_type"}).json()}
    for kind in ("deposit", "withdrawal", "transfer"):
        amounts = [Decimal(t["amount"]) for t in dataset.transactions if t["type"] == kind]
        if amounts:
            assert rows[kind]["count"] == len(amounts)
            assert Decimal(rows[kind]["total_amount"]) == sum(amounts)
            assert Decimal(rows[kind]["avg_amount"]) == (sum(amounts) / len(amounts)).quantize(Decimal("0.01"))


def test_explore_summary_by_month_and_date_filter(client, dataset):
    rows = client.get("/explore/summary", params={"group_by": "month"}).json()
    assert sum(r["count"] for r in rows) == len(dataset.transactions)
    assert all(len(r["group"]) == 7 for r in rows)
    none = client.get("/explore/summary", params={"date_from": "2100-01-01"}).json()
    assert none == []


def test_explore_rejects_bad_filter(client):
    assert client.get("/explore/transactions", params={"txn_type": "bogus"}).status_code == 422
    assert client.get("/explore/summary", params={"group_by": "bogus"}).status_code == 422


def test_ops_status_in_sync_and_not(client, seeded, redis_client):
    body = client.get("/ops/status").json()
    assert body["redis_up"] and body["in_sync"] and body["redis_customer_keys"] == body["lakehouse_customers"] == 20
    redis_client.delete(f"customer:{seeded.docs[0]['profile']['customer_id']}")
    assert client.get("/ops/status").json()["in_sync"] is False


def test_ops_status_redis_down(dead_redis_client):
    body = dead_redis_client.get("/ops/status").json()
    assert body["redis_up"] is False and body["in_sync"] is False


def test_consistency_detects_drift(client, seeded, redis_client):
    import json

    doc = first_doc(seeded)
    cid = doc["profile"]["customer_id"]
    assert client.get(f"/ops/consistency/{cid}").json()["match"] is True
    tampered = json.loads(json.dumps(doc))
    tampered["totals"]["total_balance"] = "1.00"
    redis_client.set(f"customer:{cid}", json.dumps(tampered))
    assert client.get(f"/ops/consistency/{cid}").json()["match"] is False
