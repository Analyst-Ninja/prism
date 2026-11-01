"""Deterministic Faker-built Customer 360 data.

Dev/test stand-in for the Flink job (Redis side) and the Iceberg Silver tables (lakehouse side).
Redis seeder, fake lakehouse and tests all call build_dataset() with the same args, so they agree.
"""

import random
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from faker import Faker

ANCHOR = datetime(2026, 11, 1, tzinfo=UTC)  # fixed "now" so every consumer builds identical data
DORMANT_AFTER = timedelta(days=30)


@dataclass
class Dataset:
    docs: list[dict]  # Customer 360 documents (JSON-serialisable; money as strings)
    transactions: list[dict]  # flat explore rows (all history, not just the last 10)


def _money(value: Decimal) -> str:
    return f"{value:.2f}"


def _iso(ts: datetime) -> str:
    return ts.isoformat()


def build_dataset(n: int = 20, seed: int = 42, now: datetime = ANCHOR) -> Dataset:
    rng = random.Random(seed)
    fake = Faker()
    fake.seed_instance(seed)
    docs: list[dict] = []
    all_txns: list[dict] = []
    account_counter = 0
    lsn = 1_000_000

    for i in range(n):
        customer_id = str(100_000_000 + i)
        created = now - timedelta(days=rng.randint(60, 400), hours=rng.randint(0, 23))
        kyc_pending = rng.random() < 0.1
        profile = {
            "customer_id": customer_id,
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "email": f"{fake.user_name()}{i}@{fake.free_email_domain()}",
            "phone": fake.msisdn(),
            "status": "kyc_pending" if kyc_pending else "active",
            "kyc_status": "pending" if kyc_pending else "approved",
            "created_at": _iso(created),
        }

        accounts: list[dict] = []
        balances: dict[str, Decimal] = {}
        if not kyc_pending:
            for _ in range(rng.randint(1, 3)):
                account_counter += 1
                number = str(100_000_000_000_000 + account_counter)
                balances[number] = Decimal(0)
                accounts.append(
                    {
                        "account_number": number,
                        "type": rng.choice(["savings", "current"]),
                        "status": "frozen" if rng.random() < 0.1 else "active",
                        "balance": Decimal(0),
                        "opened_at": created + timedelta(days=rng.randint(0, 20)),
                    }
                )

        txns: list[dict] = []
        if accounts:
            ts = accounts[0]["opened_at"]
            for acc in accounts:  # opening deposit so balances start positive
                ts += timedelta(hours=rng.randint(1, 48))
                amt = Decimal(rng.randint(200, 3000))
                balances[acc["account_number"]] += amt
                txns.append(_txn(rng, acc["account_number"], None, "deposit", amt, ts))
            for _ in range(rng.randint(3, 12)):
                ts += timedelta(hours=rng.randint(6, 240))
                if ts > now:
                    break
                acc = rng.choice(accounts)["account_number"]
                kind = rng.choice(["deposit", "withdrawal", "transfer"])
                if kind == "transfer" and len(accounts) < 2:
                    kind = "deposit"
                amt = Decimal(rng.randint(5, 800))
                if kind == "deposit":
                    balances[acc] += amt
                    txns.append(_txn(rng, acc, None, "deposit", amt, ts))
                elif balances[acc] >= amt:
                    if kind == "withdrawal":
                        balances[acc] -= amt
                        txns.append(_txn(rng, acc, None, "withdrawal", amt, ts))
                    else:
                        other = rng.choice([a["account_number"] for a in accounts if a["account_number"] != acc])
                        balances[acc] -= amt
                        balances[other] += amt
                        txns.append(_txn(rng, acc, other, "transfer", amt, ts))

        for acc in accounts:
            acc["balance"] = balances[acc["account_number"]]
        own = {a["account_number"] for a in accounts}
        type_by_acc = {a["account_number"]: a["type"] for a in accounts}

        def total(kind: str, _txns: list[dict] = txns) -> Decimal:
            return sum((Decimal(t["amount"]) for t in _txns if t["type"] == kind), Decimal(0))

        transfers_in = sum(
            (Decimal(t["amount"]) for t in txns if t["type"] == "transfer" and t["counterparty_account_number"] in own),
            Decimal(0),
        )
        last_txn_at = max((datetime.fromisoformat(t["created_at"]) for t in txns), default=None)
        lsn += len(txns) + 1
        recent = sorted(txns, key=lambda t: t["created_at"], reverse=True)[:10]
        docs.append(
            {
                "profile": profile,
                "accounts": [
                    {**a, "balance": _money(a["balance"]), "opened_at": _iso(a["opened_at"])} for a in accounts
                ],
                "totals": {
                    "total_balance": _money(sum(balances.values(), Decimal(0))),
                    "account_count": len(accounts),
                    "active_count": sum(a["status"] == "active" for a in accounts),
                    "frozen_count": sum(a["status"] == "frozen" for a in accounts),
                    "closed_count": 0,
                },
                "activity": {
                    "txn_count": len(txns),
                    "last_txn_at": _iso(last_txn_at) if last_txn_at else None,
                    "total_deposits": _money(total("deposit")),
                    "total_withdrawals": _money(total("withdrawal")),
                    "total_transfers_out": _money(total("transfer")),
                    "total_transfers_in": _money(transfers_in),
                },
                "recent_transactions": recent,
                "flags": {
                    "kyc_pending": kyc_pending,
                    "has_frozen_account": any(a["status"] == "frozen" for a in accounts),
                    "has_no_accounts": not accounts,
                    "dormant": last_txn_at is None or now - last_txn_at > DORMANT_AFTER,
                },
                "meta": {
                    "last_updated_at": _iso(last_txn_at or created),
                    "source_lsn": lsn,
                    "version": len(txns) + len(accounts) + 1,
                },
            }
        )
        for t in txns:
            all_txns.append({**t, "customer_id": customer_id, "account_type": type_by_acc[t["account_number"]]})

    return Dataset(docs=docs, transactions=all_txns)


def _txn(rng: random.Random, account: str, counterparty: str | None, kind: str, amount: Decimal, ts: datetime) -> dict:
    return {
        "id": str(uuid.UUID(int=rng.getrandbits(128), version=4)),
        "account_number": account,
        "counterparty_account_number": counterparty,
        "type": kind,
        "amount": _money(amount),
        "status": "completed",
        "created_at": _iso(ts),
    }
