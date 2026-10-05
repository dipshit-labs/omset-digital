---
name: create-pr
description: Open a GitHub pull request from the current branch with a Conventional Commits title, a concise evidence-based body, and visual evidence. Use when creating, publishing, or preparing a PR.
---

# Create pull request

Open a pull request that a reviewer can verify from the body alone. State the changed behavior and design reasoning, backed by commands run and evidence gathered. Match body depth to change scope: a one-line fix takes a few sentences, while multi-module work includes architecture flows and boundary tables.

## Workflow

1. Inspect repository state: run `git status` and `git branch --show-current`. Verify remotes with `git remote -v`. Read `.github/PULL_REQUEST_TEMPLATE.md` and repository guidelines in `AGENTS.md`.
2. Compute the merge base: run `git merge-base origin/main HEAD` (or against the target branch). Inspect the exact commit range with `git log <base>..HEAD --oneline` and touched files with `git diff --name-only <base>...HEAD`. When working on a stacked branch, target that parent branch using `--base <parent>` and describe only the delta introduced by the current branch.
3. Inspect the diff and boundary callsites: run `git diff <base>...HEAD`. Focus on runtime files in `src/`. Map affected entry points, exported APIs, and caller sites. Trace affected external boundaries, database schemas, and configuration files so claims cite concrete file paths and symbols.
4. Structure the body using the organization template: classify the change type. Fill the required sections: `## What the Hell Did You Do?`, `## Which Issue is This Supposed to Fix?`, `## Where is the Proof?`, and `## The "Am I Ready to Merge?" Checklist`. For cross-cutting or sensitive changes, include optional subsections such as Change Map, Architecture, or Risks. See [pr-body](references/pr-body.md).
5. Run verification commands: execute checks that match touched files:
   - Format and lint: `bun run fix`
   - Static analysis: `bun run check -- --format=agent`
   - TypeScript validation: `bun run typecheck`
   - Focused unit or integration tests: `bun test <path/to/test>` Capture the exact terminal commands and summary output for the proof section.
6. Capture visual evidence for UI changes: when modifying client-rendered components, markup, or styles in `src/`, capture before and after screenshots of each affected state into `.data/pr-shots/base/<id>.png` and `.data/pr-shots/head/<id>.png`. See [visual-evidence](references/visual-evidence.md).
7. Publish branch and create the PR: write the completed markdown body to `.data/pr-body.md`. Push the feature branch to the remote repository using `git push -u origin <branch-name>`. Create the PR with GitHub CLI:
   ```bash
   gh pr create --title "<type>(<scope>): <summary>" --body-file .data/pr-body.md
   ```
   Append `--attach .data/pr-shots/...` for each screenshot. Pass `--draft` when checks are still running or follow-up edits remain.
8. Audit the published PR: inspect the created PR using `gh pr view --web` or `gh pr view`. Verify that title, base branch, head branch, checklists, tables, diagrams, and attached media render cleanly on GitHub.
9. Address review feedback: apply requested changes directly to affected files in `src/`. Re-run focused checks using `bun test <path>` and `bun run check -- --format=agent`. Push commits with `git push`. Reply on GitHub with the verification command and resolved diff, then resolve the discussion thread.

## Title conventions

Format the title using Conventional Commits:

```text
feat(scope): add retry to upload client
fix(scope): handle double submit on enter
refactor: extract diff parsing from cli
chore(deps): update vite to v8
docs: clarify worktree setup
```

- Write in lowercase imperative mood, for example `fix(auth): handle session expiration on refresh`.
- End title strings without trailing punctuation.
- Keep title length under 70 characters.
- Name the package, module, or domain model in scope when the change is localized. Omit the scope for repository-wide changes.
- Frame the title as the squash-merge commit message that will appear in git history.

## Body structure

### Required sections

- `## What the Hell Did You Do?`: lead with the problem or capability, then state what changed and why this implementation was chosen. When stacked, specify the base branch, for example `Stacked on #480; only the last two commits belong to this PR.`
- `## Which Issue is This Supposed to Fix?`: link originating issues with keywords so GitHub auto-closes them on merge (`Closes #123`, `Fixes #456`, or `Relates to #789`).
- `## Where is the Proof?`: list the exact commands executed and their output summary (`bun run check -- --format=agent`, `bun run typecheck`, `bun test <path>`). Include visual evidence tables for UI changes.
- `## The "Am I Ready to Merge?" Checklist`: verify and check off all five items. Keep the disclaimer quote intact at the bottom.

### Optional subsections

When changes cross boundaries or alter invariants, place these subsections under `## What the Hell Did You Do?` or `## Where is the Proof?`:

- `### The Blast Radius`: table of module, before, after, and description. Map subsystem boundaries in `src/`, rather than individual file paths.
- `### How It Actually Works`: Mermaid flowchart, sequence, or state diagram when order of operations, async steps, or states change. For bug fixes, pair Before and After diagrams.
- `### What Could Break?`: table of invariants, failure modes, protections, and verified evidence or gaps.
- `### Next Steps`: migrations, feature flags, or follow-ups. State whether any gap blocks merge.

## Operational rules

- **Verify with concrete proof.** State verified behavior, explicit assumptions, and unverified areas directly. Point to test outputs, typecheck logs, or screenshot files in `.data/pr-shots/` to substantiate claims. Inspect test files under `tests/` to cite coverage.
- **Scope claims to executed checks.** Run targeted test suites with `bun run test <path/to/test>`, run static checks with `bun run check -- --format=agent`, run type checks with `bun run typecheck`, and run the build with `bun run build`. Quote the specific commands and test names in `## Where is the Proof?`.
- **Isolate branch changes.** Compute the merge base using `git merge-base origin/main HEAD`. Inspect `git log <base>..HEAD --oneline` and `git diff --name-only <base>...HEAD`. Restrict descriptions and change maps strictly to files and commits within that range.
- **Protect private data.** Reference sanitized fixtures in `tests/fixtures/`, substitute live credentials with tokens like `<REDACTED>`, and quote truncated type interfaces from `src/` instead of pasting live data or access tokens into the PR description.
- **Store and attach media via GitHub CLI.** Write screenshots and screen recordings to `.data/pr-shots/`. Confirm `.data/` is present in `.gitignore`. Upload assets to GitHub storage using `gh pr create --attach .data/pr-shots/<file>` or `gh pr edit --attach .data/pr-shots/<file>`.
- **Use clean plain punctuation.** Separate clauses and list items using periods, commas, or standard ASCII hyphens (`-`).
- **Start with facts.** Lead sentences with concrete mechanisms, file paths, and observable behavior. State what broke in the source file, what call was altered, and how the system behaves now.
- **Branch hygiene.** Run `git branch --show-current` to confirm work is on a dedicated feature branch. Create new branches with `git checkout -b <branch-name>` and publish with `git push -u origin <branch-name>`.
- **Self-review.** Review the entire staged diff with `git diff <base>...HEAD` before pushing. Check off each item in `## The "Am I Ready to Merge?" Checklist` (`- [x]`) once verified.
