from typing import Annotated

from fastapi import APIRouter, Query

from admin_api.deps import Lakehouse, Store360
from admin_api.schemas import (
    AccountsResponse,
    Customer360Response,
    CustomerId,
    Freshness,
    TransactionsResponse,
)
from admin_api.services import customer360 as svc

router = APIRouter(prefix="/customers", tags=["customer-360"])


@router.get("/{customer_id}/360", response_model=Customer360Response)
def get_360(customer_id: CustomerId, store: Store360, lakehouse: Lakehouse):
    doc, served = svc.fetch_doc(customer_id, store, lakehouse)
    return {**svc.masked(doc), **served}


@router.get("/{customer_id}/accounts", response_model=AccountsResponse)
def get_accounts(customer_id: CustomerId, store: Store360, lakehouse: Lakehouse):
    doc, served = svc.fetch_doc(customer_id, store, lakehouse)
    return {"customer_id": customer_id, "accounts": doc["accounts"], "totals": doc["totals"], **served}


@router.get("/{customer_id}/transactions", response_model=TransactionsResponse)
def get_transactions(
    customer_id: CustomerId,
    store: Store360,
    lakehouse: Lakehouse,
    limit: Annotated[int, Query(ge=1, le=10)] = 10,
):
    doc, served = svc.fetch_doc(customer_id, store, lakehouse)
    return {"customer_id": customer_id, "transactions": doc["recent_transactions"][:limit], **served}


@router.get("/{customer_id}/freshness", response_model=Freshness)
def get_freshness(customer_id: CustomerId, store: Store360, lakehouse: Lakehouse):
    doc, served = svc.fetch_doc(customer_id, store, lakehouse)
    meta = doc["meta"]
    return {
        "customer_id": customer_id,
        "last_updated_at": meta["last_updated_at"],
        "source_lsn": meta["source_lsn"],
        "lag_seconds": svc.lag_seconds(meta["last_updated_at"]),
        **served,
    }
