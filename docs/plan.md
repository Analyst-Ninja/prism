# Prism360 plan

## Context
Customer app -> Postgres -> Debezium -> Kafka -> Flink -> Iceberg (Bronze/Silver) + Redis (live 360) -> admin app (360 from Redis, explore from Iceberg, fallback + rebuild). Full scope in [approach.html](approach.html).

Constraints: target is AWS with S3 (no MinIO). Build local-first, deploy to AWS later. One config switch selects local vs AWS.

## Decisions
- Iceberg warehouse URI + catalog come from env. Local: filesystem + SQL (sqlite) catalog. AWS: `s3://` + Glue. Single switch: `src/prism/config.py`. See [ADR 0001](decisions/0001-s3-not-minio.md).
- Separate customer and admin APIs so admin never reads Postgres. See [ADR 0002](decisions/0002-separate-admin-api.md).
- Frontend: Next.js (App Router, TS) + shadcn/ui + Tailwind, pnpm workspace (`customer`, `admin`, `shared`). Backend: FastAPI. Pipeline: PyFlink.
- `infra/terraform` is a stub until the AWS phase.
- Pinot alternative from the approach doc is out of scope.

## Build order (status)
- [x] 0. Repo scaffold + docs
- [x] 1. Postgres + tables (customers, accounts, transactions) - Alembic `0001_init`
- [x] 2a. Customer API (FastAPI) done, Faker-tested
- [ ] 2b. Customer UI (Next.js)
- [ ] 3. Debezium + Kafka, verify event per topic, ordered by key
- [ ] 4. Flink + Iceberg: Bronze then Silver
- [ ] 5. Flink + Redis: 360 state + idempotent sink
- [ ] 6. Admin app: 360 (Redis), Explore (Iceberg), fallback, rebuild script
- [ ] 7. End-to-end test incl. Redis stop / fallback / rebuild
- [ ] 8. AWS deploy (terraform: S3, RDS, MSK, Managed Flink, ElastiCache, ECS, IAM, Glue)

## Out of scope (for now)
Load testing, production monitoring, RBAC, PII masking, Sentinel/Cluster, full dbt Gold.
