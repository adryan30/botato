# Botato

Personal Discord bot for a private guild: modular capabilities with voice music playback.

## Local development (tier 1)

**Default loop:** run Botato on the host and the music node via Compose.

Containerizing Botato is **not** the default for day-to-day development.

### Prerequisites

- Docker with Compose v2
- Node.js (once the Botato bootstrap lands — see parent work under [#16](https://github.com/adryan30/botato/issues/16))

### 1. Configure secrets

```bash
cp .env.example .env
```

Set at least `MUSIC_NODE_PASSWORD`. Add Spotify client id/secret when you need Spotify resolve-to-playable. Optional YouTube OAuth / poToken vars are documented in `.env.example`.

### 2. Start the music node

```bash
docker compose up -d
docker compose ps
```

Compose brings up **only** the music node (official Lavalink ≥ 4.2 image `ghcr.io/lavalink-devs/lavalink:4.2.2-alpine`) with **youtube-source** and **LavaSrc**, listening on `127.0.0.1:2333`. Plugins download into `music-node/plugins/` on first start (gitignored).

Stop with `docker compose down`.

### 3. Run Botato on the host

Once the TypeScript project exists, start Botato on the host (e.g. `tsx` / watch + HMR) pointed at the Compose music node (`MUSIC_NODE_HOST` / `MUSIC_NODE_PORT` / `MUSIC_NODE_PASSWORD` from `.env`). Keep a single Discord application token for local and production — do not run host and cluster Botato with that token at the same time.

## Domain language

See [CONTEXT.md](CONTEXT.md) for **Botato**, **feature module**, **music node**, and **music session**. Architecture decisions live under [docs/adr/](docs/adr/).
