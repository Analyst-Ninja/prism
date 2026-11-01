# Architecture

```
Customer UI -> Postgres -> Debezium -> Kafka -> Flink -> Iceberg Silver (history, durable truth)
                                                    \-> Redis (live 360 by customer_id)
Admin UI: 360 <- Redis (fallback: Iceberg) ; Explore <- Iceberg
```

## Rules
1. Customer app writes Postgres only.
2. Admin 360 reads Redis only, never Postgres. Otherwise CDC proves nothing.
3. Nothing but Flink writes Redis.

## Order of truth
Postgres > Iceberg Silver > Redis (fast copy).

## Pipeline
- Debezium: log-based CDC, one Kafka topic per table, keyed by primary key.
- Flink: dedupe, order by log position, upsert/delete (no plain inserts). Bronze = raw events, Silver = typed current state.
- 360 build: keyed state per `customer_id` (profile, accounts map, totals). Transaction events carry only `account_id`, so look up account -> customer from state first. Emit full 360 JSON, idempotent Redis `SET` with log position so stale events cannot overwrite newer.

## Redis failure
- Prevent: AOF + volume (`docker/redis/redis.conf`).
- During: customer app and Flink->Iceberg unaffected; admin falls back to Iceberg with a "live view unavailable" banner.
- After: restart from disk, or `utils/rebuild_redis.py` from Silver, or replay Kafka, or lazy per-customer rebuild.
- Verify: `utils/verify_rebuild.py` (key count vs customers, balance spot-checks, log position per key).

## Storage backends
`STORAGE_BACKEND=local` -> filesystem warehouse + sqlite catalog. `s3` -> S3 warehouse + Glue. See `src/prism/config.py`.
