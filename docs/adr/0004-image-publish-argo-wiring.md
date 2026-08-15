# Botato image publish and Argo CD Application wiring

Botato runs as two workloads (bot + music node) on **`shardblade-001`**. Build and publish a **linux/arm64** bot image to **`ghcr.io/adryan30/botato`** via **GitHub Actions** (tags: git SHA + release/semver; Argo pins digest or immutable tag, never `latest`). Use the **official Lavalink ≥ 4.2** image for the music node (**youtube-source** via Lavalink config / download-on-start — no custom music-node image, no LavaSrc).

Wire one bjw-s **app-template** Argo CD Application named **`botato`** into namespace **`discord`**, with controllers **`bot`** and **`lavalink`**, Istio injection, and ESO + Vault projecting secrets into **`botato-env`** (Discord token, Lavalink password, optional YouTube OAuth/poToken; no Spotify secrets). This **replaces** the commented-out **`discord-music`** Application (do not revive that name). Infra implementation in `adryan30/infra` happens at build time — this ADR is the architecture contract only. Do **not** bake secrets into images.

**Amended (2026-07-22):** Dropped LavaSrc and Spotify client id/secret from the music-node / secrets contract; see ADR 0002 for the source-policy rationale.

**Amended (2026-08-15):** When **DJ mode** ships, `OPENROUTER_API_KEY` is required in `botato-env` (same Vault/ESO path). `OPENROUTER_DJ_MODEL` is optional and defaults to `nvidia/nemotron-nano-9b-v2:free`. Product-level OpenRouter call caps are out of scope for v1; OpenRouter HTTP 402/429 still apply at runtime. Local `.env` mirrors the same names (see `.env.example`).

## Consequences

Local development does not require Vault/ESO (see the architecture PRD local-dev tiers). Durable Postgres for **AFK marks** is decided in ADR-0006 (Sphere + Drizzle); Redis remains deferred until a feature needs it. OpenRouter credentials for **DJ mode** follow the same local `.env` / cluster `botato-env` split — materialization stays in `adryan30/infra`.
