---
trigger: model_decision
description: "Apply when writing or running tests, verifying a change, or deciding whether a task is finished."
---

# Testing and definition of done

A task is done when you have **seen** it work, not when the code compiles.

## Checks to run

1. `npm run lint` (type check) passes.
2. `npm run build` passes.
3. `npm test` passes (vitest, once installed in W4.4).
4. The changed behavior was exercised on the **test copy** of the Sheet and deployment, never production.
5. For `.gs` changes: paste **all** `.gs` files into the test Apps Script project and confirm the project loads without errors, then run the function you changed.
6. Run the `pre-handoff-review` skill.

## What to test

- Every invariant in `money-stock-integrity` that you touched gets a test. Put pure logic in `src/domain/` so it is testable without a browser.
- Every bug you fix gets a regression test that fails before the fix and passes after.
- Required scenarios when relevant:
  - Concurrency: ERP loads product X (stock 10). POS sells 3. ERP ships 1. Final stock must be 6.
  - Duplicate SKU lines whose combined quantity exceeds stock are rejected.
  - Void: Draft, paid cash, partial payment, return then void, double void.
  - Attack input: negative quantity, huge quantity, unknown SKU, forged total, forged customer name containing markup, missing token, Kasir token calling an admin endpoint.
  - Sheet round-trip: save and reload each entity; every field must come back; unknown key must raise an error.
  - Integrity: change one cell by hand and confirm `verifyIntegrity` points to that row.
- A test that only asserts "no exception" is not a test.

## Reporting what you did not verify

End each task with a short "Not verified" list (for example: "could not deploy to Apps Script", "did not test on mobile"). An honest gap is acceptable. A hidden gap is not.
