---
name: execute-prd-phase
description: Executes one phase or work item of PRD_INO_ERP_Antigravity.md for the INO ERP project in a safe, repeatable order, then produces the phase report. Use this whenever the user asks to start, continue, redo, or review a phase or work item (Phase 0, 1, 1b, 2, 2b, 3, 3e, 4) or mentions PRD item IDs such as S1, R3, D1, T2, B8, or J1, or says "kerjakan fase". Use it even if the user only names an item ID and does not say "PRD".
---

# Execute a PRD phase

One phase per session. The point of this workflow is to keep changes small, verified, and reviewable by the owner between phases.

## 1. Load only what you need

Read `PRD_INO_ERP_Antigravity.md` section 0 (execution rules), the Decision Log, and the requested phase. Open source files only when an item points to them. The evidence line numbers in the PRD can be stale; confirm each one before relying on it.

## 2. Scope and blockers check

- List the phase's items and read each acceptance criterion.
- Confirm earlier phases are done (git log and the previous phase report). Phase order is mandatory; Phase 1b comes before Phase 2.
- Items marked "waiting" or "deferred" (3b dashboard until the template is chosen, 3c petty cash, 3d I5) must not start. Say so and stop.
- If an item depends on a Decision Log entry with an empty answer, use the stated default and mark `// DECISION-xx: default used`. If there is no default, stop and ask once.

## 3. Environment

Confirm you are working against a **test copy** of the Sheet and a separate test deployment. If none exists, do code-only work and list Apps Script verification under "Not verified". Never run reset, migration, or `saveAll*` against real data.

## 4. Per-item loop

For each item, in order:

1. Restate the problem in one or two lines with the evidence you confirmed.
2. Write a failing test or a reproducible manual scenario first, when feasible.
3. Make the smallest change that satisfies the acceptance criterion (apply the ponytail ladder from the global rules).
4. Run `npm run lint`, `npm run build`, `npm test`, plus the manual scenario on the test copy.
5. Commit with the item ID in the subject (see `git-and-reporting`).

If an item turns out much larger than the PRD suggests, stop, explain, and propose a split. Do not quietly expand scope.

## 5. Close the phase

1. Run the `pre-handoff-review` skill and fix findings that fall inside this phase's scope. List the rest as follow-ups.
2. Write the phase report using the template in `git-and-reporting`, save it as `docs/reports/phase-<id>.md`, and show it in chat.
3. **Stop.** Do not begin the next phase. The owner reviews the report first.

## Decision tree

- PRD and code disagree: report both, propose which to follow, wait.
- Money or tax meaning unclear: stop and ask one question with a default you would pick.
- A fix would require deleting files or changing existing data: stop and ask first.
- A dependency seems needed: look for a standard-library, platform, or already-installed option first; if still needed, list it and justify it.
