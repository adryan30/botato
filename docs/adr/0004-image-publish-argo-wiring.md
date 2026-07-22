# Botato image publish and Argo CD Application wiring

Botato runs as two workloads (bot + music node) on **`shardblade-001`**. Build and publish a **linux/arm64** bot image to **`ghcr.io/adryan30/botato`** via **GitHub Actions** (tags: git SHA + release/semver; Argo pins digest or immutable tag, never `latest`). Use the **official Lavalink ≥ 4.2** image for the music node (youtube-source + LavaSrc via Lavalink config / download-on-start — no custom music-node image).

Wire one bjw-s **app-template** Argo CD Application named **`botato`** into namespace **`discord`**, with controllers **`bot`** and **`lavalink`**, Istio injection, and ESO + Vault for Discord token, Lavalink password, Spotify client id/secret, and optional YouTube OAuth/poToken. This **replaces** the commented-out **`discord-music`** Application (do not revive that name). Infra implementation in `adryan30/infra` happens at build time — this ADR is the architecture contract only.

## Consequences

Redis/Postgres stay deferred until a feature needs durable state. Local development does not require Vault/ESO (see the architecture PRD local-dev tiers).
