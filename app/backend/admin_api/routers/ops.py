from decimal import Decimal

import redis
from fastapi import APIRouter

from admin_api.deps import Lakehouse, Store360
from admin_api.errors import NotFound, ServiceUnavailable
from admin_api.schemas import Consistency, CustomerId, OpsStatus

router = APIRouter(prefix="/ops", tags=["ops"])


@router.get("/status", response_model=OpsStatus)
def status(store: Store360, lakehouse: Lakehouse):
    """Read-only check used after a Redis rebuild: key count should equal lakehouse customer count."""
    lake_count = lakehouse.customer_count()
    if not store.ping():
        return OpsStatus(redis_up=False, redis_customer_keys=None, lakehouse_customers=lake_count, in_sync=False)
    keys = store.key_count()
    return OpsStatus(redis_up=True, redis_customer_keys=keys, lakehouse_customers=lake_count, in_sync=keys == lake_count)


@router.get("/consistency/{customer_id}", response_model=Consistency)
def consistency(customer_id: CustomerId, store: Store360, lakehouse: Lakehouse):
    """Spot-check one customer: Redis total_balance vs lakehouse total_balance."""
    try:
        live = store.get(customer_id)
    except redis.RedisError as exc:
        raise ServiceUnavailable("live store unavailable") from exc
    lake = lakehouse.customer_snapshot(customer_id)
    if live is None or lake is None:
        raise NotFound(f"customer {customer_id} missing in {'redis' if live is None else 'lakehouse'}")
    a, b = Decimal(live["totals"]["total_balance"]), Decimal(lake["totals"]["total_balance"])
    return Consistency(customer_id=customer_id, redis_total_balance=a, lakehouse_total_balance=b, match=a == b)
