# Visual evidence

Capture before and after screenshots for every user-visible UI state changed by the pull request. Write captures to `.data/pr-shots/` and attach them to GitHub user storage using GitHub CLI. The repository keeps `.data/` gitignored.

## Capture workflow

1. Identify affected surfaces: list each modified route, dialog, component, viewport breakpoint, or theme in `src/`. For shared design tokens or primitives, inspect multiple consuming pages.
2. Assign stable identifiers: give each state a kebab-case identifier and readable title, such as `settings-connection` and `Settings / Connection`.
3. Check out the merge base in a temporary detached worktree:
   ```bash
   base=$(git merge-base origin/main HEAD)
   git worktree add --detach .data/pr-base "$base"
   ```
4. Capture states from both revisions: run available repo tools (Playwright, browser tools, or local dev server) against both worktrees. Write images to `.data/pr-shots/`:
   - Base revision: `.data/pr-shots/base/<id>.png`
   - Head revision: `.data/pr-shots/head/<id>.png`
5. Standardize capture environments: keep viewport dimensions, theme mode, locale settings, fixture data, and wait states identical across both revisions.
6. Verify captured images: inspect each captured image file in `.data/pr-shots/` to confirm complete, settled rendering before attaching. When a capture fails, resolve the rendering issue before publishing the PR.
7. Record state transitions: write `Absent` in the before column for newly introduced views, and `Removed` in the after column for deleted views.
8. Clean up temporary worktrees: run `git worktree remove .data/pr-base` after capture completes.

## Attach to pull request

GitHub CLI uploads local images with `--attach` and replaces local paths in the markdown body with uploaded GitHub asset URLs. Write relative local paths in `.data/pr-body.md`, then pass each file via `--attach`:

```markdown
### Visual Evidence

| Before | After |
| --- | --- |
| ![Settings Connection before](.data/pr-shots/base/settings-connection.png) | ![Settings Connection after](.data/pr-shots/head/settings-connection.png) |
| Settings / Connection, 1440x900, dark | Settings / Connection, 1440x900, dark |
```

```bash
gh pr create \
  --title "fix(settings): keep connection form visible on narrow viewports" \
  --body-file .data/pr-body.md \
  --attach .data/pr-shots/base/settings-connection.png \
  --attach .data/pr-shots/head/settings-connection.png
```

Attachment guidelines:

- Match paths between the markdown image link and the `--attach` argument so GitHub CLI performs in-place URL rewriting.
- Update existing pull requests using `gh pr edit <pr-number> --attach .data/pr-shots/...` or add comments with `gh pr comment <pr-number> --attach .data/pr-shots/...`.
- Embed video walkthroughs by placing `![](path.mp4)` on its own paragraph.
- Verify published assets by opening the PR in GitHub with `gh pr view --web`.
