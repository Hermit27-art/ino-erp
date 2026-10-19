---
name: pre-handoff-review
description: Self-review checklist and automated checks to run before declaring any INO ERP task, work item, or phase finished. It catches the bug classes found in the October 2026 review - duplicate top-level declarations across .gs files, public Apps Script functions without auth, client/server payload mismatches, unescaped innerHTML, per-row stock validation that duplicate SKUs bypass, stale build files, unawaited saves, hard-coded secrets. Use it whenever you are about to say "done", open a pull request, hand work back to the owner, or write a phase report, even if the change looks small.
---

# Pre-handoff review

Reviews of earlier work found problems the author did not notice because each file looked fine alone. Run this before you hand anything back. It takes a few minutes and has repeatedly found real defects.

## 1. Run the automated checks

```bash
bash .agents/skills/pre-handoff-review/scripts/review-checks.sh
```

Exit code 1 means a hard failure (fix before continuing). Lines marked `REVIEW` are items to inspect by hand; each is either a real problem or something you can justify in one sentence in the report. Do not ignore them.

## 2. Check by hand what scripts cannot see

**Client/server contract.** For every server function you added or changed, compare the exact keys and types the client sends (`src/dataService.ts`, `src/App.tsx`, `index_POS.html`) with what the server reads. A mismatch like `superadminEmail` versus `email`, or an object where the server expects an array, fails only at runtime. Read both sides and write the one-line contract in the commit message.

**Fresh-start path.** Walk the empty-Sheet flow: setup, first login, creating a user, that user logging in. Then walk the migration path from an existing Sheet.

**Trust boundary.** For each server function that accepts client data, answer: what happens with a negative number, a huge number, a duplicate line, an unknown ID, a string containing `<img onerror=...>`, a missing token, and a token of a lower role?

**Aggregation before validation.** When validating stock or limits across lines, combine lines by key first. Per-line validation is bypassed by sending the same key twice.

**Session lifecycle.** Deleting a user, resetting a PIN, or changing a role must invalidate that user's sessions.

**Read paths.** After changing where data is stored (for example moving items to a separate sheet), find every reader of the old location (history, dashboard, exports, POS) and confirm each still shows the data.

**Build artifacts.** The file that is pasted into Apps Script must come from the current `dist/index.html`. Delete or regenerate stale copies; a frontend older than the backend returns `UNAUTHORIZED` everywhere.

**Docs and config.** README updated for any behavior change. New Script Properties named (never their values). Deployment needs (new version, re-authorization) written down.

## 3. Known failure patterns (do not reintroduce)

| Pattern | Seen as |
|---|---|
| Generic helper that takes a sheet name left public (no trailing underscore) | `getSheetData('_Sessions')` callable by anyone; bypassed every other access check |
| Same top-level `const` in two `.gs` files | `SCHEMA` declared in `Code_ERP.gs` and `setup_sheets.gs` |
| Client payload shape differs from server | `initialSetup` field names and `settings` type |
| Per-line stock check with duplicate SKUs | POS checkout deducted stock once for two lines |
| Client string stored then rendered with `innerHTML` | `customerNama` stored XSS in POS |
| Hard-coded fallback secret | default pepper in source |
| Role cached in session | deleted or demoted user kept access for 24 h |
| Data moved, readers not updated | POS history and dashboard showed "0 item" |
| Per-username lockout without a lock | parallel attempts bypassed the limit; anyone could lock the owner out |
| Secrets or user lists in `localStorage` | PIN hashes persisted in the browser |

## 4. Report

Put the results in the phase report: which checks passed, which `REVIEW` lines you accepted and why, and what you could not verify.
