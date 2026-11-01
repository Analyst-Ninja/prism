from decimal import Decimal

from admin_api.stores.sample_data import build_dataset


def test_deterministic():
    assert build_dataset(5, 1).docs == build_dataset(5, 1).docs


def test_docs_are_internally_consistent(dataset):
    for d in dataset.docs:
        total = sum(Decimal(a["balance"]) for a in d["accounts"])
        assert Decimal(d["totals"]["total_balance"]) == total
        assert d["totals"]["account_count"] == len(d["accounts"])
        assert len(d["recent_transactions"]) <= 10
        assert all(Decimal(a["balance"]) >= 0 for a in d["accounts"])
        assert d["flags"]["has_no_accounts"] == (not d["accounts"])
        assert d["flags"]["kyc_pending"] == (d["profile"]["status"] == "kyc_pending")


def test_id_formats(dataset):
    for d in dataset.docs:
        assert len(d["profile"]["customer_id"]) == 9
        assert all(len(a["account_number"]) == 15 for a in d["accounts"])
