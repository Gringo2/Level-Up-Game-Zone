# CURRENT MISSION

**Type:** Feature / UI Polish  
**Mission:** M-127 P0 UI/UX Critical Defect Remediation  
**Status:** Locked
**Proposal:** ACP-035  

## 1. Objective
Remediate the highest-priority (P0) data presentation defects identified in the Senior UI/UX Design Audit:
1. Eliminate negative zero (`-$0.00`) and false red alarms on zero balances in Dashboard and Reports.
2. Correct the accidental DOM card nesting defect in Admin Settings (`Add Store Employee` rendered inside `Manage Categories`).
3. Correct the game sales column header in Reports from `Quantity (Mins)` to `Quantity`.

## 2. Context & Root Cause
- In `Dashboard.tsx` and `Reports.tsx`, negative prefixes were unconditionally concatenated (`-${amount.toFixed(2)}`), rendering `-$0.00` in bright red when pending credits or expenses are zero. This creates visual panic and violates accounting presentation norms.
- In `Admin.tsx`, the `<Card>` for `Add Store Employee` was placed inside the `Manage Categories` card before the outer card was closed, leading to a broken double-bordered UI layout.
- In `Reports.tsx`, table header line 855 hardcoded `Quantity (Mins)` for game sales, which was a legacy leftover from the initial prototype and does not match game sales units.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/pages/Dashboard.tsx`: Safe zero formatting for pending credits, expenses, and variance.
  - `packages/client/src/pages/Reports.tsx`: Safe zero formatting for expenses and variances; update game sales table header.
  - `packages/client/src/pages/Admin.tsx`: Un-nest the `Add Store Employee` `<Card>` from the `Manage Categories` `<Card>`.
  - Red-Green unit tests in `Dashboard.test.tsx`, `Reports.test.tsx`, and `Admin.test.tsx`.
  - Governance tracking: `MISSION.md`, `SYSTEM_CONTEXT.md`, `TASKS.md`, `ROADMAP.md`, `M-127_Blast_Radius_Report.md`.
- **Out of Scope:**
  - Client-wide currency formatter refactor (allocated to follow-up P1 ACP).
  - Server controllers, database schemas, or Firestore rules.
  - Mutating git commands (Rule 1).

## 4. Execution & Verification Gates
- [x] Red-Green Test Verification: Proved failing assertions prior to implementation, followed by 100% green pass.
- [x] Layout Verification: Confirmed Manage Categories and Add Store Employee render as separate sibling cards.
- [x] Monorepo Fitness Gates: Biome lint (0 errors, 0 warnings), Knip (0 issues), clean TypeScript build across shared, client, and server.

## 5. Evidence Payload
- [x] Functional Verification: All 709 Vitest unit tests across 42 suites and 26 Playwright E2E tests passed 100% green.
- [x] Architectural Verification (AVP-001): Clean compilation across packages/client, packages/server, and packages/shared.
- [x] Dependency Graph Clean: Biome check (0 errors, 0 warnings) and Knip report zero unused dependencies or zombie exports.
- [x] ADR Compliance: Full compliance with ADR-001, ADR-006, and approved ACP-035.
- [x] Traceability: Authorized by ACP-035, documented in `M-127_Blast_Radius_Report.md`.
