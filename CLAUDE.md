# Substation Designer: notes for Claude

Status, architecture and the to-do list are in `docs/HANDOFF.md`. Read it first and keep it current.

## Changelog

- All release notes go in `CHANGELOG.md` at the repository root, and nowhere else. The release workflow
  copies the version's section from that file into the GitHub Release (`scripts/release-notes.mjs`).
- While working, add entries under `## [Unreleased]`, which stays at the top below the intro. Group them
  under `### Added`, `### Changed` and `### Fixed`, and write them for players.
- A released version's heading must be exactly `## [X.Y.Z] - YYYY-MM-DD`. The scripts find a section by
  its `## [X.Y.Z]` prefix and end it at the next `## [`, so use `###` for anything inside a section.

## Releasing

Sessions cannot push tags (the git proxy only accepts the working branch), and nobody needs to tag by
hand. The **Tag release** workflow (`.github/workflows/tag-release.yml`) does it:

1. In the release PR, move the `[Unreleased]` entries into a new `## [X.Y.Z] - YYYY-MM-DD` section and
   leave an empty `## [Unreleased]` above it. Bump the version with
   `npm version X.Y.Z --no-git-tag-version`, which updates `package.json` and `package-lock.json`.
   Then `node scripts/check-release.mjs X.Y.Z` must pass. CI runs the same check without the version.
2. After the PR is merged to `main`, run Tag release on `main` with input `version: X.Y.Z`. Either
   use GitHub (Actions → Tag release → Run workflow) or, from a session, call the GitHub MCP tool
   `actions_run_trigger` with method `run_workflow`, workflow_id `tag-release.yml`, ref `main` and
   inputs `{"version": "X.Y.Z"}`.
3. The workflow repeats the check and refuses a tag that already exists. Then it runs `release.yml`,
   which builds and tests everything. Only once every build has passed does it create the annotated
   tag `vX.Y.Z` on that `main` commit and publish the GitHub Release with the Windows and web builds.
