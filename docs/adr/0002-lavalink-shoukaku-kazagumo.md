# Lavalink music node and Shoukaku/Kazagumo clients

Botato must play YouTube and resolve Spotify to a playable track, with the music node as its own linux/arm64 container. We standardize on **Lavalink v4 (≥ 4.2)** with **youtube-source** and **LavaSrc** (Spotify Mirror → playable), and on Botato **Shoukaku + Kazagumo** as the DAVE-capable TypeScript clients. Pin a current **4.2.x** Lavalink image and Shoukaku/Kazagumo majors in deploy config.

## Considered options

- **NodeLink / Sonata** — Lavalink-compatible Node/TS nodes; earlier ecosystem than Lavalink’s plugin + multi-arch image story.
- **Other DAVE-capable clients** (e.g. lavalink-client, Moonlink.js) — viable; Shoukaku + Kazagumo chosen for the common discord.js pairing.

## Consequences

The music node stays **cluster-internal** (and localhost in local Compose). Secrets (Lavalink password, Spotify client id/secret, optional YouTube OAuth/poToken) come from Vault/ESO in cluster — not baked into images. Native Spotify audio is out of scope; YouTube anti-bot churn is an ops concern, not an ARM64 one.
