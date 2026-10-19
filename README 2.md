# Antigravity rules pack for INO ERP

Everything is in English. Verified against the official Antigravity docs (Rules and Agent skills pages) on 18 Oct 2026.

## Install

| Source in this pack | Copy to | Notes |
|---|---|---|
| `global/GEMINI.md` | `~/.gemini/GEMINI.md` | Personal rules for every project (ponytail mode). No frontmatter. |
| `project/AGENTS.md` | repo root `AGENTS.md` | Always active. No frontmatter. Cross-tool (also read by other agents). |
| `project/.agents/rules/*.md` | `<repo>/.agents/rules/` | Flat folder only. Subfolders are ignored. |
| `project/.agents/skills/*/SKILL.md` | `<repo>/.agents/skills/` | Multi-step workflows. Also usable as `/execute-prd-phase` and `/pre-handoff-review`. |

Also commit `PRD_INO_ERP_Antigravity.md` at the repo root so `AGENTS.md` can point to it.

## Rule files and activation

| File | `trigger` | Loads when |
|---|---|---|
| `security-trust-boundary.md` | `glob` | The agent touches `.gs`, `index_POS.html`, `dataService.ts`, `authService.ts`, `SettingsTab.tsx` |
| `google-apps-script.md` | `glob` | The agent touches `.gs` files |
| `react-typescript.md` | `glob` | The agent touches `src/**/*.ts(x)` |
| `money-stock-integrity.md` | `model_decision` | Stock, receivables, payables, cash, orders, void/return, tax, HPP |
| `ui-dashboard-i18n.md` | `model_decision` | Dashboard, charts, templates, formatting, i18n, CSV |
| `testing-and-done.md` | `model_decision` | Writing tests or finishing a task |
| `git-and-reporting.md` | `model_decision` | Committing or writing the final report |

## Things worth knowing

- Every file in `.agents/rules/` **must** start with YAML frontmatter with a valid snake_case `trigger` (`always_on`, `model_decision`, `glob`, `manual`). A missing or misspelled `trigger` makes Antigravity silently discard the rule.
- Limits: 24 KB per rule file, and a 20,000-token budget shared by global and `always_on` rules. These files are far below that. Keep it that way: short rules get followed, long rules get skimmed.
- Rules are cumulative. When rules conflict, the more specific directory rule wins.
- **Rules are not enforcement.** Users have reported agents ignoring rules. The real guarantees are the build, the tests, the `pre-handoff-review` skill, and your own review of each phase report. Treat rules as a strong hint and the checks as the law.
- Edit the `Language` line in `AGENTS.md` if you want the agent to reply to you in English instead of your own language.
