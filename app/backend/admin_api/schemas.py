from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, StringConstraints

CustomerId = Annotated[str, StringConstraints(pattern=r"^\d{9}$")]


class Profile(BaseModel):
    customer_id: str
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    status: str
    kyc_status: str
    created_at: datetime


class AccountView(BaseModel):
    account_number: str
    type: str
    status: str
    balance: Decimal
    opened_at: datetime


class Totals(BaseModel):
    total_balance: Decimal
    account_count: int
    active_count: int
    frozen_count: int
    closed_count: int


class Activity(BaseModel):
    txn_count: int
    last_txn_at: datetime | None
    total_deposits: Decimal
    total_withdrawals: Decimal
    total_transfers_out: Decimal
    total_transfers_in: Decimal


class TxnView(BaseModel):
    id: str
    account_number: str
    counterparty_account_number: str | None
    type: str
    amount: Decimal
    status: str
    created_at: datetime


class Flags(BaseModel):
    kyc_pending: bool
    has_frozen_account: bool
    has_no_accounts: bool
    dormant: bool


class Meta(BaseModel):
    last_updated_at: datetime
    source_lsn: int
    version: int


class Customer360(BaseModel):
    profile: Profile
    accounts: list[AccountView]
    totals: Totals
    activity: Activity
    recent_transactions: list[TxnView]
    flags: Flags
    meta: Meta


class Served(BaseModel):
    """Where the data came from. degraded=True means Redis was unavailable."""

    source: Literal["redis", "iceberg"]
    degraded: bool = False
    notice: str | None = None


class Customer360Response(Customer360, Served):
    pass


class AccountsResponse(Served):
    customer_id: str
    accounts: list[AccountView]
    totals: Totals


class TransactionsResponse(Served):
    customer_id: str
    transactions: list[TxnView]


class Freshness(Served):
    customer_id: str
    last_updated_at: datetime
    source_lsn: int
    lag_seconds: float


class CustomerSummary(BaseModel):
    customer_id: str
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    status: str


class ExploreTxn(BaseModel):
    id: str
    customer_id: str
    account_number: str
    account_type: str
    counterparty_account_number: str | None
    type: str
    amount: Decimal
    status: str
    created_at: datetime


class SummaryRow(BaseModel):
    group: str
    count: int
    total_amount: Decimal
    avg_amount: Decimal


class OpsStatus(BaseModel):
    redis_up: bool
    redis_customer_keys: int | None
    lakehouse_customers: int
    in_sync: bool


class Consistency(BaseModel):
    customer_id: str
    redis_total_balance: Decimal
    lakehouse_total_balance: Decimal
    match: bool
