# Feature module layout

How feature folders under `src/features/<name>/` are organized. Complements [ADR-0003](../adr/0003-feature-module-layout.md).

## Feature root shape

```text
src/features/<name>/
  commands/                 # Sapphire chat-input / message commands
  listeners/                # Sapphire listeners (optional)
  interaction-handlers/     # Sapphire buttons, selects, modals
  lib/                      # Feature-local non-piece code
    attach-<name>.ts        # Composition root (wire ports → services → container)
    container-augment.ts    # Sapphire Container typing for this feature (if any)
    <domain>/               # One folder per major domain concern — see below
    <small-helpers>.ts      # Only when a helper does not yet earn its own folder
```

Sapphire piece folders stay flat at the feature root so `stores.registerPath` keeps working. Do **not** nest `commands/` or `interaction-handlers/` under `lib/`.

## `lib/` domain folders

When a feature grows past a handful of files, split `lib/` by **domain concern**, not by technical layer (no `adapters/` vs `domain/` vs `ui/` trees unless a concern truly needs them).

Music today:

```text
src/features/music/lib/
  attach-music.ts           # wiring only
  container-augment.ts
  voice.ts                  # small shared helper
  search-results-cache.ts   # small shared helper
  session/                  # music session service + availability guards
  music-node/               # MusicNodePort, kazagumo adapter, fakes, availability
  control-surface/          # sticky surface lifecycle, Discord message port/fake, embed builders
```

### What goes where

| Folder | Owns | Examples |
| --- | --- | --- |
| `lib/<domain>/` | Port, service, pure builders, fakes, and colocated `*.test.ts` for that concern | `music-node/music-node-port.ts`, `session/music-session-service.ts` |
| `lib/` root | Composition root, container augment, tiny helpers shared across domains | `attach-music.ts`, `voice.ts` |
| `commands/`, `interaction-handlers/` | Thin Sapphire adapters that call into `lib/` | `/play`, session control buttons |

### Rules of thumb

1. **Colocate tests** next to the module they exercise (`foo.ts` + `foo.test.ts` in the same folder).
2. **Port + fake stay together** in the domain folder that owns the seam (`music-node/fake-music-node.ts`, `control-surface/fake-discord-messages.ts`).
3. **Promote a helper into a folder** when a second related file appears, or when the name would otherwise collide in a flat `lib/`.
4. **Do not put Discord.js clients or Sapphire pieces inside domain folders** — pieces stay in Sapphire folders; domain code takes ports/fakes.
5. **Import across domains by relative path** (`../music-node/music-node-port.js`). Prefer depending inward on ports/types, not on adapters (commands depend on `session-ui`, not on `kazagumo-music-node`).
6. **Use CONTEXT.md vocabulary** for folder and file names (`music-node`, `control-surface`, `session` — not “lavalink”, “player UI”, “queue service”).

## Adding a new feature

Use the stub shape from the README / ADR-0003. Start with a flat `lib/` until there are roughly more than ~6 non-trivial modules, then introduce domain folders before the dump becomes hard to navigate.

## Adding a new concern inside an existing feature

1. Create `lib/<concern>/`.
2. Move the port, service/builders, fake, and tests into it.
3. Update imports; keep `attach-*.ts` as the only wiring entry that knows concrete adapters.
4. If the concern is architecture-relevant, run `graphify update .` after the move.
