---
trigger: glob
globs: "src/**/*.ts, src/**/*.tsx"
description: "React 19, TypeScript, Vite, Tailwind 4 conventions for the INO ERP frontend."
---

# React and TypeScript

## Structure

- `src/App.tsx` is a 9,000-line component with 160+ `useState` calls. Do not rewrite it and do not grow it. Put new logic in new modules and hooks; touch `App.tsx` only to wire them in.
- Business logic (totals, stock movement, tax, void, return, metrics) lives in pure functions under `src/domain/` with unit tests. Components render and call; they do not calculate money.
- When you modify a function in `App.tsx` that handles money or stock and it is more than about 40 lines, extract the logic you touched into `src/domain/` first, with tests, then change it.

## Types

- No `any` and no `as any` on money, stock, orders, or cash paths. Use the types in `src/types.ts`. Validate data that comes back from the server before using it.
- Do not widen a type to make the compiler quiet. Fix the type.
- Status values come from one shared enum or union. Never write status strings inline.

## Persistence and async

- Every call that saves data is `await`ed inside `try/catch`.
- On failure: show an error message and restore the previous state (or reload from the server). No optimistic update without rollback.
- Disable the triggering button while the request is pending to prevent double submits. Attach an `opId` to mutating calls.
- Never fire and forget a save. `saveAll*` is not used outside the Superadmin import flow.

## Money and numbers

- Use one helper for rounding and formatting. Do not do repeated float arithmetic on stored amounts. Round at documented points only.
- Fractional quantities (grams, milliliters) have a defined precision. Do not compare them with `===` after arithmetic.
- No magic numbers. A fallback cost such as `12000` is a bug; surface "cost not found" instead.

## State and storage

- No secrets, password hashes, or user lists in `localStorage` or `sessionStorage`. The session token is the only exception.
- Effects clean up after themselves and declare honest dependencies.
- Prefer local state inside the new component or hook over adding global state.

## UI hygiene

- Labels on every input, visible focus, keyboard operable, sufficient contrast, semantic tables.
- No inline `innerHTML` with dynamic data. Render data as text.
- Use Tailwind 4 utilities, preferring logical ones (`ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`). Do not hard-code widths on text containers.
