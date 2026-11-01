# Prism360

See `docs/README.md`. Scope source: `docs/approach.html`.

## Rules
- Docs are living. Any structural, config, or pipeline change must update the matching file in `docs/` in the same change.
- Tick the build-order checklist in `docs/plan.md` when a step finishes.
- New architectural decision -> add an ADR in `docs/decisions/` (next number).
- Customer app writes Postgres only. Admin never reads Postgres. Only Flink writes Redis.
- Storage/catalog access goes through `src/prism/config.py`; never hardcode local paths or `s3://` URIs.
- Stack: Next.js + shadcn/ui + Tailwind (frontend), FastAPI (backend), PyFlink (pipeline), uv for Python.
