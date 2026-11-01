from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from customer_api.errors import DomainError
from customer_api.models import Account, Transaction
from customer_api.services.accounts import get_account


def _require_active(account: Account) -> None:
    if account.status != "active":
        raise DomainError(f"account is {account.status}; transactions not allowed")


def deposit(db: Session, account_number: str, amount: Decimal) -> Transaction:
    account = get_account(db, account_number, lock=True)
    _require_active(account)
    account.balance += amount
    txn = Transaction(account_number=account.account_number, type="deposit", amount=amount)
    db.add(txn)
    db.flush()
    return txn


def withdraw(db: Session, account_number: str, amount: Decimal) -> Transaction:
    account = get_account(db, account_number, lock=True)
    _require_active(account)
    if amount > account.balance:
        raise DomainError("insufficient funds")
    account.balance -= amount
    txn = Transaction(account_number=account.account_number, type="withdrawal", amount=amount)
    db.add(txn)
    db.flush()
    return txn


def transfer(db: Session, from_number: str, to_number: str, amount: Decimal) -> Transaction:
    if from_number == to_number:
        raise DomainError("cannot transfer to the same account")
    # Lock in id order so concurrent opposite transfers cannot deadlock.
    for account_number in sorted((from_number, to_number)):
        get_account(db, account_number, lock=True)
    source = get_account(db, from_number)
    target = get_account(db, to_number)
    _require_active(source)
    _require_active(target)
    if amount > source.balance:
        raise DomainError("insufficient funds")
    source.balance -= amount
    target.balance += amount
    txn = Transaction(account_number=source.account_number, counterparty_account_number=target.account_number, type="transfer", amount=amount)
    db.add(txn)
    db.flush()
    return txn


def list_for_account(db: Session, account_number: str) -> list[Transaction]:
    get_account(db, account_number)
    stmt = (
        select(Transaction)
        .where((Transaction.account_number == account_number) | (Transaction.counterparty_account_number == account_number))
        .order_by(Transaction.created_at.desc())
    )
    return list(db.scalars(stmt))
