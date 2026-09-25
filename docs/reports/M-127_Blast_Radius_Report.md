# Structural Blast Radius Report: Mission M-127
**Mission:** M-127 P0 UI/UX Critical Defect Remediation  
**Proposal:** ACP-035  
**Date:** September 24, 2026  
**Auditor:** System Implementor  

---

## 1. Executive Summary
Mission M-127 targets three high-priority visual presentation and layout defects across the React client application:
1. Eliminating negative zero (`-$0.00`) and false red warnings on zero balances in `Dashboard.tsx` and `Reports.tsx`.
2. Restructuring the DOM layout in `Admin.tsx` to un-nest the `Add Store Employee` `<Card>` from the `Manage Categories` `<Card>`.
3. Updating the Game Sales table column header in `Reports.tsx` from `Quantity (Mins)` to `Quantity`.

---

## 2. File & Component Dependency Analysis

### 2.1 Direct Mutations
| Target File | Scope of Change | Downstream Dependencies |
| :--- | :--- | :--- |
| `packages/client/src/pages/Dashboard.tsx` | Conditional negative formatting for `pendingCredits`, `totalExpenses`, and `variance`. | `packages/client/src/App.tsx` (Route consumer) |
| `packages/client/src/pages/Reports.tsx` | Conditional negative formatting for `totalExpenses` and variances; table header string fix. | `packages/client/src/App.tsx` (Route consumer) |
| `packages/client/src/pages/Admin.tsx` | Closing `Manage Categories` `<Card>` before opening `Add Store Employee` `<Card>`. | `packages/client/src/App.tsx` (Route consumer) |

### 2.2 Boundary Invariants Check
- **Zero-Trust Thin Client:** No server or database access keys touched. Preserved.
- **Express Backend API:** 0 controller or route modifications. Preserved.
- **Shared Constants:** 0 modifications to `packages/shared`. Preserved.
- **Fitness Functions:** All test suites, Biome checks, Knip checks, and build steps remain isolated to client page rendering.

---

## 3. Test Coverage & Negative Gating (Rule 28)
- `packages/client/src/__tests__/pages/Dashboard.test.tsx`:
  - Add explicit test case: zero credits and zero expenses must render `$0.00` in neutral styling (`text-zinc-900`) without a negative sign or `text-red-500`.
- `packages/client/src/__tests__/pages/Reports.test.tsx`:
  - Add explicit test case: zero expenses renders `$0.00` in neutral styling; table header renders `Quantity` without `(Mins)`.
- `packages/client/src/__tests__/pages/Admin.test.tsx`:
  - Add explicit test case: `Manage Categories` card and `Add Store Employee` card are rendered as independent sibling cards.
