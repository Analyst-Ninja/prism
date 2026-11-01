import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from customer_api.db import Base

# Bank-style IDs come from Postgres sequences (customer_id_seq, account_number_seq),
# created in the Alembic migration and applied via server_default.


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Customer(TimestampMixin, Base):
    __tablename__ = "customers"
    __table_args__ = (
        CheckConstraint("status IN ('kyc_pending','active','closed')", name="ck_customer_status"),
        CheckConstraint("customer_id ~ '^[0-9]{9}$'", name="ck_customer_id_format"),
    )

    customer_id: Mapped[str] = mapped_column(
        String(9), primary_key=True, server_default=text("nextval('customer_id_seq')::text")
    )
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    phone: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default="kyc_pending")


class Account(TimestampMixin, Base):
    __tablename__ = "accounts"
    __table_args__ = (
        CheckConstraint("status IN ('active','frozen','closed')", name="ck_account_status"),
        CheckConstraint("type IN ('savings','current')", name="ck_account_type"),
        CheckConstraint("balance >= 0", name="ck_account_balance_nonneg"),
        CheckConstraint("account_number ~ '^[0-9]{15}$'", name="ck_account_number_format"),
    )

    account_number: Mapped[str] = mapped_column(
        String(15), primary_key=True, server_default=text("nextval('account_number_seq')::text")
    )
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.customer_id"), index=True)
    type: Mapped[str] = mapped_column(String(20))
    balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal(0))
    status: Mapped[str] = mapped_column(String(20), default="active")


class Transaction(TimestampMixin, Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("type IN ('deposit','withdrawal','transfer')", name="ck_txn_type"),
        CheckConstraint("status IN ('completed','failed','reversed')", name="ck_txn_status"),
        CheckConstraint("amount > 0", name="ck_txn_amount_pos"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_number: Mapped[str] = mapped_column(ForeignKey("accounts.account_number"), index=True)
    counterparty_account_number: Mapped[str | None] = mapped_column(ForeignKey("accounts.account_number"))
    type: Mapped[str] = mapped_column(String(20))
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    status: Mapped[str] = mapped_column(String(20), default="completed")
