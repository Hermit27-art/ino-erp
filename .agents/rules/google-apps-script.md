---
trigger: glob
globs: "**/*.gs"
description: "Rules for Google Apps Script and Google Sheets as a database."
---

# Google Apps Script and Sheets

## Scope and naming

- **All `.gs` files share one global scope.** Never declare the same top-level `const`, `let`, or `function` name in two files. A duplicate `const` can stop the whole project from loading. Run the duplicate check in the `pre-handoff-review` skill before every handoff.
- A name **without** a trailing underscore is public API (callable by `google.script.run`). A name **with** a trailing underscore is private. Make helpers private. Treat each public function as an internet-facing endpoint.

## Writes, locks, and idempotency

- Wrap every read-modify-write in `LockService.getScriptLock()`. Use `tryLock(timeout)`, fail with a clear error if it cannot be acquired, and release in `finally`.
- Inside the lock, read the **current** value from the sheet. Never apply a value the client computed from an old snapshot.
- Mutating endpoints accept a client-generated `opId`. Record it in `CacheService` (6 hour limit) and make a repeated `opId` a no-op.
- Validate everything **before** the first write. Order the writes so a failure in the middle leaves the least damage, and compensate or log to `_AuditLog` when a later step fails.
- Never clear a sheet before you know the new contents are valid. Whole-table overwrite (`saveAll*`) is for import only, requires Superadmin, and takes a backup first.
- Never silently drop unknown keys when mapping an object to a row. Throw an error that names the key.

## Schema and data

- One `SCHEMA` constant defines every sheet and header. Setup and validation both read it. Setup is idempotent: it adds missing columns and never deletes data.
- Keep identifiers server-generated and sequential under the lock. Distinguish `create` (fails if the ID exists) from `update`.
- Dates are stored as plain text `yyyy-MM-dd` (cell format `@`). Normalize `Date` objects when reading. Use the company time zone from Settings, never a hard-coded offset.
- Read and write in batches with `getValues` and `setValues`. Do not loop cell by cell. Re-reading a whole sheet on every call is acceptable at small scale; avoid doing it more than once per request.

## Limits

- A script run is capped (about 6 minutes). Chunk long jobs. Email, Drive, and trigger quotas are real; check them before adding automated sends or backups.
- Any change to `Code_ERP.gs` requires a **new deployment version**. New scopes (Drive, triggers, mail) make the owner re-authorize once. Mention both in the report.

## Environment safety

- Assume a Script Property `ENV` of `test` or `prod`. Destructive or maintenance functions refuse to run when `ENV` is not `test`, unless the PRD says otherwise.
- Never paste real deployment URLs or Spreadsheet IDs into code or docs.
