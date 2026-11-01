# Repo structure

```
prism/
├── app/
│   ├── frontend/            pnpm workspace, Next.js + shadcn/ui + Tailwind v4 + GSAP
│   │   ├── customer/        customer UI (:3000)
│   │   ├── admin/           Customer 360, Explore, Ops (:3001)
│   │   └── shared/          @prism/ui: shadcn components, theme tokens, api client, types
│   └── backend/             FastAPI
│       ├── customer_api/    writes Postgres only; owns db.py, models, services, routers
│       │                    (db lives here, not in common/, to keep ADR 0002 boundary)
│       ├── admin_api/       reads Redis + Iceberg, never Postgres (own settings.py, no DB code)
│       │   ├── routers/ services/ schemas.py masking.py deps.py
│       │   └── stores/      redis_store, lakehouse (Protocol), fake_lakehouse, sample_data (Faker 360 builder)
│       └── common/          settings only (no DB code)
├── docker/                  LOCAL runtime (compose + per-service config)
├── infra/terraform/         AWS runtime (stub)
├── config/                  local.env.example, aws.env.example
├── src/prism/               python package
│   ├── config.py            local-vs-S3 switch
│   ├── pipeline/            bronze, silver, customer360 (Flink jobs)
│   ├── serving/             redis_store, iceberg_reader
│   └── models/              table/event schemas
├── alembic/ alembic.ini     migrations (schema source of truth)
├── utils/                   seed_demo (Faker, via service layer), seed_redis_360 (DEV stand-in for Flink), rebuild_redis, verify_rebuild, scripts/
├── tests/                   integration (customer API + Postgres), admin (admin API + Redis db 15), unit, e2e
├── docs/                    this folder
├── CLAUDE.md                doc-maintenance rule
├── Makefile  pyproject.toml  README.md
```

Local data lands in `data/` (gitignored), including the Iceberg warehouse.

