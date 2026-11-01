# 0005 - Two Next.js apps with a shared UI package

Status: accepted

Decisions:
- `customer` and `admin` are separate Next.js apps (own ports, bundles and API URLs) sharing `@prism/ui` through a pnpm workspace. This mirrors ADR 0002: the admin bundle never calls the customer API.
- Client-side data fetching (TanStack Query) against the FastAPI services; no Next.js API routes or server actions. CORS origins are configured on the APIs (`CORS_ORIGINS`).
- Customer "sign-in" is demo-only: a customer ID in localStorage, no password or token. Replace before any real use.
- Admin live updates use polling of `/freshness` (3s) rather than websockets, to stay simple until the pipeline exists.
- Currency is formatted as INR (`en-IN`) in `shared/src/lib/format.ts`; the API itself has no currency field.

Consequence: customers registered in the customer app are not visible in admin until Flink writes their 360 documents.
