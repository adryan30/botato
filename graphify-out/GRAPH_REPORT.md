# Graph Report - botato  (2026-08-20)

## Corpus Check
- 104 files · ~32,875 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 624 nodes · 1091 edges · 35 communities (21 shown, 14 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d669dfee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Deploy & Domain Concepts
- Queue & Session UI
- Music Session Service
- Music Node Attachment
- Root Package Metadata
- MusicSessionService
- TypeScript Compiler Config
- Join Play Search Select
- Commit Tooling Deps
- Repeat & Session Types
- Runtime Dependencies
- Agent Git Workflow
- Test Build Config
- repeat.ts
- Clear Command
- Leave Command
- Move Command
- Pause Command
- Remove Command
- Restart Command
- Resume Command
- Shuffle Command
- Skip Command
- SkipTo Command
- Volume Command
- Release Please Config
- Feature module layout
- client.ts
- youtubeResolveCandidates
- Sphere and Drizzle for AFK marks
- AfkGuildMemberRemoveListener
- pick.ts

## God Nodes (most connected - your core abstractions)
1. `MusicSessionService` - 49 edges
2. `Track` - 22 edges
3. `DjModeService` - 20 edges
4. `compilerOptions` - 15 edges
5. `bindControlSurface()` - 13 edges
6. `MusicControlSurface` - 13 edges
7. `AfkService` - 12 edges
8. `resolveRequesterVoiceChannel()` - 11 edges
9. `scripts` - 10 edges
10. `createFakeMusicNode()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Keep Botato up when music node down` --semantically_similar_to--> `Music node degraded operation`  [INFERRED] [semantically similar]
  CHANGELOG.md → docs/adr/0005-music-node-degraded-operation.md
- `CI chain image publish after release-please` --semantically_similar_to--> `release-please publish-image job`  [INFERRED] [semantically similar]
  CHANGELOG.md → .github/workflows/release-please.yml
- `Compose music-node service` --implements--> `Tier 1 local development`  [INFERRED]
  compose.yml → README.md
- `createKazagumoMusicNode()` --references--> `kazagumo`  [EXTRACTED]
  src/features/music/lib/music-node/kazagumo-music-node.ts → package.json
- `Domain docs consumption` --references--> `Botato`  [EXTRACTED]
  docs/agents/domain.md → CONTEXT.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Botato domain ubiquitous language** — context_botato, context_feature_module, context_music_node, context_music_session [EXTRACTED 1.00]
- **Music playback stack** — docs_adr_0002_lavalink_shoukaku_kazagumo_lavalink, docs_adr_0002_lavalink_shoukaku_kazagumo_shoukaku_kazagumo, docs_adr_0002_lavalink_shoukaku_kazagumo_youtube_source, docs_adr_0003_feature_module_layout_features_music, context_music_session [INFERRED 0.85]
- **Release publish and deploy chain** — _github_workflows_release_please_release_please, _github_workflows_publish_image_publish_botato_image, readme_ghcr_botato_image, docs_adr_0004_image_publish_argo_wiring_argo_app_botato [INFERRED 0.85]

## Communities (35 total, 14 thin omitted)

### Community 0 - "Deploy & Domain Concepts"
Cohesion: 0.08
Nodes (34): Publish Botato image workflow, publish-image workflow_call git_tag, release-please publish-image job, CI chain image publish after release-please, Keep Botato up when music node down, Compose music-node service, Compose tier-2 botato service, Botato (+26 more)

### Community 1 - "Queue & Session UI"
Cohesion: 0.10
Nodes (24): NowPlayingCommand, QueueCommand, addDjField(), buildSessionControlRows(), buildSessionEmbed(), formatDjFieldValue(), formatDuration(), formatFullQueueList() (+16 more)

### Community 2 - "Music Session Service"
Cohesion: 0.09
Nodes (28): attachMusicFeature(), bindMusicUnavailablePresence(), createConfiguredOpenRouter(), syncMusicUnavailablePresence(), bindControlSurface(), ResummonResult, first, second (+20 more)

### Community 3 - "Music Node Attachment"
Cohesion: 0.07
Nodes (38): Container, @sapphire/pieces, BoundControlSurface, DjFailureLog, DjModeService, DjModeServiceOptions, DjOffResult, DjVibeResult (+30 more)

### Community 4 - "Root Package Metadata"
Cohesion: 0.07
Nodes (29): author, path, config, commitizen, description, engines, node, keywords (+21 more)

### Community 6 - "TypeScript Compiler Config"
Cohesion: 0.09
Nodes (22): ES2022, node, src/**/*.ts, compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib (+14 more)

### Community 7 - "Join Play Search Select"
Cohesion: 0.07
Nodes (20): DjCommand, JoinCommand, SearchCommand, toSelectOption(), truncate(), SearchSelectHandler, SessionControlsHandler, nextRepeatMode() (+12 more)

### Community 8 - "Commit Tooling Deps"
Cohesion: 0.10
Nodes (21): commitizen, @commitlint/cli, @commitlint/config-conventional, cz-conventional-changelog, drizzle-kit, lefthook, devDependencies, commitizen (+13 more)

### Community 9 - "Repeat & Session Types"
Cohesion: 0.07
Nodes (26): PlayCommand, isRepeatMode(), RepeatCommand, FakeMusicNode, MusicNodeAvailabilityListener, MusicNodePort, MusicNodeTrackFinishedListener, ResolveResult (+18 more)

### Community 10 - "Runtime Dependencies"
Cohesion: 0.10
Nodes (21): discord.js, drizzle-orm, kazagumo, dependencies, discord.js, drizzle-orm, kazagumo, postgres (+13 more)

### Community 11 - "Agent Git Workflow"
Cohesion: 0.13
Nodes (15): release-please workflow, AGENTS issue tracker pointer, Domain docs consumption, Conventional Commits, main PR-only protection, GitHub Issues tracker, Wayfinder map issue, needs-info (+7 more)

### Community 12 - "Test Build Config"
Cohesion: 0.29
Nodes (6): src/**/*.test.ts, ./tsconfig.json, exclude, extends, dist, node_modules

### Community 13 - "repeat.ts"
Cohesion: 0.05
Nodes (31): AfkCommand, formatAfkReply(), attachAfkFeature(), Container, @sapphire/pieces, AfkMark, AfkMarkStore, AfkService (+23 more)

### Community 28 - "Feature module layout"
Cohesion: 0.22
Nodes (8): Adding a new concern inside an existing feature, Adding a new feature, Adding durable tables (Drizzle), Feature module layout, Feature root shape, `lib/` domain folders, Rules of thumb, What goes where

### Community 29 - "client.ts"
Cohesion: 0.38
Nodes (4): BotatoNodeEnv, createBotatoClient(), CreateBotatoClientOptions, normalizeNodeEnv()

### Community 31 - "youtubeResolveCandidates"
Cohesion: 0.08
Nodes (25): Botato constraints, Botato (local), botlabs-gg/yagpdb, Cog-Creators/Red-DiscordBot (discord.py ecosystem), Concrete next steps, Constraints specific to Botato, Discord bot testing pipelines (research), discord/cloudflare-sample-app + discord/discord-interactions-js (first-party) (+17 more)

### Community 32 - "Sphere and Drizzle for AFK marks"
Cohesion: 0.50
Nodes (3): Consequences, Considered Options, Sphere and Drizzle for AFK marks

### Community 35 - "pick.ts"
Cohesion: 0.30
Nodes (9): PickCommand, resolveGuildVoiceChannel(), chooseVoicePick(), eligibleVoicePickMembers(), formatVoicePickReply(), parsePickStyle(), PickStyle, resolvePickVoiceChannelId() (+1 more)

## Knowledge Gaps
- **144 isolated node(s):** `name`, `version`, `private`, `description`, `type` (+139 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createKazagumoMusicNode()` connect `Music Session Service` to `Repeat & Session Types`, `Runtime Dependencies`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Runtime Dependencies` to `Root Package Metadata`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **Why does `kazagumo` connect `Runtime Dependencies` to `Music Session Service`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _144 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Deploy & Domain Concepts` be split into smaller, more focused modules?**
  _Cohesion score 0.0766488413547237 - nodes in this community are weakly interconnected._
- **Should `Queue & Session UI` be split into smaller, more focused modules?**
  _Cohesion score 0.10084033613445378 - nodes in this community are weakly interconnected._
- **Should `Music Session Service` be split into smaller, more focused modules?**
  _Cohesion score 0.0858843537414966 - nodes in this community are weakly interconnected._