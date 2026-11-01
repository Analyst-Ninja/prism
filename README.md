# prism
Real-time Customer 360 built on CDC: every bank change streams from Postgres through Kafka and Flink into Iceberg, served live from Redis.

```
Customer UI -> Postgres -> Debezium -> Kafka -> Flink -> Iceberg (history) + Redis (live 360) -> Admin UI
```

- Local first (`make up-local`), AWS (S3, RDS, MSK, ElastiCache) later via `STORAGE_BACKEND` switch.
- Layout: [docs/repo-structure.md](docs/repo-structure.md). Plan and status: [docs/plan.md](docs/plan.md). All docs: [docs/README.md](docs/README.md).
