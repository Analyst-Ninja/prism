# Local setup

Prereqs: Docker, uv, Python 3.13, pnpm (frontend, later).

```bash
cp config/local.env.example .env
make up-local        # postgres, kafka, debezium, flink, redis
make down
```

Status: compose file is a skeleton. Image versions, Kafka listeners, Flink connector jars and Postgres init SQL are filled in per build step (see [plan.md](plan.md)).

Iceberg warehouse is `./data/warehouse` (gitignored), mounted at `/data/warehouse` in Flink containers.
