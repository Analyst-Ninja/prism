from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from customer_api.errors import DomainError, NotFound
from customer_api.models import Account
from customer_api.schemas import AccountCreate
from customer_api.services.customers import get_customer


def get_account(db: Session, account_number: str, *, lock: bool = False) -> Account:
    stmt = select(Account).where(Account.account_number == account_number)
    if lock:
        stmt = stmt.with_for_update()
    account = db.scalar(stmt)
    if account is None:
        raise NotFound(f"account {account_number} not found")
    return account


def open_account(db: Session, data: AccountCreate) -> Account:
    customer = get_customer(db, data.customer_id)
    if customer.status != "active":
        raise DomainError("customer must be active (KYC approved) to open an account")
    account = Account(customer_id=customer.customer_id, type=data.type)
    db.add(account)
    db.flush()
    return account


def list_for_customer(db: Session, customer_id: str) -> list[Account]:
    get_customer(db, customer_id)
    return list(db.scalars(select(Account).where(Account.customer_id == customer_id).order_by(Account.created_at)))


def freeze(db: Session, account_number: str) -> Account:
    account = get_account(db, account_number, lock=True)
    if account.status != "active":
        raise DomainError(f"cannot freeze a {account.status} account")
    account.status = "frozen"
    db.flush()
    return account


def unfreeze(db: Session, account_number: str) -> Account:
    account = get_account(db, account_number, lock=True)
    if account.status != "frozen":
        raise DomainError("account is not frozen")
    account.status = "active"
    db.flush()
    return account


def close(db: Session, account_number: str) -> Account:
    account = get_account(db, account_number, lock=True)
    if account.status == "closed":
        raise DomainError("account already closed")
    if account.balance != Decimal(0):
        raise DomainError("cannot close an account with money in it")
    account.status = "closed"
    db.flush()
    return account
