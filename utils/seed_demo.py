"""Seed demo data through the service layer (business rules run, like real clicks).

Usage: uv run python utils/seed_demo.py -n 20 [--seed 42]
"""

import argparse
import random
import sys
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app" / "backend"))

from faker import Faker

from customer_api.db import SessionLocal
from customer_api.errors import DomainError
from customer_api.schemas import AccountCreate, CustomerCreate, CustomerUpdate
from customer_api.services import accounts, customers, transactions


def seed(n: int, seed_value: int | None) -> None:
    fake = Faker()
    rng = random.Random(seed_value)
    if seed_value is not None:
        Faker.seed(seed_value)
    account_numbers = []
    with SessionLocal() as db:
        for _ in range(n):
            c = customers.register(
                db,
                CustomerCreate(
                    first_name=fake.first_name(), last_name=fake.last_name(),
                    email=fake.unique.email(), phone=fake.msisdn(),
                ),
            )
            customers.update(db, c.customer_id, CustomerUpdate(kyc_status="active"))
            for _ in range(rng.randint(1, 2)):
                acc = accounts.open_account(db, AccountCreate(customer_id=c.customer_id, type=rng.choice(["savings", "current"])))
                transactions.deposit(db, acc.account_number, Decimal(rng.randint(100, 5000)))
                account_numbers.append(acc.account_number)
        for _ in range(n * 2):  # random transfers/withdrawals; rule violations are just skipped
            a, b = rng.sample(account_numbers, 2) if len(account_numbers) > 1 else (account_numbers[0], account_numbers[0])
            amt = Decimal(rng.randint(1, 500))
            try:
                if rng.random() < 0.7:
                    transactions.transfer(db, a, b, amt)
                else:
                    transactions.withdraw(db, a, amt)
            except DomainError:
                pass
        db.commit()
    print(f"seeded {n} customers, {len(account_numbers)} accounts")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("-n", type=int, default=20)
    p.add_argument("--seed", type=int, default=None)
    args = p.parse_args()
    seed(args.n, args.seed)
