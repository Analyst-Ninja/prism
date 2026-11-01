# Local setup

Prereqs: Docker, uv, Python 3.13, pnpm (frontend, later).

```bash
cp config/local.env.example .env
make up-local        # postgres, kafka, debezium, flink, redis
make down
```

Status: compose file is a skeleton. Image versions, Kafka listeners, Flink connector jars and Postgres init SQL are filled in per build step (see [plan.md](plan.md)).

Iceberg warehouse is `./data/warehouse` (gitignored), mounted at `/data/warehouse` in Flink containers.

## Customer API (FastAPI)
```bash
docker compose -f docker/docker-compose.yml up -d postgres
make migrate                              # alembic upgrade head (reads POSTGRES_DSN / .env)
make api                                  # http://127.0.0.1:8000/docs
uv run python utils/seed_demo.py -n 20 --seed 42   # Faker demo data via service layer
make test                                 # pytest; auto-creates + migrates `bank_test` DB, truncates per test
```
Endpoints: `POST /customers`, `PATCH /customers/{customer_id}` (`kyc_status: "active"`), `POST /customers/{customer_id}/close`, `GET /customers/{customer_id}/accounts`, `POST /accounts` (`customer_id`, `type`), `POST /accounts/{account_number}/{freeze|unfreeze|close|deposit|withdraw}`, `POST /transfers` (`from_account_number`, `to_account_number`, `amount`), `GET /accounts/{account_number}/transactions`. `customer_id` = 9 digits, `account_number` = 15 digits (else 422). Rule violations -> 409, unknown ids -> 404.
