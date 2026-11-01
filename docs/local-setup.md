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

## Admin API (FastAPI) - port 8001
Needs Redis only (never Postgres). Until the Flink job exists, a dev seeder stands in for it:
```bash
docker compose -f docker/docker-compose.yml up -d redis
make seed-redis        # writes 20 Faker customer-360 docs to Redis (FAKE_CUSTOMERS / FAKE_SEED env to change)
make admin-api         # http://127.0.0.1:8001/docs
```
Explore/search read the fake in-memory lakehouse (`LAKEHOUSE_BACKEND=fake`) built from the same Faker data, so Redis and "Iceberg" agree. Customer ids in the seed: `100000000`..`100000019`.

Endpoints: `GET /customers/{customer_id}/360|accounts|transactions|freshness`, `GET /customers/search?email=|last_name=|q=`, `GET /explore/transactions`, `GET /explore/summary?group_by=account_type|txn_type|month|status` (filters: `date_from date_to account_type txn_type status`), `GET /ops/status`, `GET /ops/consistency/{customer_id}`, `GET /health`.
Email/phone are masked in every response. Stop Redis and the 360 routes keep working from the lakehouse with `source: "iceberg"`, `degraded: true`.
Tests: `make test` (admin tests use Redis db 15 and skip if Redis is down; customer tests need Postgres).

## Frontend (Next.js) - ports 3000 / 3001
Prereqs: Node 22+, pnpm. Four processes in separate terminals (Postgres and Redis up, `make migrate`, `make seed-redis` done):
```bash
make api            # customer API  :8000
make admin-api      # admin API     :8001
make web-install    # once
make web-customer   # customer UI   http://localhost:3000
make web-admin      # admin UI      http://localhost:3001
```
Checks: `cd app/frontend && pnpm typecheck && pnpm lint && pnpm build`.
Customer sign-in is demo-only (customer ID kept in localStorage). Admin shows seeded demo customers (`100000000`..`100000019`) until the CDC pipeline exists; customers registered in the customer app do not appear there yet.
Try live sync: open an admin 360 page, edit that customer's JSON in Redis (bump `meta.source_lsn` and a balance); the page updates within ~3s.
