# Feature-module layout under `src/features/`

Botato expands by adding in-repo **feature modules**, not runtime plugins. Each feature lives at **`src/features/<name>/`** with Sapphire piece folders (`commands`, `listeners`, `interaction-handlers`, `lib`, …). The Sapphire client registers features with **explicit `stores.registerPath`** (no runtime plugin loading; no mandatory auto-scan of all features).

## Consequences

Core (`src/` outside features) stays thin: client boot, plugin registration, path registration, and truly cross-feature utils only. Music materializes as **`features/music`**; Shoukaku/Kazagumo and music-session services live under that feature’s **`lib/`**, not core. Empty non-music features are a **documented stub shape only** — not checked in for v1. Prefer feature-local preconditions; bot-wide only when truly cross-cutting.
