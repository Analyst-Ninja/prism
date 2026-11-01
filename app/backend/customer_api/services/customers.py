
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from customer_api.errors import DomainError, NotFound
from customer_api.models import Account, Customer
from customer_api.schemas import CustomerCreate, CustomerUpdate


def get_customer(db: Session, customer_id: str) -> Customer:
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise NotFound(f"customer {customer_id} not found")
    return customer


def register(db: Session, data: CustomerCreate) -> Customer:
    customer = Customer(**data.model_dump())
    db.add(customer)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise DomainError("email already registered") from exc
    return customer


def update(db: Session, customer_id: str, data: CustomerUpdate) -> Customer:
    customer = get_customer(db, customer_id)
    if customer.status == "closed":
        raise DomainError("customer is closed")
    fields = data.model_dump(exclude_unset=True)
    if fields.pop("kyc_status", None) == "active":
        customer.status = "active"
    for key, value in fields.items():
        setattr(customer, key, value)
    db.flush()
    return customer


def close(db: Session, customer_id: str) -> Customer:
    customer = get_customer(db, customer_id)
    open_accounts = db.scalar(
        select(Account.account_number)
        .where(Account.customer_id == customer_id, Account.status != "closed")
        .limit(1)
    )
    if open_accounts is not None:
        raise DomainError("customer still has open accounts")
    customer.status = "closed"
    db.flush()
    return customer
