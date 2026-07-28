# Graph Report - botato  (2026-07-28)

## Corpus Check
- 69 files · ~17,019 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 421 nodes · 681 edges · 28 communities (16 shown, 12 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `04dd72f6`
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

## God Nodes (most connected - your core abstractions)
1. `MusicSessionService` - 43 edges
2. `Track` - 18 edges
3. `compilerOptions` - 15 edges
4. `MusicControlSurface` - 13 edges
5. `sessionReplyPayload()` - 13 edges
6. `bindControlSurface()` - 12 edges
7. `MusicNodeAvailability` - 11 edges
8. `bindMusicNodeAvailability()` - 9 edges
9. `ControlSurfacePayload` - 9 edges
10. `resolveRequesterVoiceChannel()` - 9 edges

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

## Communities (28 total, 12 thin omitted)

### Community 0 - "Deploy & Domain Concepts"
Cohesion: 0.08
Nodes (34): Publish Botato image workflow, publish-image workflow_call git_tag, release-please publish-image job, CI chain image publish after release-please, Keep Botato up when music node down, Compose music-node service, Compose tier-2 botato service, Botato (+26 more)

### Community 1 - "Queue & Session UI"
Cohesion: 0.11
Nodes (19): NowPlayingCommand, QueueCommand, SessionControlsHandler, buildSessionControlRows(), buildSessionEmbed(), formatDuration(), formatUpNext(), nextRepeatMode() (+11 more)

### Community 2 - "Music Session Service"
Cohesion: 0.11
Nodes (15): Container, @sapphire/pieces, bindControlSurface(), BoundControlSurface, ControlSurfacePayload, DiscordMessagePort, isMissingDiscordMessageError(), MissingDiscordMessageError (+7 more)

### Community 3 - "Music Node Attachment"
Cohesion: 0.10
Nodes (21): attachMusicFeature(), bindMusicNodeAvailability(), bindSessionAdvanceOnTrackEnd(), syncMusicUnavailablePresence(), createDiscordMessagePort(), createKazagumoMusicNode(), KazagumoMusicNode, mapSource() (+13 more)

### Community 4 - "Root Package Metadata"
Cohesion: 0.07
Nodes (27): author, path, config, commitizen, description, engines, node, keywords (+19 more)

### Community 5 - "MusicSessionService"
Cohesion: 0.19
Nodes (3): Track, isSpotifyQuery(), MusicSessionService

### Community 6 - "TypeScript Compiler Config"
Cohesion: 0.09
Nodes (22): ES2022, node, src/**/*.ts, compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib (+14 more)

### Community 7 - "Join Play Search Select"
Cohesion: 0.09
Nodes (17): JoinCommand, PlayCommand, SearchCommand, toSelectOption(), truncate(), SearchSelectHandler, cache, CacheEntry (+9 more)

### Community 8 - "Commit Tooling Deps"
Cohesion: 0.11
Nodes (19): commitizen, @commitlint/cli, @commitlint/config-conventional, cz-conventional-changelog, lefthook, devDependencies, commitizen, @commitlint/cli (+11 more)

### Community 9 - "Repeat & Session Types"
Cohesion: 0.09
Nodes (20): isRepeatMode(), RepeatCommand, first, second, setup(), createFakeDiscordMessages(), track(), createFakeMusicNode() (+12 more)

### Community 10 - "Runtime Dependencies"
Cohesion: 0.12
Nodes (17): discord.js, kazagumo, dependencies, discord.js, kazagumo, @sapphire/framework, @sapphire/pieces, @sapphire/plugin-hmr (+9 more)

### Community 11 - "Agent Git Workflow"
Cohesion: 0.13
Nodes (15): release-please workflow, AGENTS issue tracker pointer, Domain docs consumption, Conventional Commits, main PR-only protection, GitHub Issues tracker, Wayfinder map issue, needs-info (+7 more)

### Community 12 - "Test Build Config"
Cohesion: 0.29
Nodes (6): src/**/*.test.ts, ./tsconfig.json, exclude, extends, dist, node_modules

### Community 28 - "Feature module layout"
Cohesion: 0.25
Nodes (7): Adding a new concern inside an existing feature, Adding a new feature, Feature module layout, Feature root shape, `lib/` domain folders, Rules of thumb, What goes where

## Knowledge Gaps
- **101 isolated node(s):** `name`, `version`, `private`, `description`, `type` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Runtime Dependencies` to `Root Package Metadata`?**
  _High betweenness centrality (0.155) - this node is a cross-community bridge._
- **Why does `createKazagumoMusicNode()` connect `Music Node Attachment` to `Runtime Dependencies`, `Music Session Service`, `MusicSessionService`?**
  _High betweenness centrality (0.155) - this node is a cross-community bridge._
- **Why does `kazagumo` connect `Runtime Dependencies` to `Music Node Attachment`?**
  _High betweenness centrality (0.151) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _101 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Deploy & Domain Concepts` be split into smaller, more focused modules?**
  _Cohesion score 0.0766488413547237 - nodes in this community are weakly interconnected._
- **Should `Queue & Session UI` be split into smaller, more focused modules?**
  _Cohesion score 0.10588235294117647 - nodes in this community are weakly interconnected._
- **Should `Music Session Service` be split into smaller, more focused modules?**
  _Cohesion score 0.1140819964349376 - nodes in this community are weakly interconnected._