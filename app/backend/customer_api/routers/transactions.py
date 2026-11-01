from fastapi import APIRouter, status

from customer_api.db import DbSession
from customer_api.schemas import AccountNumber, Amount, TransactionOut, TransferIn
from customer_api.services import transactions as svc

router = APIRouter(tags=["transactions"])


@router.post("/accounts/{account_number}/deposit", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def deposit(account_number: AccountNumber, data: Amount, db: DbSession):
    return svc.deposit(db, account_number, data.amount)


@router.post("/accounts/{account_number}/withdraw", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def withdraw(account_number: AccountNumber, data: Amount, db: DbSession):
    return svc.withdraw(db, account_number, data.amount)


@router.post("/transfers", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def transfer(data: TransferIn, db: DbSession):
    return svc.transfer(db, data.from_account_number, data.to_account_number, data.amount)
