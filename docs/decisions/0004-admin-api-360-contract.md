# 0004 - Admin API: 360 document contract, masking, lakehouse interface

Status: accepted

Decisions:
- The Redis 360 document shape (see architecture.md) is the contract between Flink and admin. Redis stores raw email/phone; the admin API masks them on output, so Redis stays rebuildable from Silver and masking rules can change without a rebuild.
- Admin reads the lakehouse through a `LakehouseReader` Protocol. `LAKEHOUSE_BACKEND=fake` serves a Faker-built in-memory dataset until Iceberg Silver exists (plan step 4); the PyIceberg reader then drops in with no route changes.
- `admin_api` has its own `settings.py` and imports nothing from `customer_api`, SQLAlchemy, psycopg or `common.settings` (which holds the Postgres DSN). `tests/admin/test_boundary.py` enforces it (ADR 0002).
- No write or rebuild endpoint in admin: only the pipeline (and the rebuild script) writes Redis. `utils/seed_redis_360.py` is a dev-only stand-in for Flink.
- Redis outage: 360 routes fall back to the lakehouse (`source`, `degraded`, `notice` in the response) instead of failing.

Consequence: the fake lakehouse and sample generator must be kept in step with the real Silver schema when it lands.
