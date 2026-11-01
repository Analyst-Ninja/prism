from decimal import Decimal

from faker import Faker

fake = Faker()
Faker.seed(1234)  # reproducible failures


def customer_payload(**overrides) -> dict:
    payload = {
        "first_name": fake.first_name(),
        "last_name": fake.last_name(),
        "email": fake.unique.email(),
        "phone": fake.msisdn(),
    }
    return payload | overrides


def amount(low: int = 10, high: int = 1000) -> str:
    return str(Decimal(fake.random_int(low * 100, high * 100)) / 100)
