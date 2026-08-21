## Agent skills

### Issue tracker

Issues live in GitHub Issues for `adryan30/botato` (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.

### Feature layout

Feature modules under `src/features/<name>/` use Sapphire piece folders plus domain-grouped `lib/` subfolders. See `docs/agents/feature-layout.md`.

### Git workflow

Commit, push, or land agent work: Conventional Commits; never push `main`; after committing, push the branch and open a PR — see `docs/agents/git-workflow.md`.

### Graphify

Prefer the `graphify` knowledge graph (`graphify-out/graph.json`) as a map when the target module or cross-file dependency is unclear; skip it when the seam is already known. See `docs/agents/graphify.md`.
