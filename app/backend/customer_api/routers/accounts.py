from fastapi import APIRouter, status

from customer_api.db import DbSession
from customer_api.schemas import (
    AccountCreate,
    AccountNumber,
    AccountOut,
    TransactionOut,
)
from customer_api.services import accounts as svc
from customer_api.services import transactions as txn_svc

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.post("", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def open_account(data: AccountCreate, db: DbSession):
    return svc.open_account(db, data)


@router.get("/{account_number}", response_model=AccountOut)
def get_account(account_number: AccountNumber, db: DbSession):
    return svc.get_account(db, account_number)


@router.post("/{account_number}/freeze", response_model=AccountOut)
def freeze(account_number: AccountNumber, db: DbSession):
    return svc.freeze(db, account_number)


@router.post("/{account_number}/unfreeze", response_model=AccountOut)
def unfreeze(account_number: AccountNumber, db: DbSession):
    return svc.unfreeze(db, account_number)


@router.post("/{account_number}/close", response_model=AccountOut)
def close(account_number: AccountNumber, db: DbSession):
    return svc.close(db, account_number)


@router.get("/{account_number}/transactions", response_model=list[TransactionOut])
def account_transactions(account_number: AccountNumber, db: DbSession):
    return txn_svc.list_for_account(db, account_number)
