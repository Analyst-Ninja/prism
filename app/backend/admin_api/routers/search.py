from typing import Annotated

from fastapi import APIRouter, Query

from admin_api.deps import Lakehouse
from admin_api.schemas import CustomerSummary
from admin_api.services.customer360 import mask_profile

router = APIRouter(prefix="/customers", tags=["search"])


@router.get("/search", response_model=list[CustomerSummary])
def search_customers(
    lakehouse: Lakehouse,
    email: str | None = None,
    last_name: str | None = None,
    q: str | None = None,
    limit: Annotated[int, Query(ge=1, le=20)] = 20,
):
    """Redis is key-value only, so name/email search goes to the lakehouse. Results are masked."""
    rows = lakehouse.search_customers(email=email, last_name=last_name, q=q, limit=limit)
    return [mask_profile(r) for r in rows]
