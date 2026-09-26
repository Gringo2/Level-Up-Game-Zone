# M-131 Blast Radius Report: WCAG 2.1 AA Contrast Hardening

**Mission:** M-131  
**Proposal:** ACP-039  
**Date:** September 26, 2026  
**Auditor:** AI Implementor  

---

## 1. Executive Summary
Mission M-131 promotes secondary text nodes on light backgrounds from `text-zinc-400` (#a1a1aa, 2.43:1 contrast ratio) to `text-zinc-500` (#71717a, 4.61:1 contrast ratio) across client pages. This ensures full compliance with WCAG 2.1 SC 1.4.3 (Contrast Minimum, Level AA) while eliminating illegibility under store lighting.

---

## 2. Structural Blast Radius Analysis

### 2.1 Impacted Client Pages
- `packages/client/src/pages/Reports.tsx`: KPI card titles (`CardTitle`) and microcopy footer notes (`mt-1 text-xs`).
- `packages/client/src/pages/SalaryReport.tsx`: Employee hire date, calculation notes, truncation hints.
- `packages/client/src/pages/AuditLogs.tsx`: Empty state search hint, raw payload cell text.
- `packages/client/src/pages/Credits.tsx`: Customer phone/info, borrowed/due date metadata.
- `packages/client/src/pages/Admin.tsx`: Rate history metadata span.
- `packages/client/src/pages/Dashboard.tsx`: Top card extra games count indicator.
- `packages/client/src/pages/GameSales.tsx`: Sales history row timestamp.
- `packages/client/src/pages/Keno.tsx`: Keno history row timestamp and secondary detail.
- `packages/client/src/pages/SportsBetting.tsx`: Betting history row timestamp.
- `packages/client/src/pages/Expenses.tsx`: Expense history row timestamp and truncation hint.

### 2.2 Unaffected Subsystems
- **Express Backend:** 0% blast radius. Zero controllers, routes, models, or middleware modified.
- **Shared Contracts:** 0% blast radius. Zero types, schemas, or validators modified.
- **Database/Firestore:** 0% blast radius. Zero mutations or queries modified.
- **Dark Mode / Sidebar Surfaces:** Unaffected (`Layout.tsx`, dark shift management card, and `ErrorBoundary.tsx` maintain their high-contrast light-on-dark text).

---

## 3. Regression Containment Strategy
- Add unit test assertions in affected page test suites verifying that secondary metadata elements render with `text-zinc-500` and do not contain failing `text-zinc-400`.
- Verify full Red-Green cycle before locking.
- Execute full AVP-001 pipeline: Biome check, TypeScript check (`tsc -b`), Vitest unit tests with coverage, Playwright E2E suite, and Knip dead code analysis.
