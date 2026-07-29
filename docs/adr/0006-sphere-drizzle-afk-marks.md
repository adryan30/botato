# Sphere and Drizzle for AFK marks

Botato needs durable **AFK marks** (prefix + pre-mark nickname) that survive process restarts. In-memory state is too weak for that; introducing a second datastore would fragment ops. We persist AFK marks in **Sphere** (the shared CloudNativePG Postgres on Shardblade) and access them with **Drizzle ORM**. Local development uses Compose Postgres with the same role/database name (`botato` / `botato`) via `DATABASE_URL`; production consumes Sphere credentials projected into `botato-env`. Infra (role, Database CR, password material, ESO wiring) lands in `adryan30/infra` — this ADR is the architecture contract.

## Considered Options

- **In-memory map** — simplest, but marks vanish on pod restart
- **SQLite file** — durable locally, awkward on Kubernetes (PVC + single-replica assumptions)
- **Sphere + Drizzle** — matches existing cluster storage; Drizzle stays lightweight TypeScript without Prisma’s codegen weight

## Consequences

ADR-0004’s “Postgres deferred until a feature needs durable state” is superseded for this path: AFK is that feature. Botato now requires `DATABASE_URL` to boot.
