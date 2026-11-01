# 0003 - Numeric-string business IDs, UUID transactions, Alembic

Status: accepted (amended: customer/account IDs changed from UUID)

Decision:
- `customers.customer_id`: 9-digit numeric string (`customer_id_seq`, starts 100000000).
- `accounts.account_number`: 15-digit numeric string (`account_number_seq`, starts 100000000000000).
- `transactions.id`: UUID (internal, never typed by users). `transactions.account_number` and `counterparty_account_number` reference accounts.
- IDs come from Postgres sequences via `server_default`; CHECK constraints enforce the digit format; the API validates the same pattern (422 on malformed IDs).
- Money NUMERIC(18,2), timestamptz created/updated, string statuses with CHECK. Schema changes only via Alembic (sequences created in the migration by hand; autogenerate does not emit them).
- No hard deletes: "close" sets status.

Why: bank-style identifiers are readable and match what users and ops expect; sequences are collision-free and concurrency-safe; equal-length strings sort correctly, which keeps the transfer lock ordering valid. Strings are fine as Kafka keys and as the Redis key `customer:{customer_id}`.

Consequence: sequential IDs are guessable (acceptable for the demo; add auth/ownership checks before any real use). Sequence gaps can occur after rolled-back inserts. Customer IDs cap at 999999999.
