# Git workflow

## Default branch

`main` is **protected**: pushes must go through a pull request. Do not `git push` to `main` — it will be rejected by repository rules.

## Commit messages

Use **Conventional Commits** (Commitizen) for every commit:

```text
type(optional-scope): short imperative summary
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

Examples:

- `feat: bootstrap runnable Sapphire Botato (#17)`
- `fix(music): reconnect voice on node resume`
- `docs: document single-token concurrency`

Locally, `pnpm commit` runs Commitizen. A `commit-msg` hook runs commitlint so non-conforming messages are rejected.

## Landing changes

1. Commit on a feature branch (not `main`).
2. `git push -u origin HEAD`
3. Open a PR with `gh pr create` (base `main`).
4. Merge via the PR; pull `main` locally after merge.

Head branches are **deleted automatically on merge** — no manual remote branch cleanup.
