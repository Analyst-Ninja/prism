from dataclasses import dataclass
from datetime import date
from typing import Literal, Protocol

GroupBy = Literal["account_type", "txn_type", "month", "status"]


@dataclass(frozen=True)
class ExploreFilters:
    date_from: date | None = None
    date_to: date | None = None
    account_type: str | None = None
    txn_type: str | None = None
    status: str | None = None


class LakehouseReader(Protocol):
    """What admin needs from Iceberg Silver. Real PyIceberg implementation plugs in at plan step 4."""

    def customer_snapshot(self, customer_id: str) -> dict | None: ...
    def search_customers(self, email: str | None, last_name: str | None, q: str | None, limit: int) -> list[dict]: ...
    def transactions(self, filters: ExploreFilters, limit: int, offset: int) -> list[dict]: ...
    def summary(self, group_by: GroupBy, filters: ExploreFilters) -> list[dict]: ...
    def customer_count(self) -> int: ...
