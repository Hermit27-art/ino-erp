---
trigger: model_decision
description: "Apply when committing, preparing a pull request, or writing the final phase report."
---

# Git and reporting

## Commits

- One PRD work item per commit. The subject starts with the item ID: `fix(gas): R3 aggregate duplicate SKUs before stock check`.
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`. Imperative mood, subject under 72 characters.
- The body states what changed, why, which checks you ran with their results, and any dependency added with its justification.
- Never commit secrets, `node_modules`, `dist/`, zip files, or backup copies of source. Do not force-push. Do not rewrite history that was already shared.
- Do not delete files unless the PRD lists them and the owner approved the list.

## Behavior changes need docs

If behavior, configuration, deployment steps, or Script Properties change, update `README.md` in the same commit. List new Script Properties by name only (for example `AUTH_PEPPER`, `SETUP_CODE`, `ALLOW_RESET`, `ENV`), never their values.

## Final phase report (use this template)

```
# Phase report: <phase>

## Done
- <ID>: <one line> (commit <hash>)

## Not done, and why
- <ID>: <reason>

## Decisions that used a default
- DECISION-xx: <default used>

## Verification
- lint / build / test: <results>
- Manual scenarios on test copy: <list, with outcome>

## Not verified
- <honest gaps>

## Risks and follow-ups
- <anything the owner must decide or do, such as redeploy or re-authorize>
```

Stop after the report. Do not start the next phase.
