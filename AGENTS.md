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

`main` is PR-only (direct pushes rejected). Conventional Commits (Commitizen) are required — see `docs/agents/git-workflow.md`.
