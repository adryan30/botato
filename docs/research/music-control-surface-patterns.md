# Survey: Popular Discord music bots' control-surface patterns

**Ticket:** [Research popular music bots' control-surface patterns](https://github.com/adryan30/botato/issues/43)  
**Map:** [Music control-surface UX plan](https://github.com/adryan30/botato/issues/42)  
**Survey date:** 2026-07-23  
**Scope:** Discord **message/component** control surfaces only (now-playing layout, queue presentation, buttons/selects, live player vs snapshot, findability when chat continues). Not feature parity, not web dashboards as recommendations.

## Question

How do Hydra, Jockie Music, Chip, and classic Rythm/Groovy (docs or archived references if needed) present their music **control surfaces** — now-playing layout, queue presentation, buttons/selects, whether there is a single live player message, and how they keep that player findable when chat continues?

## Constraints (from map Notes — facts checked against these)

| Preference | Implication for this survey |
|---|---|
| Capture **patterns**, not feature parity | Compare visibility / layout / controls / queue UX; ignore source catalogs and audio filters except where they shape UI |
| Discord message/components only | Web dashboards and Discord Activities noted only as “not the message surface”; not recommended patterns |
| Prefer primary sources | Official sites/docs, owner-submitted bot-list copy, still-hosted dead-bot command pages; secondary guides used only where first-party text is silent, and labeled as such |
| Visibility bias on map: re-post/bump over dedicated channel | Survey still records dedicated-channel patterns (Hydra) as a findability strategy |

### Status caveats (affects source freshness)

| Bot | Status at survey | Implication |
|---|---|---|
| **Hydra** | Music removed **2023-02-07** per first-party article | Patterns from music-era owner listings + contemporary guides; bot still exists as non-music utility |
| **Groovy** | Service ended (first-party shutdown page); command page still hosted | Treat [groovy.bot/commands](https://groovy.bot/commands) as frozen primary reference |
| **Classic Rythm** | Original bot shut down ~2021; brand revived as bot + Activity + apps | Prefer classic command inventories for the “classic Rythm” surface; cite modern [docs.rythm.fm](https://docs.rythm.fm/) only where it documents **message** components |
| **Jockie Music / Chip** | Active | First-party sites exist; some pages are SPA shells that do not expose command text to static fetch |

---

## 1. Hydra (music era)

**Verdict:** Hydra’s distinctive pattern was a **dedicated song-request channel** that *was* the control surface: live now-playing + queue in-channel, **reaction** controls on the playing message, optional prefixless requests. Findability came from **channel isolation**, not from bumping a player in general chat.

### Dual interaction modes

Owner-submitted listing (music-era copy still on bots.ondiscord):

1. Ordinary music-bot style: `.play songName/Url`
2. `.setup` → unique **songrequest** channel; queue by name/URL **without prefix/command**

After setup, “most of the commands only work in the songrequest channel.”

Source: [bots.ondiscord.xyz — Hydra](https://bots.ondiscord.xyz/bots/547905866255433758) (Edited: 09/13/2021 on that listing).

### Now-playing / queue layout

| Claim | Evidence tier |
|---|---|
| “Easy to use **reaction-based menu**” and a “**unique way of showing the current song and queue** (optional)” | **Primary** — same bots.ondiscord listing |
| Setup creates `'hydra-song-requests'` as the channel for commands + music search | **Primary** — same listing |
| Channel shows currently playing song under which users react | **Secondary** corroboration — setup guides describing the live channel UX ([downloadsource.net Hydra setup](https://www.downloadsource.net/how-to-add-and-use-hydra-bot-in-discord-server-music-bot-setup/n/20963/), [Make Tech Easier](https://www.maketecheasier.com/add-hydra-bot-discord-server/)) |
| Dedicated channel kept “clean,” showing a “custom **player module** and the songs currently in queue,” with on-surface play/pause/skip/shuffle controls | **Secondary** — [Creator Handbook Hydra guide](https://www.creatorhandbook.net/a-creators-guide-to-the-hydra-discord-bot/) (pre-removal article; update note says music later removed) |

First-party listing does **not** spell out embed fields/artwork; secondary sources consistently describe a persistent in-channel player with artwork-like presentation and queue visible in that channel. Treat field-level layout as **inferred from secondary**, not as a primary-source claim.

On-demand track detail also existed as a command (`.songinfo` / aliases `np`, `nowplaying`) in secondary command tables that claim to mirror Hydra’s help text ([downloadsource.net](https://www.downloadsource.net/how-to-add-and-use-hydra-bot-in-discord-server-music-bot-setup/n/20963/)).

### Buttons / selects

Music-era Hydra used **message reactions**, not Discord buttons/selects (buttons were not yet the default music-bot control idiom when this surface was designed). Owner listing documents:

| Reaction | Action |
|---|---|
| ⏯ | Pause/Resume |
| ⏹ | Stop and empty the queue |
| ⏭ | Skip |
| 🔄 | Cycle loop modes |
| 🔀 | Shuffle |
| ⭐ / ❌ | Add/remove current song from favorites |

Source: [bots.ondiscord.xyz — Hydra](https://bots.ondiscord.xyz/bots/547905866255433758).

Secondary guides later say “buttons” loosely; primary source is **reactions**. (Hydra’s post-music Reaction Roles product *does* use buttons/selects — that is a different feature: [hydra.bot reaction-roles article](https://hydra.bot/articles/how-do-i-create-reaction-roles-on-discord).)

### Live player vs snapshot

| Mode | Pattern |
|---|---|
| Song-request channel | **Single live player surface** in a dedicated channel (edit/update in place as tracks change — described by secondary guides; listing’s “unique way of showing current song and queue” matches this shape) |
| Classic `.play` mode | Behaves like a normal music bot (command replies); less distinctive for findability |

### Findability when chat continues

**Dedicated channel.** Requests and the player live in `#hydra-song-requests` (or renamed equivalent); general chat cannot bury the surface because the surface is not in general chat. Listing: after setup, commands are scoped to that channel.

Music end-of-life (context only): [hydra.bot — Why is Hydra dropping all music features](https://hydra.bot/articles/why-is-hydra-dropping-music-features) (music removed 2023-02-07).

---

## 2. Jockie Music

**Verdict:** Jockie’s first-party story is **multi-instance bots + deep command surface**, not a documented dedicated player channel or single live control message. Control is primarily **command-driven** (`m!` / slash); any rich embeds/buttons are not spelled out in scrapeable first-party docs at survey time.

### First-party positioning

- Official site: up to **4 bots** acting as one lineup (extra with premium); same prefix/config across instances — [jockiemusic.com](https://www.jockiemusic.com/)
- Top.gg owner description: “Multi music bot,” “150+ music commands,” shared prefix across instances — [top.gg/bot/411916947773587456](https://top.gg/bot/411916947773587456)
- Prefix listed as `m!` on Top.gg; invite more bots via `m!invite`

### Now-playing / queue / controls (what primary sources do *not* specify)

| Surface question | First-party answer at survey |
|---|---|
| Now-playing layout (embed fields, artwork) | **Not documented** on static official pages (site `/commands` and `/faq` render as SPA shells with no command body in HTML) |
| Queue presentation | **Not documented** in first-party static text |
| Buttons/selects on a player message | **Not claimed** in official site or Top.gg long description |
| Single live player message | **No first-party claim** of a persistent player message or song-request channel |
| Findability strategy | Implicit: re-invoke commands (`nowplaying` / `queue` class) in whatever channel users use; multi-bot solves concurrent voice rooms, not chat burial |

### Secondary-only notes (do not treat as primary)

Third-party setup guides describe `/nowplaying`, `/queue`, and “rich queue cards… with clickable controls” if Embed Links is allowed (e.g. TechBloat Jockie guides). Those claims were **not** verified against first-party docs in this survey — flag for grilling if Botato wants to copy a Jockie-like interactive NP/queue card.

### Pattern takeaway for Botato

Jockie is a **command-density / multi-session** product, not a **channel-hosted live player** product (contrast Hydra). Useful as a negative control: popularity does not require a single always-visible player message.

---

## 3. Chip

**Verdict:** Chip is a **command-centric, snapshot-per-command** surface. Official marketing emphasizes command control; community command inventories expose `/np` and `/queue list` (and search pick lists) without documenting a dedicated live player channel or persistent control row.

### First-party

- [chipbot.gg/home](https://chipbot.gg/home): “Ultimate Control — Control everything from Chip's prefix to the equalizer…”; links to Commands / Premium / Support Server. No description of a live player message, pin, or song-request channel.
- Support server linked from listings: `https://discord.gg/mgxyN7S` (not scraped as a primary text corpus here).

### Command surface (community / listing mirrors)

| Command family | Role in control surface |
|---|---|
| `/play`, `/pause`, `/resume`, `/skip`, `/stop`, … | Playback via slash (or legacy `ch!` prefix) |
| `/np` | **Now-playing snapshot** on demand |
| `/queue list` | **Queue snapshot** on demand; `/queue export` for full dump to file |
| `/search` | Search then **choose from a list** (selection UI for enqueue, not a persistent player) |

Sources:

- [Discord Fandom — Bot:Chip](https://discord.fandom.com/wiki/Bot:Chip) (community wiki command table)
- [alternative.me — Chip help preview](https://alternative.me/discord/bots/chip/commands) (captured `ch!help` categories: Music includes `play`, `queue`, `pause`, `skip`, … — no separate “player panel” command)

### Buttons / live player / findability

| Question | Finding |
|---|---|
| Buttons on a live player | **Not evidenced** in first-party home or listed command inventories |
| Single live player message | **No** — NP/queue are explicit commands → **snapshot-per-command** |
| Findability | Re-run `/np` or `/queue list` (and scroll); no documented pin/dedicated channel/bump. Users often keep a `#music` channel by convention (server practice, not Chip product UX) |

---

## 4. Classic Rythm & Groovy

**Verdict:** Both classic giants used the **announce + on-demand snapshot** family: optional automatic “now playing” posts when tracks start, plus `/nowplaying` (or `/song`) and `/queue` when users ask. Neither’s frozen command docs describe a Hydra-style dedicated live player channel. Interactive components appear mainly on **search/pick** flows (modern Rythm docs), not as a always-on transport bar.

### Groovy (frozen primary: still-hosted commands)

[groovy.bot/commands](https://groovy.bot/commands) (and matching [alternative.me Groovy commands](https://alternative.me/discord/bots/groovy/commands)):

| Command | Control-surface role |
|---|---|
| `/play`, `/pause`, `/unpause`, `/skip`, `/stop`, `/seek`, … | Transport via commands |
| `/queue` | Displays current queue (paged/list snapshot) |
| `/song` / `/now playing` | Current (or specified) track info snapshot |
| `/announce` | **Toggles announcing of “Now playing” messages** |
| `/search` | Returns a numbered list; user picks by typing a number (classic select-by-reply, not a persistent player) |
| `/jump`, `/move`, `/remove`, … | Queue surgery via commands |

**Live player?** No first-party description of one editable player message. Visibility pattern = **optional announce (re-post on track start)** + **on-demand NP/queue**.

Shutdown context: [groovy.bot](https://groovy.bot/) (“Groovy has ended its service”).

### Classic Rythm (command inventory)

Classic-era command list (mirrored on [alternative.me Rythm commands](https://alternative.me/discord/bots/rythm/commands); prefix historically `!`, later slash):

| Command / setting | Control-surface role |
|---|---|
| `/nowplaying` | Shows current playing song (snapshot) |
| `/queue` | Shows enqueued songs (snapshot; pageable) |
| `/settings announcesongs` | **Toggles announcing each song as it plays** |
| `/prune` | Prunes Rythm’s messages and commands (up to 100) — cleanup of prior NP/command clutter |
| `/search` | List of matches (classic); modern Rythm docs add components (below) |
| Transport | `/pause`, `/resume`, `/skip` / vote-skip, `/volume`, loops, etc. via commands |

**Live player?** Not in the command list. Findability = **announce-on-track-change (bump/new message)** and/or **user `/nowplaying`**, with `/prune` acknowledging announce/command spam as a real problem.

### Modern Rythm message components (revival — limited relevance)

Current first-party bot docs ([docs.rythm.fm/commands](https://docs.rythm.fm/commands/)):

- `/search` — “Shows 5 search results with **interactive dropdown** selection. Use **Queue All** button to add multiple tracks.”
- Transport remains slash-command based (`/play`, `/pause`, `/resume`, …).
- Product also ships a **Discord Activity** and web/desktop apps ([docs.rythm.fm](https://docs.rythm.fm/)) — **out of scope** as a Botato recommendation (map: Discord message/components only), but useful contrast: Rythm’s modern answer to “findable controls” partly moved **off** channel messages.

---

## 5. Comparative summary (for later grilling)

### Visibility / findability strategies

| Strategy | Who | How it resists chat burial | Fit vs map bias |
|---|---|---|---|
| **Dedicated music channel as the surface** | Hydra (music era) | Player + queue live in a channel that *is* the UI; general chat is elsewhere | Works, but **conflicts** with map preference to avoid requiring a dedicated channel |
| **Announce / re-post on track start** | Groovy (`/announce`), classic Rythm (`announcesongs`) | New NP message rises in the active channel; old ones age out (Rythm `/prune`) | Aligns with map’s **re-post/bump** bias |
| **Snapshot on demand** | Chip (`/np`, `/queue list`), Jockie (commands), all bots’ queue/NP commands | User re-invokes; buried unless someone asks again | Cheap; weak alone for “findable live player” pain |
| **Non-message surface** | Modern Rythm Activity / apps | Always findable outside chat | Out of scope for Botato |

### Layout

| Bot | NP presentation (as evidenced) | Queue presentation |
|---|---|---|
| Hydra | Live in-channel player module (primary: “unique” NP+queue display; secondary: artwork + controls) | Shown in the same song-request channel (optional/unique display per listing) |
| Jockie | Undocumented in first-party static docs; assume command reply embeds | Same |
| Chip | `/np` reply snapshot | `/queue list` snapshot; export to file for full dumps |
| Groovy / classic Rythm | Announce embeds and/or `/nowplaying`/`/song` snapshots | `/queue` snapshots; surgery via commands |

### Controls on the player

| Bot | On-message controls | Elsewhere |
|---|---|---|
| Hydra | **Reactions** on the playing message (pause/stop/skip/loop/shuffle/favorite) | Commands in song-request channel |
| Jockie | Not first-party-documented | Large command set / multi-bot |
| Chip | Not evidenced | Slash/prefix commands; search pick list |
| Groovy / classic Rythm | Not a persistent transport bar | Slash/prefix commands; Groovy search by number; **modern Rythm** search dropdown + “Queue All” button |

### Single live player vs snapshot-per-command

```text
Hydra song-request mode ──► single live channel player (dedicated channel)
Announce-style Rythm/Groovy ──► ephemeral NP posts (bump) + snapshots
Chip / Jockie / classic command mode ──► snapshot-per-command (weak findability)
```

### Patterns worth grilling for Botato (map pain stack)

1. **Visibility:** Prefer **bump/re-post on meaningful activity** (Groovy/Rythm announce lineage) over Hydra’s dedicated-channel requirement — matches map Notes. Decide whether bumps delete prior player messages (Rythm `/prune` shows clutter is real).
2. **Layout:** Hydra’s “player module + queue in one glance” is the closest popular precedent to a rich control surface; field/artwork details need prototype judgment (primary sources thin on embed schema).
3. **Controls:** Reactions (Hydra) → modern equivalent is **buttons** (and selects for search, per modern Rythm). Thin control row vs Hydra’s full reaction set is an explicit map pain.
4. **Queue:** Separate `/queue` snapshots (everyone) vs **queue on the live surface** (Hydra). Map pain “queue hard to scan” argues for on-surface queue, not only a separate command.
5. **Skip copying:** Jockie multi-bot, Chip export-to-file, Rythm Activity/web — interesting products, not Botato’s Discord-message redesign path.

---

## Key sources (index)

| Topic | URL | Tier |
|---|---|---|
| Hydra music-era listing (reactions, setup, NP+queue claim) | https://bots.ondiscord.xyz/bots/547905866255433758 | Primary (owner listing) |
| Hydra music removal | https://hydra.bot/articles/why-is-hydra-dropping-music-features | Primary |
| Hydra dedicated-channel UX narrative | https://www.creatorhandbook.net/a-creators-guide-to-the-hydra-discord-bot/ | Secondary |
| Hydra setup / reactions under NP | https://www.downloadsource.net/how-to-add-and-use-hydra-bot-in-discord-server-music-bot-setup/n/20963/ | Secondary |
| Jockie official site | https://www.jockiemusic.com/ | Primary |
| Jockie Top.gg description | https://top.gg/bot/411916947773587456 | Primary (owner listing) |
| Chip home | https://chipbot.gg/home | Primary |
| Chip command table | https://discord.fandom.com/wiki/Bot:Chip | Community wiki |
| Chip help preview | https://alternative.me/discord/bots/chip/commands | Listing capture |
| Groovy commands (incl. `/announce`) | https://groovy.bot/commands | Primary (frozen) |
| Groovy command mirror | https://alternative.me/discord/bots/groovy/commands | Listing |
| Classic Rythm command mirror (announcesongs, prune, np, queue) | https://alternative.me/discord/bots/rythm/commands | Listing (classic inventory) |
| Modern Rythm bot docs (search dropdown + Queue All) | https://docs.rythm.fm/commands/ | Primary (revival) |
| Modern Rythm product surfaces | https://docs.rythm.fm/ | Primary (Activity/apps noted as out of scope) |

---

## Survey metadata

| Item | Value |
|---|---|
| Branch | `research/music-control-surface-patterns` |
| Path | `docs/research/music-control-surface-patterns.md` |
| Method | Primary sources preferred; SPA pages noted where command bodies were not scrapeable; Wayback/archive.org fetches blocked in this environment — relied on still-hosted first-party pages + owner listings |
| Not covered | Live Discord support-server ethnography; pixel-perfect embed field inventories; web dashboards as UX to copy; bots beyond the map shortlist |
