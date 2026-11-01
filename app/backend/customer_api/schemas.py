import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

CustomerId = Annotated[str, StringConstraints(pattern=r"^\d{9}$")]
AccountNumber = Annotated[str, StringConstraints(pattern=r"^\d{15}$")]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class CustomerCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+$")
    phone: str | None = None


class CustomerUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    kyc_status: Literal["active"] | None = None  # approve KYC


class CustomerOut(ORM):
    customer_id: str
    first_name: str
    last_name: str
    email: str
    phone: str | None
    status: str
    created_at: datetime
    updated_at: datetime


class AccountCreate(BaseModel):
    customer_id: CustomerId
    type: Literal["savings", "current"]


class AccountOut(ORM):
    account_number: str
    customer_id: str
    type: str
    balance: Decimal
    status: str
    created_at: datetime
    updated_at: datetime


class Amount(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=18, decimal_places=2)


class TransferIn(Amount):
    from_account_number: AccountNumber
    to_account_number: AccountNumber


class TransactionOut(ORM):
    id: uuid.UUID
    account_number: str
    counterparty_account_number: str | None
    type: str
    amount: Decimal
    status: str
    created_at: datetime
