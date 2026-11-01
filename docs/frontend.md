# Frontend

Two Next.js apps (App Router, TS) in a pnpm workspace under `app/frontend/`, sharing `@prism/ui`.

## Packages
- `shared` (`@prism/ui`): shadcn components (`src/ui`), primitives (`src/components`: PrismMark, StatusBadge, Money, CopyId, CountUp, Flash, states, Providers), `lib/` (format, api-client, types, gsap helpers), `theme.css` (tokens). Apps import `@prism/ui/ui/button`, `@prism/ui/components/money`, `@prism/ui/lib/format`. Files inside `shared` use **relative imports** (not `@/`) because each app has its own `@/` alias.
- `customer` (:3000): `/` sign in or register, `/dashboard`, `/accounts/[accountNumber]`, `/profile`.
- `admin` (:3001): `/customers` search (also Cmd+K), `/customers/[customerId]` 360, `/explore`, `/ops`.

## Design
Blue and white. Tokens in `shared/src/theme.css`: Paper `#fff`, Mist `#f3f6fc` (background), Line `#dce4f2`, Ink `#0a1f44` (text, sidebar), Slate `#5b6b8c`, Cobalt `#1d4ed8` (primary), Azure `#3b82f6`, Sky `#dbe8ff`. Amber/red/green only mark status (StatusBadge, alerts). Type: Sora (headings, big numbers), IBM Plex Sans (UI), IBM Plex Mono (IDs only). Money and IDs use `tabular-nums` (`.tnum`). Sentence case, no all-caps labels. One radius family, borders over shadows.

## Motion (GSAP) - kept deliberately small
1. Customer sign-in: facet shapes slide in once per session (`FacetField`).
2. `CountUp` on balances; re-animates from the old value when it changes.
3. Admin 360 live sync: `/freshness` is polled every 3s; a new `source_lsn` reloads the document and `Flash` highlights values that changed.
All GSAP respects `prefers-reduced-motion`. Everything else is shadcn/Radix state transitions.

## Conventions
- Data: TanStack Query. Writes go through `useApiMutation`, which invalidates customer, accounts and transactions queries.
- Forms: react-hook-form + zod; server errors (409) are shown verbatim in an inline alert.
- Every list has loading, empty and error states with a next step.
- Adding shadcn components: run the CLI in `shared`, then rewrite its `@/` imports to relative paths and fix any `from "cn"` import to `../lib/utils`.
- Keep one `recharts` version across packages (3.8.0) or chart context breaks silently.
- TypeScript is pinned to 6 because typescript-eslint does not support 7 yet.
