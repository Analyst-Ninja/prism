# 0002 - Separate customer and admin APIs

Status: accepted

Decision: `customer_api` and `admin_api` are separate FastAPI services. Admin has no Postgres credentials.

Why: the demo proof is that admin 360 comes from CDC -> Redis. A service boundary enforces it; convention would not.
