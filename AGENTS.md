## Workflow boundaries

- **Format and lint.** Run `bun run fix` to resolve formatting and auto-fixable lint issues during changes.
- **Final gate.** Run `bun run check -- --format=agent` and `bun run typecheck` before finishing. Zero errors allowed.
- **Browser verification.** Verify storefront and admin UI changes in a live browser before completion. See `docs/agents/browser-verification.md` and feature maps in `docs/agents/features/`.

## Context pointers

- **Domain models.** Consult `CONTEXT.md` and `docs/adr/` before planning domain or schema changes. See `docs/agents/domain.md`.
- **Issues and triage.** Consult `docs/agents/issue-tracker.md` for `gh` issue workflows and `docs/agents/triage-labels.md` for label lifecycle.
- **Coding standards.** Consult `CODING_STANDARDS.md` when writing or reviewing code for tenant boundaries, types, Payload collections, themes, and variant models.
- **Testing standards.** Consult `docs/TESTING_STANDARDS.md` when writing or updating tests for tiers, fixtures, factories, and boundary mocking.
- **Runtime logs.** Inspect `.data/logs/dev-latest.log` when debugging server crashes, SSR failures, or hook exceptions. See `docs/agents/runtime-logs.md`.
