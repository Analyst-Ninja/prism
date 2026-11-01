from fastapi import APIRouter, status

from customer_api.db import DbSession
from customer_api.schemas import (
    AccountOut,
    CustomerCreate,
    CustomerId,
    CustomerOut,
    CustomerUpdate,
)
from customer_api.services import accounts as account_svc
from customer_api.services import customers as svc

router = APIRouter(prefix="/customers", tags=["customers"])


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def register(data: CustomerCreate, db: DbSession):
    return svc.register(db, data)


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: CustomerId, db: DbSession):
    return svc.get_customer(db, customer_id)


@router.patch("/{customer_id}", response_model=CustomerOut)
def update_customer(customer_id: CustomerId, data: CustomerUpdate, db: DbSession):
    return svc.update(db, customer_id, data)


@router.post("/{customer_id}/close", response_model=CustomerOut)
def close_customer(customer_id: CustomerId, db: DbSession):
    return svc.close(db, customer_id)


@router.get("/{customer_id}/accounts", response_model=list[AccountOut])
def customer_accounts(customer_id: CustomerId, db: DbSession):
    return account_svc.list_for_customer(db, customer_id)
