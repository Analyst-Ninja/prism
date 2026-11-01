from collections import defaultdict
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

from admin_api.stores.lakehouse import ExploreFilters, GroupBy
from admin_api.stores.sample_data import Dataset

_CENT = Decimal("0.01")


class FakeLakehouse:
    """In-memory LakehouseReader over a sample Dataset (LAKEHOUSE_BACKEND=fake)."""

    def __init__(self, dataset: Dataset) -> None:
        self._docs = {d["profile"]["customer_id"]: d for d in dataset.docs}
        self._txns = dataset.transactions

    def customer_snapshot(self, customer_id: str) -> dict | None:
        return self._docs.get(customer_id)

    def search_customers(self, email: str | None, last_name: str | None, q: str | None, limit: int) -> list[dict]:
        out = []
        for doc in self._docs.values():
            p = doc["profile"]
            if email and email.lower() not in p["email"].lower():
                continue
            if last_name and last_name.lower() != p["last_name"].lower():
                continue
            if q and q.lower() not in f"{p['first_name']} {p['last_name']} {p['email']} {p['customer_id']}".lower():
                continue
            out.append(p)
        return out[:limit]

    def _filtered(self, f: ExploreFilters) -> list[dict]:
        rows = []
        for t in self._txns:
            day = datetime.fromisoformat(t["created_at"]).date()
            if f.date_from and day < f.date_from:
                continue
            if f.date_to and day > f.date_to:
                continue
            if f.account_type and t["account_type"] != f.account_type:
                continue
            if f.txn_type and t["type"] != f.txn_type:
                continue
            if f.status and t["status"] != f.status:
                continue
            rows.append(t)
        return rows

    def transactions(self, filters: ExploreFilters, limit: int, offset: int) -> list[dict]:
        rows = sorted(self._filtered(filters), key=lambda t: t["created_at"], reverse=True)
        return rows[offset : offset + limit]

    def summary(self, group_by: GroupBy, filters: ExploreFilters) -> list[dict]:
        groups: dict[str, list[Decimal]] = defaultdict(list)
        for t in self._filtered(filters):
            key = {
                "account_type": t["account_type"],
                "txn_type": t["type"],
                "status": t["status"],
                "month": t["created_at"][:7],
            }[group_by]
            groups[key].append(Decimal(t["amount"]))
        return [
            {
                "group": key,
                "count": len(vals),
                "total_amount": sum(vals, Decimal(0)),
                "avg_amount": (sum(vals, Decimal(0)) / len(vals)).quantize(_CENT, ROUND_HALF_UP),
            }
            for key, vals in sorted(groups.items())
        ]

    def customer_count(self) -> int:
        return len(self._docs)
