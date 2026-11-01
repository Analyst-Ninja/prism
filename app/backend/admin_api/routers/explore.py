from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from admin_api.deps import Lakehouse
from admin_api.schemas import ExploreTxn, SummaryRow
from admin_api.stores.lakehouse import ExploreFilters, GroupBy

router = APIRouter(prefix="/explore", tags=["explore"])


def _filters(
    date_from: date | None = None,
    date_to: date | None = None,
    account_type: Annotated[str | None, Query(pattern="^(savings|current)$")] = None,
    txn_type: Annotated[str | None, Query(pattern="^(deposit|withdrawal|transfer)$")] = None,
    status: Annotated[str | None, Query(pattern="^(completed|failed|reversed)$")] = None,
) -> ExploreFilters:
    return ExploreFilters(date_from, date_to, account_type, txn_type, status)


Filters = Annotated[ExploreFilters, Depends(_filters)]


@router.get("/transactions", response_model=list[ExploreTxn])
def explore_transactions(
    lakehouse: Lakehouse,
    filters: Filters,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return lakehouse.transactions(filters, limit, offset)


@router.get("/summary", response_model=list[SummaryRow])
def explore_summary(lakehouse: Lakehouse, filters: Filters, group_by: GroupBy = "txn_type"):
    return lakehouse.summary(group_by, filters)
