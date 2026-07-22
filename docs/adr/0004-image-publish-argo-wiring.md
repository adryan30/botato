# Botato image publish and Argo CD Application wiring

Botato runs as two workloads (bot + music node) on **`shardblade-001`**. Build and publish a **linux/arm64** bot image to **`ghcr.io/adryan30/botato`** via **GitHub Actions** (tags: git SHA + release/semver; Argo pins digest or immutable tag, never `latest`). Use the **official Lavalink ≥ 4.2** image for the music node (**youtube-source** via Lavalink config / download-on-start — no custom music-node image, no LavaSrc).

Wire one bjw-s **app-template** Argo CD Application named **`botato`** into namespace **`discord`**, with controllers **`bot`** and **`lavalink`**, Istio injection, and ESO + Vault for Discord token, Lavalink password, and optional YouTube OAuth/poToken (no Spotify secrets). This **replaces** the commented-out **`discord-music`** Application (do not revive that name). Infra implementation in `adryan30/infra` happens at build time — this ADR is the architecture contract only.

**Amended (2026-07-22):** Dropped LavaSrc and Spotify client id/secret from the music-node / secrets contract; see ADR 0002 for the source-policy rationale.

## Consequences

Redis/Postgres stay deferred until a feature needs durable state. Local development does not require Vault/ESO (see the architecture PRD local-dev tiers).
