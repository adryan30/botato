# TypeScript frameworks for modular discord.js bots

**Ticket:** [Confirm best TypeScript framework for modular discord.js bots](https://github.com/adryan30/botato/issues/4)  
**Map:** [Lock Botato's architecture](https://github.com/adryan30/botato/issues/2)  
**Researched:** 2026-07-22  
**Scope:** Primary sources only (official docs, first-party repos, npm registry metadata).

## Question

For Botato — a TypeScript discord.js bot organized as an **in-repo modular monolith** (feature modules; slash commands + component interactions; music-first but expandable; personal private guild) — is **Sapphire** still the best application framework in 2026, or is a thin DIY module layer (or another framework) the better fit?

## Constraints (from map Notes — facts evaluated against these, not overridden)

- TypeScript + discord.js
- Modular monolith: in-repo feature modules (**not** runtime plugins)
- Slash commands + message components; music-first; expandable later
- Personal private guild only
- Lean preference was Sapphire pending this confirmation

## Candidates compared

| Candidate | What it is | In scope? |
| --- | --- | --- |
| **@sapphire/framework** | OO discord.js framework with piece stores | Yes |
| **Thin DIY** (discord.js guide pattern) | Manual `Collection` + `fs` loaders | Yes |
| **discordx** | Decorator framework on discord.js | Yes |
| **necord** | NestJS module wrapping discord.js | Yes (heavy) |
| Discordeno / `@discordeno/bot` | Alternate Discord library | **No** — not discord.js |
| discord.js Commando | Official command framework | **No** — archived |
| discord-akairo | Older discord.js framework | **No** — stale (last push 2023-03-19) |

---

## 1. Sapphire (`@sapphire/framework`)

### Maintenance status

- npm: **`5.5.0`**, `time.modified` **2025-12-25**; depends on discord.js via install docs (`discord.js@14.x`). ([npm `@sapphire/framework`](https://www.npmjs.com/package/@sapphire/framework); [GitHub release `v5.5.0`](https://github.com/sapphiredev/framework/releases/tag/v5.5.0))
- GitHub `main` tip at research time: release commit **2025-12-24** (`chore(release): release 5.5.0`). Repo not archived; Renovate still opens/updates dependency PRs as of **2026-07-21** (e.g. PR #860). ([sapphiredev/framework](https://github.com/sapphiredev/framework))
- Requires **Node.js ≥ 18**. ([Getting started](https://www.sapphirejs.dev/docs/Guide/getting-started/getting-started-with-sapphire))
- Last-month npm downloads (2026-06-21 → 2026-07-20): **19,389**. ([npm downloads API](https://api.npmjs.org/downloads/point/last-month/@sapphire/framework))

### Piece / command loading model

- Framework is **modular and extendable**, with built-in stores for commands, arguments, preconditions, and listeners; “advanced plugins support” is optional packaging, not required for in-repo structure. ([API / features](https://sapphirejs.dev/docs/Documentation/api-framework); [repo README](https://github.com/sapphiredev/framework))
- Pieces load from folders under the entry-point directory (e.g. `src/commands`); `package.json` `main` must point at the login entry so stores can be found. ([Getting started](https://www.sapphirejs.dev/docs/Guide/getting-started/getting-started-with-sapphire); [Creating a basic command](https://sapphirejs.dev/docs/Guide/getting-started/creating-a-basic-command))
- Loading is powered by **`@sapphire/pieces`** (“Sapphire's piece loader”), a direct dependency. ([npm `@sapphire/pieces`](https://www.npmjs.com/package/@sapphire/pieces); `npm view @sapphire/framework dependencies`)
- **Feature-module shape without runtime plugins:** official guide shows registering an extra path (e.g. `src/audio` with nested `commands/` / `listeners/`) via `stores.registerPath(...)`, so a music (or other) feature folder loads as first-class pieces. Explicitly framed as a discord.py-like “cog/module” pattern. ([Implementing a discord.py like Cog system](https://sapphirejs.dev/docs/Guide/additional-information/implementing-a-discordpy-like-cog-system))

### Interaction support

- **Slash (chat input) commands:** `registerApplicationCommands` + `chatInputRun` on `Command`; registry-based registration. ([Creating a basic slash command](https://sapphirejs.dev/docs/Guide/getting-started/creating-a-basic-app-command))
- **Guild-scoped registration** (fits private personal guild): `ApplicationCommandRegistries.setDefaultGuildIds([...])` applies to all commands that omit per-command `guildIds`. ([Globally configuring guildIds](https://sapphirejs.dev/docs/Guide/commands/application-commands/application-command-registry/globally-configuring-guildids))
- **Message components:** dedicated `InteractionHandler` pieces under `interaction-handlers/`, with types for Button, SelectMenu, MessageComponent, ModalSubmit, Autocomplete; `parse` / `run` filtering by `customId`. ([What are they?](https://sapphirejs.dev/docs/Guide/interaction-handlers/what-are-they); [Buttons](https://sapphirejs.dev/docs/Guide/interaction-handlers/buttons); [Select menus](https://sapphirejs.dev/docs/Guide/interaction-handlers/select-menus))
- Prefix/message commands exist but are **opt-in** (`loadMessageCommandListeners: true` + Message Content intent). Map does not require them. ([Getting started](https://www.sapphirejs.dev/docs/Guide/getting-started/getting-started-with-sapphire))

### Footprint

- Unpacked tarball size **~2.17 MB**; **9** runtime dependencies (Sapphire utilities + `@discordjs/builders`). (`npm view @sapphire/framework dist.unpackedSize dependencies`)
- No NestJS / decorator DI stack required.

### Fit for Botato

- Matches TypeScript + discord.js, slash + components, and **in-repo feature modules** via `registerPath` (music as `audio/` cog) without adopting Sapphire’s *plugin* ecosystem as a runtime plugin host.
- Guild-default command registration aligns with personal-guild-only deploy.
- Caveat: latest **published** framework release is ~7 months old at research date; maintenance is still visible via Renovate and ecosystem packages, but release cadence is slower than Necord/discordx in 2026 H1. Not abandoned; not the busiest release train either.

---

## 2. Thin DIY module layer (discord.js only)

### Maintenance status

- Relies on **discord.js** itself: npm **`14.27.0`**, modified **2026-07-21** — actively published. (`npm view discord.js version time.modified`)
- Official guide documents a DIY command handler (load files → `Collection` → `interactionCreate`). Guide content lives under `/legacy/...` paths on discordjs.guide as of this research. ([Command Handling](https://discordjs.guide/legacy/app-creation/handling-commands))

### Loading / interactions

- Pattern: folders of command modules exporting `{ data, execute }`; recursive `fs` load; route `ChatInputCommand` by name. Components require **additional** DIY routing (customId maps / collectors) not provided as a framework. ([Command Handling](https://discordjs.guide/legacy/app-creation/handling-commands))
- Full control over modular monolith layout (e.g. `features/music/commands`, `features/music/components`).

### Footprint

- Zero framework package beyond discord.js (+ optional `@discordjs/builders` already common).

### Fit for Botato

- Leanest dependency surface and no framework opinion.
- Cost: you own slash deployment, guild vs global registration policy, component/modal routing, preconditions, and error handling — all of which Sapphire already ships. For a music-first bot with session UI buttons, that is non-trivial ongoing surface area.

---

## 3. discordx

### Maintenance status

- npm: **`11.13.3`**, modified **2025-12-13**; peer `discord.js` `>=14`. (`npm view discordx`)
- GitHub [discordx-ts/discordx](https://github.com/discordx-ts/discordx): not archived; commits through **2026-06-15**; ~736 stars.
- Last-month downloads: **6,091**. ([npm downloads API](https://api.npmjs.org/downloads/point/last-month/discordx))

### Loading / interactions

- Decorator model: `@Slash`, `@ButtonComponent`, etc., on `@Discord()` classes; client must call `initApplicationCommands()` and `executeInteraction`. ([@Slash docs](https://discordx.js.org/docs/discordx/decorators/command/slash); [Client](https://discordx.js.org/docs/discordx/basics/client); [ButtonComponent API](https://discordx.js.org/api/discordx/index.html))
- Optional DI (e.g. TSyringe) documented separately. ([Dependency injection](https://discordx.js.org/docs/discordx/basics/dependency-injection))

### Footprint

- Unpacked **~332 KB**; few direct deps (`lodash`, `@discordx/internal`, `@discordx/di`). (`npm view discordx dist.unpackedSize dependencies`)

### Fit for Botato

- Capable for slash + components with a small package.
- Weaker match for an explicit **folder/piece-store modular monolith**: organization is class/decorator-centric rather than store paths per feature. Lower adoption than Sapphire. Still a valid alternative if the team prefers decorators over Sapphire’s OO pieces.

---

## 4. Necord (NestJS + discord.js)

### Maintenance status

- npm: **`6.14.0`**, modified **2026-05-12**. (`npm view necord`)
- GitHub [necordjs/necord](https://github.com/necordjs/necord): active (commits **2026-07**); peers NestJS 10/11 + discord.js 14. ([Introduction](https://necord.org/introduction))
- Last-month downloads: **14,474**. ([npm downloads API](https://api.npmjs.org/downloads/point/last-month/necord))

### Loading / interactions

- Nest `Module` / provider model; `@SlashCommand`, event decorators; claims slash, context menus, message components, listeners; Nest guards/interceptors/pipes. ([Introduction](https://necord.org/introduction); [Home](https://necord.org/))

### Footprint

- Necord unpacked **~656 KB**, but peers pull **`@nestjs/common` + `@nestjs/core`** (Nest core alone **~609 KB** unpacked) plus `rxjs`, `reflect-metadata`. Heavy for a personal guild bot that does not otherwise need Nest.

### Fit for Botato

- Excellent *if* Botato were already a Nest app. Against the map’s lean personal-bot shape, Nest is disproportionate. Module boundaries map well to Nest modules, but that is Nest’s story, not a discord.js-framework-light story.

---

## 5. Explicitly rejected / out of scope

| Option | Why |
| --- | --- |
| **Discordeno** (`@discordeno/bot` 21.0.0, active 2026-07-20) | Different library stack; map locks **discord.js**. |
| **Commando** | Repo **archived** (`discordjs/Commando`). |
| **discord-akairo** | Last push **2023-03-19**; not a 2026 contender. |

---

## Comparison matrix (vs Botato constraints)

| Criterion | Sapphire | DIY discord.js | discordx | Necord |
| --- | --- | --- | --- | --- |
| TypeScript + discord.js | Yes | Yes | Yes | Yes (+ Nest) |
| In-repo feature modules (not runtime plugins) | Yes (`registerPath` / stores) | Yes (you invent it) | Partial (classes/decorators) | Yes (Nest modules) |
| Slash + components | First-class | DIY both | First-class | First-class |
| Guild-only registration helpers | Built-in default guildIds | DIY | Via guild options on decorators | `development` / Nest config |
| Footprint | Medium (~2 MB + Sapphire deps) | Minimal | Small | Large (Nest tax) |
| Maintenance (2026) | Alive; last release Dec 2025 | discord.js very active | Alive; last npm Dec 2025 | Alive; releases into May 2026 |
| Personal lean bot fit | Strong | Strong if willing to build glue | Moderate | Weak (Nest overhead) |

---

## Recommendation (for grilling: “Lock Botato's application framework”)

**Keep Sapphire (`@sapphire/framework`) as Botato’s application framework.**

Rationale in one line: it is still the best **maintained, TypeScript-first discord.js** option that gives **slash + interaction-handler** coverage and a documented **in-repo feature-module** layout (`stores.registerPath` / cog-style folders) without Nest or a runtime plugin host — matching the map’s lean Sapphire preference and modular-monolith Notes.

Use Sapphire as:

- Piece stores for commands / listeners / interaction-handlers
- Feature folders registered with `registerPath` (music first; empty-module conventions later)
- `ApplicationCommandRegistries.setDefaultGuildIds` for the personal guild
- **Do not** treat Sapphire “plugins” as Botato’s expandability model; expand via in-repo feature modules

**Do not** choose Necord unless Nest is adopted for unrelated reasons. **DIY** is a reasonable fallback only if the team wants maximum control and accepts owning component routing and command registration. **discordx** is the closest alternate framework if decorators are strongly preferred over Sapphire pieces.

---

## Key sources

1. https://www.sapphirejs.dev/docs/Guide/getting-started/getting-started-with-sapphire  
2. https://sapphirejs.dev/docs/Guide/getting-started/creating-a-basic-app-command  
3. https://sapphirejs.dev/docs/Guide/interaction-handlers/what-are-they  
4. https://sapphirejs.dev/docs/Guide/additional-information/implementing-a-discordpy-like-cog-system  
5. https://sapphirejs.dev/docs/Guide/commands/application-commands/application-command-registry/globally-configuring-guildids  
6. https://github.com/sapphiredev/framework  
7. https://www.npmjs.com/package/@sapphire/framework  
8. https://discordjs.guide/legacy/app-creation/handling-commands  
9. https://discordx.js.org/docs/discordx/decorators/command/slash  
10. https://github.com/discordx-ts/discordx  
11. https://necord.org/introduction  
12. https://github.com/necordjs/necord  
13. npm downloads API: `@sapphire/framework`, `discordx`, `necord` (last-month points as of 2026-07-22)  
14. https://github.com/discordjs/Commando (archived)  
15. https://github.com/discord-akairo/discord-akairo (stale)  
