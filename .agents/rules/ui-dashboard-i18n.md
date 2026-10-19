---
trigger: model_decision
description: "Apply when building or changing the dashboard, charts, KPI cards, templates, number/date/currency formatting, translations, RTL support, or CSV import and export."
---

# Dashboard, UI, and internationalization

## Do not invent a visual style

The owner rejected an agent-designed look. Build the dashboard from the template chosen in the PRD (Appendix C; default is Tremor Blocks, MIT). Do not add your own gradients, palettes, fonts, or card styles. Before copying any block: confirm the license, record its origin in `NOTICE`, verify it works with Recharts 3.9 and Tailwind 4, and list any extra dependencies. If a block does not fit the installed versions, use its layout as a reference and rebuild it with the existing components.

## The dashboard

- One large page, no tabs: indicators, trends, receivables and payables, products, accounts, predictions, events. One global period filter. Each widget drills down to a table and exports CSV. The owner decides how far to zoom.
- Every number has one definition, written as a comment beside its function in `src/domain/metrics.ts`, and is tested. Each KPI shows its **scope** (which accounts or period are included).
- Voided documents never affect any number.
- Predictions are deterministic and explainable (no ML): stock-out estimate, 30/60/90 day cash projection, sales run-rate. Each shows its method and data basis, and says "not enough data" below the threshold. Never present a forecast as a fact.
- Every chart has a table alternative. Do not rely on color alone; add direct labels or line patterns. Use a color-blind-safe palette for categories.
- Role: Kasir does not see the dashboard.

## International use

- Format money, numbers, and dates only through `src/i18n/format.ts` (built on `Intl.NumberFormat` and `Intl.DateTimeFormat`). The currency code and locale come from Settings. No `'Rp '` string and no `'id-ID'` in new code.
- Company time zone comes from Settings (client helper and server). Do not call `toISOString()` for business dates.
- UI strings go in language catalogs (EN and ID first). Set `lang` and `dir` on `<html>`.
- Use logical CSS (`ms-*`, `me-*`, `text-start`) so RTL works. Leave at least 30% extra room in text containers for translations. Do not fix widths on labels or buttons.

## CSV

- Import goes through the same posting path as normal transactions, never straight into a sheet. Always dry-run first with per-row errors, `externalRef` for idempotency, size limits, and an `_AuditLog` entry.
- Export must neutralize formula injection (`=`, `+`, `-`, `@` prefixes).
- Use explicit formats: UTF-8, ISO 8601 dates, dot decimals.
