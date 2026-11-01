import re

from tests.factories import customer_payload


def test_register_starts_kyc_pending(client):
    r = client.post("/customers", json=customer_payload())
    assert r.status_code == 201
    assert r.json()["status"] == "kyc_pending"


def test_duplicate_email_conflict(client):
    p = customer_payload()
    assert client.post("/customers", json=p).status_code == 201
    assert client.post("/customers", json=p).status_code == 409


def test_cannot_open_account_before_kyc(client):
    cid = client.post("/customers", json=customer_payload()).json()["customer_id"]
    r = client.post("/accounts", json={"customer_id": cid, "type": "savings"})
    assert r.status_code == 409


def test_update_details(client, active_customer):
    r = client.patch(f"/customers/{active_customer}", json={"phone": "12345"})
    assert r.json()["phone"] == "12345"


def test_unknown_customer_404(client):
    assert client.get("/customers/999999999").status_code == 404


def test_cannot_close_customer_with_open_accounts(client, active_customer, make_account):
    make_account()
    assert client.post(f"/customers/{active_customer}/close").status_code == 409


def test_close_customer_after_closing_accounts(client, active_customer, make_account):
    acc = make_account()
    assert client.post(f"/accounts/{acc}/close").status_code == 200
    r = client.post(f"/customers/{active_customer}/close")
    assert r.status_code == 200 and r.json()["status"] == "closed"


def test_customer_id_is_9_digit_string_and_unique(client):
    ids = [client.post("/customers", json=customer_payload()).json()["customer_id"] for _ in range(5)]
    assert all(re.fullmatch(r"\d{9}", i) for i in ids)
    assert len(set(ids)) == 5


def test_malformed_ids_422(client):
    assert client.get("/customers/abc").status_code == 422
    assert client.get("/customers/12345678").status_code == 422  # 8 digits
    assert client.get("/accounts/123456789").status_code == 422  # 9 digits, not 15
