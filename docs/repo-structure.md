# Repo structure

```
prism/
├── app/
│   ├── frontend/            pnpm workspace, Next.js + shadcn/ui + Tailwind
│   │   ├── customer/        customer UI
│   │   ├── admin/           360 page (Redis) + Explore page (Iceberg)
│   │   └── shared/          api client, ui components, types
│   └── backend/             FastAPI
│       ├── customer_api/    writes Postgres only; owns db.py, models, services, routers
│       │                    (db lives here, not in common/, to keep ADR 0002 boundary)
│       ├── admin_api/       reads Redis + Iceberg, never Postgres
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
├── utils/                   seed_demo (Faker, via service layer), rebuild_redis, verify_rebuild, scripts/
├── tests/                   unit, integration, e2e
├── docs/                    this folder
├── CLAUDE.md                doc-maintenance rule
├── Makefile  pyproject.toml  README.md
```

Local data lands in `data/` (gitignored), including the Iceberg warehouse.

