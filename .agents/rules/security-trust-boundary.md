---
trigger: glob
globs: "**/*.gs, **/index_POS.html, **/dataService.ts, **/authService.ts, **/SettingsTab.tsx"
description: "Security rules for the server and every place data crosses from client to server."
---

# Security and the trust boundary

The browser is hostile. Anyone who can open the web app can call any public Apps Script function from the console with any arguments. Everything the client sends is untrusted input, including data that came from our own UI.

## Authentication and roles

- Every public function begins with `requireAuth_(token)` or `requireRole_(token, [...])`. The only exceptions are `login`, `getBootstrapStatus`, `initialSetup` (self-guarded), and `doGet`.
- Roles are enforced on the server using the matrix in the PRD Decision Log. A hidden menu item is not a permission.
- Load the role from the Users sheet or invalidate sessions when a user is deleted, reset, or changes role. A role copied into a session row must not outlive the change.
- Return the same error for "unknown user" and "wrong password".
- **Generic data-access helpers are private.** Anything that takes a sheet name or an arbitrary key (`getSheetData`, `saveItemToSheet`, `saveAllToSheet`, `deleteItemFromSheet`) must end with an underscore. A public `getSheetData(sheetName)` lets any visitor read `_Sessions` and `Users` from the console and steal every session token, which undoes all other access control.

## Input validation (never skip)

- Validate type, range, length, and an allow-list for every field. Reject on failure; never coerce silently.
- Numbers: finite, within sane bounds. Quantities greater than zero. Cap array sizes.
- Strings that become identifiers, names, or labels: trim, length-limit, and take the canonical value from the database by ID instead of trusting the client's copy (for example, customer name from `customerId`).
- Enumerations (payment method, role, status) come from an allow-list stored on the server.
- Duplicate lines (the same SKU twice) must be aggregated before validating stock.

## Output encoding

- Never build HTML by string concatenation with data. Use `textContent`, or an `esc()` helper everywhere the data is dynamic. No `innerHTML`, no `dangerouslySetInnerHTML` with dynamic data.
- Never put data inside inline `onclick="..."`. Use `addEventListener` and `data-*` attributes.
- Email bodies and CSV exports: escape HTML, and neutralize cells starting with `=`, `+`, `-`, `@`.

## Secrets and logs

- Secrets live in `PropertiesService` only. Never hard-code a fallback value for a pepper, key, or code. If a secret is missing, generate it once or fail closed.
- Never write secrets or password hashes to Sheets, logs, error messages, or browser storage. The session token is the only credential the browser may keep, in `sessionStorage`.
- Do not return fields the caller's role must not see (cost price `hpp`, receivables, payables) even if the UI hides them.

## Abuse resistance

- Wrap login attempt counting in `LockService`. Per-username limits can lock out the real owner, so provide an owner-only recovery function.
- Rate-limit anything that sends email or is expensive. Restrict recipients to an allow-list.
- Destructive or maintenance functions require a Script Property flag (for example `ALLOW_RESET`) that the function clears itself, and must back up first.
- First-run setup requires a one-time `SETUP_CODE` set by the owner in the script editor.
- Do not enable `XFrameOptionsMode.ALLOWALL` unless embedding is a real requirement.

## When you finish

State which of these you checked and which you did not. A security fix without a test that attacks it is not finished.
