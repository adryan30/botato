# Git workflow

## Default branch

`main` is **protected**: pushes must go through a pull request. Do not `git push` to `main` — it will be rejected by repository rules.

## Landing changes

1. Commit on a feature branch (not `main`).
2. `git push -u origin HEAD`
3. Open a PR with `gh pr create` (base `main`).
4. Merge via the PR; pull `main` locally after merge.
