from datetime import UTC, datetime

import redis

from admin_api.errors import NotFound, ServiceUnavailable
from admin_api.masking import mask_email, mask_phone
from admin_api.stores.lakehouse import LakehouseReader
from admin_api.stores.redis_store import Customer360Store

DEGRADED_NOTICE = "Live view unavailable, showing lakehouse view"


def fetch_doc(customer_id: str, store: Customer360Store, lakehouse: LakehouseReader) -> tuple[dict, dict]:
    """Redis first. If Redis is down, fall back to the lakehouse. Returns (doc, served_info)."""
    try:
        doc = store.get(customer_id)
        if doc is None:
            raise NotFound(f"customer {customer_id} not found in live store")
        return doc, {"source": "redis", "degraded": False, "notice": None}
    except redis.RedisError:
        pass
    try:
        doc = lakehouse.customer_snapshot(customer_id)
    except Exception as exc:  # lakehouse also failing -> nothing left to serve
        raise ServiceUnavailable("live store and lakehouse both unavailable") from exc
    if doc is None:
        raise NotFound(f"customer {customer_id} not found")
    return doc, {"source": "iceberg", "degraded": True, "notice": DEGRADED_NOTICE}


def mask_profile(profile: dict) -> dict:
    return {**profile, "email": mask_email(profile.get("email")), "phone": mask_phone(profile.get("phone"))}


def masked(doc: dict) -> dict:
    return {**doc, "profile": mask_profile(doc["profile"])}


def lag_seconds(last_updated_at: str) -> float:
    return max(0.0, (datetime.now(UTC) - datetime.fromisoformat(last_updated_at)).total_seconds())
