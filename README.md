# Botato

Personal Discord bot for a private guild: modular capabilities with voice music playback.

## Stack

- **Package manager:** [pnpm](https://pnpm.io/) (`packageManager` pinned in `package.json`)
- **Runtime:** Node.js **≥ 22**
- **Framework:** TypeScript + discord.js + [@sapphire/framework](https://sapphirejs.dev/) 5.x

Day-one Sapphire plugins: `@sapphire/plugin-logger`, `@sapphire/plugin-subcommands`, and `@sapphire/plugin-hmr` (enabled only when `NODE_ENV=development`). Deferred Sapphire plugins (i18next, scheduled-tasks, api, editable-commands, pattern-commands, utilities-store) stay out until a feature needs them.

## Local development (tier 1)

**Default loop:** run Botato on the host and the music node via Compose.

Containerizing Botato is **not** the default for day-to-day development.

### Prerequisites

- Docker with Compose v2
- Node.js ≥ 22 and pnpm

### 1. Configure secrets

```bash
cp .env.example .env
```

Set `DISCORD_TOKEN` and at least `MUSIC_NODE_PASSWORD`. Add Spotify client id/secret when you need Spotify resolve-to-playable. Optional YouTube OAuth / poToken vars are documented in `.env.example`.

**Single-token concurrency:** local and production share one Discord application token. Do not run host Botato and cluster Botato with that token at the same time.

### 2. Start the music node

```bash
docker compose up -d
docker compose ps
```

Compose brings up **only** the music node (official Lavalink ≥ 4.2 image `ghcr.io/lavalink-devs/lavalink:4.2.2-alpine`) with **youtube-source** and **LavaSrc**, listening on `127.0.0.1:2333`. Plugins download into `music-node/plugins/` on first start (gitignored).

Stop with `docker compose down`.

### 3. Run Botato on the host

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs TypeScript via `tsx` with HMR enabled (`NODE_ENV=development`). Production-style: `pnpm build && pnpm start`.

Point Botato at the Compose music node with `MUSIC_NODE_HOST` / `MUSIC_NODE_PORT` / `MUSIC_NODE_PASSWORD` from `.env`.

### Tier-1 music smoke checklist

With the music node healthy and Botato logged in to your private guild:

1. Join a voice channel.
2. `/join` — Botato enters the channel.
3. `/play` with a YouTube URL or search query — audio starts (join-on-play also works without `/join` first).
4. `/nowplaying` — shows the current track.
5. `/leave` — Botato exits and the music session ends.

### Feature modules

Botato expands by adding in-repo **feature modules** under `src/features/<name>/`, not runtime plugins. Each feature uses Sapphire piece folders (`commands`, `listeners`, `interaction-handlers`, `lib`, …). Core stays thin (client boot, plugin registration, explicit `stores.registerPath`, cross-feature utils) and registers **`features/music`** only for v1.

Do **not** check in empty non-music feature folders. The stub shape for a future feature is:

```text
src/features/<name>/
  commands/
  listeners/
  interaction-handlers/
  lib/
```

### Music-session permissions

Music-session permissions are **unrestricted** pending a later decision (no role/channel gates yet).

## Domain language

See [CONTEXT.md](CONTEXT.md) for **Botato**, **feature module**, **music node**, and **music session**. Architecture decisions live under [docs/adr/](docs/adr/).
