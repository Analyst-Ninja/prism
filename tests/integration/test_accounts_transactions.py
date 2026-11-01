import re
from decimal import Decimal

from tests.factories import amount


def balance(client, acc: str) -> Decimal:
    return Decimal(client.get(f"/accounts/{acc}").json()["balance"])


def test_withdraw_above_balance_rejected(client, make_account):
    acc = make_account()
    client.post(f"/accounts/{acc}/deposit", json={"amount": "50.00"})
    r = client.post(f"/accounts/{acc}/withdraw", json={"amount": "50.01"})
    assert r.status_code == 409
    assert balance(client, acc) == Decimal("50.00")


def test_cannot_close_account_with_money(client, make_account):
    acc = make_account()
    client.post(f"/accounts/{acc}/deposit", json={"amount": "1.00"})
    assert client.post(f"/accounts/{acc}/close").status_code == 409


def test_frozen_account_blocks_transactions(client, make_account):
    acc = make_account()
    client.post(f"/accounts/{acc}/deposit", json={"amount": "100.00"})
    assert client.post(f"/accounts/{acc}/freeze").status_code == 200
    assert client.post(f"/accounts/{acc}/deposit", json={"amount": "1.00"}).status_code == 409
    assert client.post(f"/accounts/{acc}/withdraw", json={"amount": "1.00"}).status_code == 409
    client.post(f"/accounts/{acc}/unfreeze")
    assert client.post(f"/accounts/{acc}/deposit", json={"amount": "1.00"}).status_code == 201


def test_transfer_conserves_money(client, make_account):
    a, b = make_account(), make_account()
    dep = amount(100, 500)
    client.post(f"/accounts/{a}/deposit", json={"amount": dep})
    r = client.post("/transfers", json={"from_account_number": a, "to_account_number": b, "amount": "40.25"})
    assert r.status_code == 201
    assert balance(client, a) == Decimal(dep) - Decimal("40.25")
    assert balance(client, b) == Decimal("40.25")
    assert balance(client, a) + balance(client, b) == Decimal(dep)


def test_transfer_insufficient_or_to_frozen_rejected(client, make_account):
    a, b = make_account(), make_account()
    client.post(f"/accounts/{a}/deposit", json={"amount": "10.00"})
    assert client.post("/transfers", json={"from_account_number": a, "to_account_number": b, "amount": "11"}).status_code == 409
    client.post(f"/accounts/{b}/freeze")
    assert client.post("/transfers", json={"from_account_number": a, "to_account_number": b, "amount": "5"}).status_code == 409
    assert balance(client, a) == Decimal("10.00")


def test_transfer_to_self_rejected(client, make_account):
    a = make_account()
    r = client.post("/transfers", json={"from_account_number": a, "to_account_number": a, "amount": "1"})
    assert r.status_code == 409


def test_invalid_amount_422(client, make_account):
    acc = make_account()
    assert client.post(f"/accounts/{acc}/deposit", json={"amount": "-5"}).status_code == 422
    assert client.post(f"/accounts/{acc}/deposit", json={"amount": "1.234"}).status_code == 422


def test_transaction_history_lists_both_sides(client, make_account):
    a, b = make_account(), make_account()
    client.post(f"/accounts/{a}/deposit", json={"amount": "20.00"})
    client.post("/transfers", json={"from_account_number": a, "to_account_number": b, "amount": "5"})
    assert len(client.get(f"/accounts/{a}/transactions").json()) == 2
    assert [t["type"] for t in client.get(f"/accounts/{b}/transactions").json()] == ["transfer"]


def test_full_lifecycle(client, make_account, active_customer):
    a = make_account()
    client.post(f"/accounts/{a}/deposit", json={"amount": "100"})
    client.post(f"/accounts/{a}/freeze")
    client.post(f"/accounts/{a}/unfreeze")
    client.post(f"/accounts/{a}/withdraw", json={"amount": "100"})
    assert client.post(f"/accounts/{a}/close").json()["status"] == "closed"
    assert client.post(f"/customers/{active_customer}/close").json()["status"] == "closed"


def test_account_number_is_15_digit_string(client, make_account):
    a, b = make_account(), make_account()
    assert re.fullmatch(r"\d{15}", a) and a != b


def test_unknown_account_404(client):
    assert client.get("/accounts/999999999999999").status_code == 404
