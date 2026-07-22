# Lavalink music node and Shoukaku/Kazagumo clients

Botato must play YouTube (URL and search), with the music node as its own linux/arm64 container. We standardize on **Lavalink v4 (≥ 4.2)** with **youtube-source** only, and on Botato **Shoukaku + Kazagumo** as the DAVE-capable TypeScript clients. Pin a current **4.2.x** Lavalink image and Shoukaku/Kazagumo majors in deploy config.

**Amended (2026-07-22):** v1 is YouTube-only. **LavaSrc** and Spotify resolve-to-playable are removed from the day-one stack. LavaSrc’s Spotify path needs Spotify Web API credentials; as of February–March 2026, Development Mode requires a Premium-owned app, and Extended Quota targets registered organizations — not a personal-guild bot. The owner will not pay for Premium solely to resolve links. Native Spotify audio remains out of scope. Other LavaSrc catalogs (Apple Music, Deezer, etc.) stay opportunistic later, not day one. `/play` with a Spotify URL must fail with a clear unsupported reply.

## Considered options

- **NodeLink / Sonata** — Lavalink-compatible Node/TS nodes; earlier ecosystem than Lavalink’s plugin + multi-arch image story.
- **Other DAVE-capable clients** (e.g. lavalink-client, Moonlink.js) — viable; Shoukaku + Kazagumo chosen for the common discord.js pairing.
- **Keep LavaSrc idle / swap in Apple Music or Deezer** — declined for v1; would reopen the source contract without fixing the “no paid Spotify” constraint.

## Consequences

The music node stays **cluster-internal** (and localhost in local Compose). Secrets (Lavalink password, optional YouTube OAuth/poToken) come from Vault/ESO in cluster — not baked into images. No Spotify client id/secret in the contract. YouTube anti-bot churn is an ops concern, not an ARM64 one.
