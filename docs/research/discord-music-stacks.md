# Survey: Discord music playback stacks for TypeScript bots on ARM64

**Ticket:** [Survey Discord music playback stacks for TS bots on ARM64](https://github.com/adryan30/botato/issues/3)  
**Map:** [Lock Botato's architecture](https://github.com/adryan30/botato/issues/2)  
**Survey date:** 2026-07-21  
**Scope:** Primary sources only (official docs, first-party GitHub repos/releases, GHCR package pages / publish workflows).

## Question

What is the current standard (and viable alternatives) for Discord bot music playback when Botato is TypeScript/discord.js, must play YouTube, should support Spotify-as-resolve, and will run a separate **music node** on linux/arm64 Kubernetes?

## Constraints (from map Notes — facts checked against these)

| Preference | Implication for this survey |
|---|---|
| TypeScript + discord.js bot; separate music node container | In-process `@discordjs/voice` stacks are out of preferred shape; survey focuses on remote music-node protocols |
| YouTube must-have; Spotify = resolve-to-playable (not native Spotify audio) | Matches LavaSrc “Mirror” model; not Deezer-style direct Spotify streaming |
| Deploy on Oracle ARM64 k8s (`linux/arm64` images) | Image multi-arch and aarch64 hardware support are hard requirements |
| Personal private guild only | No public-bot / sharding story; still need auth on the music node |

---

## 1. Current standard: Lavalink v4 as the music node

**Verdict:** For Discord bots that want a separate process to resolve sources and stream Opus into Discord voice, **[Lavalink](https://github.com/lavalink-devs/Lavalink) v4** is the de facto standard music node.

### What it is

Lavalink is “a standalone audio sending node based on [Lavaplayer](https://github.com/lavalink-devs/lavaplayer) and [Koe](https://github.com/KyokoBot/koe)” that sends audio without it reaching bot shards. Official docs describe it the same way and note production use by large bots (FredBoat, Dyno, etc.).

Sources:

- [lavalink-devs/Lavalink README](https://github.com/lavalink-devs/Lavalink/blob/master/README.md)
- [Lavalink FAQ](https://lavalink.dev/getting-started/faq)

### Major version and release

| Fact | Source |
|---|---|
| **v4 is current / out of beta** | README note; [CHANGELOG](https://github.com/lavalink-devs/Lavalink/blob/master/CHANGELOG.md) |
| **Latest stable tag at survey:** `4.2.2` (published 2026-03-06) | [GitHub Releases API](https://api.github.com/repos/lavalink-devs/Lavalink/releases/latest) |
| Java **17+** required | README Requirements; CHANGELOG `4.0.0` |
| Client API is **REST + WebSocket under `/v4`**; client→server WebSocket *messages* removed in v4 (control via REST) | CHANGELOG `4.0.0`; [API docs](https://lavalink.dev/api/) |
| **DAVE** (Discord E2EE voice) since **v4.2.0** — clients must support the new voice-state `channelId` field | CHANGELOG `4.2.0`; [daveprotocol.com](https://daveprotocol.com/) |

### Official Docker images (GHCR)

Documented tags ([Docker docs](https://lavalink.dev/getting-started/docker)):

| Variant | Example tag | Notes from docs |
|---|---|---|
| Ubuntu (default) | `ghcr.io/lavalink-devs/lavalink:4` | Java 18 in docs table |
| Alpine | `ghcr.io/lavalink-devs/lavalink:4-alpine` | Smaller; Java 17 in docs table |
| Distroless | `ghcr.io/lavalink-devs/lavalink:4-distroless` | Minimal; non-root uid `65534` |

Publish workflow ([`.github/workflows/build.yml`](https://github.com/lavalink-devs/Lavalink/blob/master/.github/workflows/build.yml)) builds:

| Image | Platforms |
|---|---|
| Ubuntu (default) | `linux/amd64`, `linux/arm/v7`, `linux/arm64/v8` |
| Alpine | `linux/amd64`, `linux/arm64/v8` |
| Distroless | `linux/amd64`, `linux/arm64/v8` |

The [GHCR package page](https://github.com/lavalink-devs/Lavalink/pkgs/container/lavalink) lists **`linux/amd64`** and **`linux/arm64`** for published images.

### Hardware / aarch64 support

Official hardware matrix ([README](https://github.com/lavalink-devs/Lavalink/blob/master/README.md)):

| OS | Arch | DAVE | Lavaplayer | JDA-NAS | Timescale |
|---|---|---|---|---|---|
| linux | **aarch64** | ✅ | ✅ | ✅ | ✅ |
| linux-musl | **aarch64** | ✅ | ✅ | ✅ | ✅ |

Support outside “OpenJDK/Zulu on Linux AMD64” is described as **best-effort**, but aarch64 is explicitly listed as working for the features Botato needs (playback + natives on Alpine/musl).

**ARM64 deploy takeaway:** Official multi-arch GHCR images exist; Alpine/Distroless are the natural fit for Oracle ARM k8s. Pin a patch tag (e.g. `4.2.2-alpine`) in GitOps rather than floating `:4`.

---

## 2. YouTube on Lavalink (must-have)

Built-in YouTube in Lavaplayer/Lavalink is **deprecated**. From CHANGELOG `4.0.5`:

> The default Youtube source is now deprecated and won't receive further updates. Please use https://github.com/lavalink-devs/youtube-source#plugin instead.

### Required plugin: `youtube-source`

- Repo: [lavalink-devs/youtube-source](https://github.com/lavalink-devs/youtube-source)
- Latest release at survey: **`1.18.1`** (2026-05-03) — [releases/latest](https://api.github.com/repos/lavalink-devs/youtube-source/releases/latest)
- Listed on [Lavalink plugins](https://lavalink.dev/plugins) as “YouTube Plugin”

Config requirements from the plugin README:

1. Disable built-in YouTube: `lavalink.server.sources.youtube: false`
2. Install `dev.lavalink.youtube:youtube-plugin:VERSION` via `lavalink.plugins`
3. Configure InnerTube **clients** (e.g. `MUSIC`, `WEB`, `ANDROID_VR`, `WEBEMBEDDED`) — order matters; clients differ in Opus, age-restriction, and search support

### Operational reality (deal-breaker class, not a hard “no”)

YouTube regularly flags automated clients (“sign in to confirm you’re not a bot”). The plugin documents mitigations:

| Mitigation | Official warning |
|---|---|
| **OAuth2** (`useOauth2` / plugin `oauth` config) | “NOT a silver bullet… worst case could get your account terminated!” |
| **poToken** (Proof of Origin) | Documented separately; OAuth path says you do *not* need poToken with OAuth |
| **Remote cipher server** | Documented for cipher extraction off-box |
| **IP rotation** | Supported via Lavaplayer route planners |

Source: [youtube-source README — OAuth / poToken sections](https://github.com/lavalink-devs/youtube-source/blob/master/README.md)

For a **personal private guild**, YouTube is viable but expect **periodic breakage** and plugin upgrades; plan for config churn (clients, OAuth refresh token via secrets).

---

## 3. Spotify as resolve-to-playable (not native audio)

### Plugin: LavaSrc

- Repo: [topi314/LavaSrc](https://github.com/topi314/LavaSrc)
- Requires **Lavalink v4+**
- Latest release at survey: **`4.8.3`** (2026-05-22) — [releases/latest](https://api.github.com/repos/topi314/LavaSrc/releases/latest)
- Listed on [Lavalink plugins](https://lavalink.dev/plugins): “Spotify, Apple Music & Deezer(native play) support”

### What “Mirror” means (matches Botato’s preference)

LavaSrc README defines **Mirroring**:

> Mirroring is the process of taking the metadata resolved from one source and using it to retrieve a playable `AudioTrack` from another.  
> For example, LavaSrc cannot directly play from Spotify, or any source marked as `Mirror` playback…

| Source | Playback mode |
|---|---|
| **Spotify** | **Mirror** |
| Apple Music | Mirror |
| Tidal | Mirror |
| Deezer / Yandex / … | Direct (native play where marked) |

Default mirror **providers** (from README config example):

1. `ytsearch:"%ISRC%"` when an ISRC exists  
2. `ytsearch:%QUERY%` as fallback  

That is exactly “Spotify URL/playlist → metadata → YouTube (or other) playable track.”

### Credentials

Spotify search/resolution needs a Spotify Developer **clientId / clientSecret** ([developer.spotify.com dashboard](https://developer.spotify.com/dashboard/applications), as linked from LavaSrc). Optional `spDc` cookie for lyrics. No Spotify audio stream is involved for Mirror mode.

---

## 4. TypeScript / Node client libraries (discord.js side)

Official client table: [lavalink.dev/clients](https://lavalink.dev/clients).

### Maintained Node.js clients with DAVE support (official list)

| Client | npm (survey) | Notes from official table / first-party |
|---|---|---|
| [Shoukaku](https://github.com/shipgirlproject/Shoukaku) | `shoukaku@4.3.0` | “Any” library; discord.js connector; queue often via [Kazagumo](https://github.com/Takiyo0/Kazagumo) (`kazagumo@3.4.3`) |
| [Moonlink.js](https://github.com/Ecliptia/moonlink.js) | `moonlink.js@5.2.0` | Higher-level music client |
| [lavaclient](https://github.com/lavaclient/lavaclient) | `lavaclient@5.0.0-rc.3` | Still RC at survey |
| [Lavalink-Client](https://github.com/Tomato6966/lavalink-client) (Tomato6966) | `lavalink-client@2.10.3` | Feature-rich v4 client; npm description also notes NodeLink@v3 support |
| [Magmastream](https://github.com/Magmastream-NPM/magmastream) | `magmastream@2.10.2` | GitHub README says maintenance moved to self-hosted Gitea; npm still published |
| FastLink | `fastlink@2.1.1` | Listed on official clients page |
| Rainlink | `rainlink@1.2.9` | Listed on official clients page |
| Riffy | (listed) | Listed on official clients page |

### Explicitly unmaintained (no DAVE) on official list

Lavacord, TsumiLink, Blue.ts — marked **Unmaintained** / DAVE ❌.

### Fit for Botato

Any **DAVE-capable** client that works with discord.js (or “Any”) is fine for a private guild. Practical shortlist for grilling:

1. **Shoukaku (+ Kazagumo)** — thin Lavalink wrapper + optional queue layer; long-standing ecosystem  
2. **lavalink-client (Tomato)** — batteries-included (queues, unresolved tracks, filters)  
3. **Moonlink.js** — high-level music-oriented API  

Final pick is product taste (API surface vs control), not a hard technical gate, given DAVE support and active releases.

---

## 5. Competing music nodes (Lavalink-compatible or alternatives)

These are **not** the ecosystem standard but are relevant if Botato wants to avoid the JVM.

| Project | Runtime | Protocol claim | Maturity signals (primary) | ARM64 images |
|---|---|---|---|---|
| **[PerformanC/NodeLink](https://github.com/PerformanC/NodeLink)** | Node.js | Lavalink-compatible API; docs note some client/endpoint differences | Active (`pushed_at` 2026-07-21); ~139★; GPL-3.0; Dockerfile based on `node:*-alpine` (Alpine publishes arm64 — **no first-party multi-arch GHCR statement found**) | Build-your-own from Dockerfile; not an official GHCR product like Lavalink |
| **[sonata-sdk/sonata](https://github.com/sonata-sdk/sonata)** | TypeScript / Node 20+ | Lavalink v3+v4 compatible; Spotify/YouTube built-in | Very early (~2★ at survey); MIT; last push 2026-05-28; Dockerfile `node:22-alpine` | Same: self-build; no evidence of published multi-arch registry images |
| **[bre4d777/Rustalink](https://github.com/bre4d777/Rustalink)** | Rust | Lavalink v4 spec | Early (~1★); last push 2026-04-01 | Claimed cross-platform; not surveyed as production-ready |

**LaMus** ([ToThe3xit/LaMus](https://github.com/ToThe3xit/LaMus)) is a full music *platform* for ARM/Pi that still uses **Lavalink (JVM)** as the audio engine — not a competing music node.

### Why Lavalink remains the default

- Documented plugin ecosystem ([plugins page](https://lavalink.dev/plugins)): youtube-source, LavaSrc, SponsorBlock, LavaSearch, LavaLyrics, …  
- Broad client matrix including many TS options with DAVE  
- Official multi-arch container publish pipeline  
- Production references in first-party README  

NodeLink/Sonata are viable **experiments** if JVM memory/startup on ARM becomes painful, at the cost of plugin ecosystem depth and “protocol compatibility is almost but not always complete” risk (NodeLink’s own README).

---

## 6. How a typical Botato path would look (factual architecture sketch)

```text
Guild slash / components  →  Botato (discord.js + TS client)
                              │  WebSocket /v4 + REST /v4
                              ▼
                         Music node (Lavalink v4 container, linux/arm64)
                              │  plugins: youtube-source, LavaSrc, …
                              ▼
                    Discord voice UDP (Opus; DAVE if enabled)
```

Music **session** state (queue UI, who can skip) lives in Botato; the music node holds player/session transport state and can resume if the client supports Lavalink session resume.

---

## 7. Deal-breakers / friction for a personal self-hosted deploy

| Risk | Severity for private guild | Notes / sources |
|---|---|---|
| **YouTube breakage / anti-bot** | High (ops, not architecture) | youtube-source OAuth/poToken warnings; client churn |
| **YouTube OAuth account risk** | Medium | Official “account terminated” warning |
| **Spotify API credentials** | Low–medium | Required for `spsearch` / Spotify URLs via LavaSrc; free Spotify app |
| **JVM heap on small ARM nodes** | Low–medium | Docker docs removed default `-Xmx4G`; default JVM heap can be 1G or 25% of RAM — tune `_JAVA_OPTIONS` for Oracle shapes ([CHANGELOG 4.0.0](https://github.com/lavalink-devs/Lavalink/blob/master/CHANGELOG.md), [Docker docs](https://lavalink.dev/getting-started/docker)) |
| **Exposing the music node** | High if misconfigured | Docker docs warn publishing `2333` to the internet; use ClusterIP + Istio/mTLS or network policy; password auth is basic |
| **Plugin version skew** | Medium | youtube-source + LavaSrc must track Lavalink major; pin versions in GitOps |
| **DAVE client mismatch** | Medium if Discord requires it | Use a client from the DAVE ✅ list; Lavalink ≥ 4.2.0 |
| **Native Spotify audio** | N/A (out of scope) | LavaSrc Mirror already matches preference |
| **ARM64 image availability for Lavalink** | **Not a deal-breaker** | Official `linux/arm64/v8` publishes + aarch64 hardware matrix |
| **Competing Node music nodes on ARM** | Soft | Must self-build; thinner ecosystem |

Nothing in primary sources blocks Botato’s preferred shape (TS bot + separate music node + YouTube + Spotify mirror + ARM64). The real ongoing cost is **YouTube maintenance**, not architecture.

---

## 8. Recommendation (input for grilling: “Lock Botato's music playback stack”)

Factual recommendation for the follow-on decision ticket — **not** a final ADR:

1. **Music node:** **Lavalink v4** (`ghcr.io/lavalink-devs/lavalink` Alpine or Distroless, **pin patch**, `linux/arm64`).  
2. **Plugins:** **youtube-source** (YouTube) + **LavaSrc** (Spotify/Apple mirror → `ytsearch` / ISRC). Disable built-in YouTube.  
3. **Botato client:** Prefer a **DAVE-supported** Node client from the official list; shortlist **Shoukaku+Kazagumo** vs **lavalink-client** vs **Moonlink.js** in grilling (API taste / queue ownership).  
4. **Defer** NodeLink/Sonata unless JVM footprint on Oracle ARM proves painful — they are early relative to Lavalink’s plugin + image story.  
5. **Ops assumptions to bake into the architecture doc:** Cluster-internal only music node; Vault/ESO for Lavalink password + Spotify client secret + optional YouTube OAuth refresh; expect youtube-source upgrades.

---

## Key sources (index)

| Topic | URL |
|---|---|
| Lavalink repo / hardware / features | https://github.com/lavalink-devs/Lavalink |
| Lavalink docs (Docker, clients, plugins, FAQ) | https://lavalink.dev/ |
| Lavalink CHANGELOG (v4, DAVE) | https://github.com/lavalink-devs/Lavalink/blob/master/CHANGELOG.md |
| Docker multi-arch publish | https://github.com/lavalink-devs/Lavalink/blob/master/.github/workflows/build.yml |
| GHCR package | https://github.com/lavalink-devs/Lavalink/pkgs/container/lavalink |
| youtube-source | https://github.com/lavalink-devs/youtube-source |
| LavaSrc (Spotify Mirror) | https://github.com/topi314/LavaSrc |
| Official clients | https://lavalink.dev/clients |
| NodeLink | https://github.com/PerformanC/NodeLink |
| Sonata | https://github.com/sonata-sdk/sonata |

---

## Survey metadata

| Item | Value |
|---|---|
| Branch | `research/discord-music-stacks` |
| Path | `docs/research/discord-music-stacks.md` |
| Method | Primary sources only; npm versions sampled 2026-07-21 |
| Not covered | Benchmarks, ToS legal advice, non-primary blog roundups |
