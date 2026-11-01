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

## Customer 360 document (Redis `customer:{customer_id}`, JSON)
Contract between the Flink job (writer) and the admin API (reader). Money as strings, timestamps ISO-8601 UTC.
```
profile {customer_id, first_name, last_name, email, phone, status, kyc_status, created_at}   # raw; admin masks email/phone on output
accounts [{account_number, type, status, balance, opened_at}]
totals {total_balance, account_count, active_count, frozen_count, closed_count}
activity {txn_count, last_txn_at, total_deposits, total_withdrawals, total_transfers_out, total_transfers_in}
recent_transactions [last 10, newest first]
flags {kyc_pending, has_frozen_account, has_no_accounts, dormant}      # dormant = no txn in 30 days
meta {last_updated_at, source_lsn, version}                             # source_lsn guards against stale overwrites
```
Reference generator: `app/backend/admin_api/stores/sample_data.py`.

## Admin API read paths
- 360 routes: Redis; if Redis errors -> lakehouse snapshot, response flagged `source: "iceberg"`, `degraded: true`; unknown customer -> 404; both down -> 503.
- Search (email/name) and Explore: lakehouse only (Redis has no secondary index).
- `/ops/*`: read-only checks (Redis key count vs lakehouse customer count; per-customer balance spot-check). No write/rebuild endpoint: rebuild is `utils/rebuild_redis.py`.
