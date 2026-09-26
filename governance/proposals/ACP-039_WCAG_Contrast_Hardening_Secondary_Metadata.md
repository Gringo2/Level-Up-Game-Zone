# Proposal: ACP-039 WCAG 2.1 AA Contrast Hardening for Secondary Metadata

## 1. Context and Problem Statement
In the Senior UI/UX Design Audit (`docs/reports/UI_UX_Data_Presentation_Review.md`, Section 1.5), widespread usage of `text-zinc-400` (#a1a1aa) on white/light backgrounds (#ffffff) was identified. 
Empirical contrast calculations:
- `text-zinc-400` on `#ffffff` yields a contrast ratio of **2.43:1**.
- WCAG 2.1 Success Criterion 1.4.3 (Contrast Minimum, Level AA) mandates a minimum contrast ratio of **4.5:1** for normal text (< 18pt / 14pt bold).
- As a consequence, crucial secondary metadata—including card titles and microcopy, timestamps, hire dates, audit log payloads, customer info, and table descriptions—is washed out and difficult to read under harsh retail lighting or on budget POS tablet displays.

## 2. Proposed Solution
Promote secondary text on light backgrounds from `text-zinc-400` to `text-zinc-500` (#71717a), which provides a contrast ratio of **4.61:1** against `#ffffff`, satisfying WCAG 2.1 AA requirements while preserving modern visual hierarchy.
Targeted pages and components:
- `Reports.tsx`: KPI card titles and subtitle microcopy (`text-zinc-400` -> `text-zinc-500`).
- `SalaryReport.tsx`: Hire dates, calculation notes, and truncation hints.
- `AuditLogs.tsx`: Empty state hint copy and raw payload text.
- `Credits.tsx`: Loan metadata, issue dates, and customer details.
- `Admin.tsx`: Rate history metadata.
- `Dashboard.tsx`: Top card extra games count indicator (`text-[11px] text-zinc-500`).
- Entry pages (`GameSales.tsx`, `Keno.tsx`, `SportsBetting.tsx`, `Expenses.tsx`): Row timestamps and secondary inline metadata.

Note: Elements residing on dark containers (`bg-zinc-900` or `bg-zinc-950`, such as the main navigation sidebar, dark dashboard shift card, and error boundary) already exceed 4.5:1 contrast against dark backgrounds and remain untouched.

## 3. Alternative Options
- **Alternative A: Change to `text-zinc-600` (7.0:1)**. While achieving AAA compliance, `text-zinc-600` flattens visual hierarchy by making secondary copy nearly as dark as primary body copy (`text-zinc-900`).
- **Alternative B: Retain `text-zinc-400`**. Rejected as a known WCAG 2.1 AA failure and an identified operator fatigue factor.

## 4. Consequences
- **Positive:** Full WCAG 2.1 AA compliance for text elements; significantly improved legibility in retail/POS environments; consistent visual hierarchy.
- **Trade-offs:** Minimal design diff; zero logic, API, database, or state management alterations.

## 5. Affected Documents
- `packages/client/src/pages/Reports.tsx`
- `packages/client/src/pages/SalaryReport.tsx`
- `packages/client/src/pages/AuditLogs.tsx`
- `packages/client/src/pages/Credits.tsx`
- `packages/client/src/pages/Admin.tsx`
- `packages/client/src/pages/Dashboard.tsx`
- `packages/client/src/pages/GameSales.tsx`
- `packages/client/src/pages/Keno.tsx`
- `packages/client/src/pages/SportsBetting.tsx`
- `packages/client/src/pages/Expenses.tsx`
- Client unit tests validating contrast styling

## 6. Action Items
1. Establish Red test proofs validating WCAG 2.1 AA compliance on targeted secondary metadata elements.
2. Update identified light-background secondary text elements from `text-zinc-400` to `text-zinc-500`.
3. Verify all tests turn green.
4. Run full monorepo AVP-001 fitness functions (Biome, TypeScript, Vitest, Playwright, Knip).
5. Lock Mission M-131 via lock script.
