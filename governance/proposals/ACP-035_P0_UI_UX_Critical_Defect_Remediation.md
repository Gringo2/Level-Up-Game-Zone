# Proposal: ACP-035 P0 UI/UX Critical Defect Remediation (Negative Zero Elimination & Admin Layout Structure)
**Status:** Approved

## 1. Context and Problem Statement
During the comprehensive Senior UI/UX Design Audit ([UI_UX_Data_Presentation_Review.md](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/docs/reports/UI_UX_Data_Presentation_Review.md)), two critical (P0) data presentation defects were identified and verified with empirical visual and code evidence:
1. **Negative Zero False Alarms (`-$0.00`):** In `Dashboard.tsx` (lines 512, 523) and `Reports.tsx` (line 449), when pending credits or total expenses equal zero, the UI interpolates `-${0.toFixed(2)}` in bright warning red (`text-red-500` / `text-red-600`), rendering `-$0.00`. This mathematically invalid presentation causes immediate operator panic by signaling a negative deficit when the balance is clean.
2. **Structural DOM Nesting Defect in Admin Settings:** In `Admin.tsx` (lines 673-938), the `<Card>` containing the "Add Store Employee" form is accidentally nested inside the `<Card>` for "Manage Categories" before the outer card is closed. This renders the employee form with double borders and nested indentation.
3. **Column Header Unit Mismatch:** In `Reports.tsx` (line 855), the Game Sales logs table header hardcodes `Quantity (Mins)` despite game rates and sales measuring in `Hours` and `Games`.

## 2. Proposed Solution
1. **Negative-Safe Zero Rendering in Dashboard & Reports:**
   - In `Dashboard.tsx`:
     - Render `pendingCredits > 0 ? `-$${pendingCredits.toFixed(2)}` : "$0.00"` with conditional red styling only when `pendingCredits > 0` (neutral `text-zinc-900` on zero).
     - Render `totalExpenses > 0 ? `-$${totalExpenses.toFixed(2)}` : "$0.00"` with conditional red styling only when `totalExpenses > 0` (neutral `text-zinc-900` on zero).
     - Ensure safe variance display treats `Math.abs(variance) < 0.005` as `0.00` with neutral styling.
   - In `Reports.tsx`:
     - Render `totalExpenses > 0 ? `-$${totalExpenses.toFixed(2)}` : "$0.00"` with conditional red styling only when `totalExpenses > 0` (neutral `text-zinc-900` on zero).
     - Guard `avgVariance` and `totalVariance` against `-0.00`.
     - Update table header from `Quantity (Mins)` to `Quantity` to prevent unit mismatch.
2. **Correct Card Hierarchy in Admin Settings:**
   - In `Admin.tsx`, close the "Manage Categories" `<Card>` immediately after its `</CardContent>`.
   - Render the "Add Store Employee" `<Card>` as a clean sibling card at the root container level.
3. **Red-Green Test Validation:**
   - Prove red test failure in `Dashboard.test.tsx` verifying zero credits/expenses render as `$0.00` without negative signs or red warning classes.
   - Prove red test failure in `Admin.test.tsx` verifying sibling DOM hierarchy of cards.

## 3. Alternative Options
- **Global Currency Formatter Immediately:** Deferring P0 fixes until a complete monorepo currency refactor (P1) is conducted. Rejected because negative zero and broken DOM nesting are active defects impacting production appearance today; P0 defects must be remedied immediately.

## 4. Consequences
- **Positive:**
  - Zero balances look calm, professional, and mathematically accurate (`$0.00` in neutral styling).
  - Cashiers are not falsely alarmed by red deficits when registers have zero credits/expenses.
  - Admin Settings displays properly structured, aligned cards without broken nested borders.
  - Reports table headers accurately reflect units for PS4 and Pool.
- **Negative / Risks:**
  - Minimal; strictly UI presentation logic within existing components. 0 impact on server APIs or DB collections.

## 5. Affected Documents
- `governance/proposals/ACP-035_P0_UI_UX_Critical_Defect_Remediation.md`
- `governance/missions/M-127_P0_UI_UX_CRITICAL_DEFECT_REMEDIATION.md`
- `governance/MISSION.md`
- `governance/TASKS.md`
- `packages/client/src/pages/Dashboard.tsx`
- `packages/client/src/pages/Reports.tsx`
- `packages/client/src/pages/Admin.tsx`
- `packages/client/src/__tests__/pages/Dashboard.test.tsx`
- `packages/client/src/__tests__/pages/Reports.test.tsx`
- `packages/client/src/__tests__/pages/Admin.test.tsx`

## 6. Action Items
1. Formulate M-127 Mission document and obtain user review/approval.
2. Write red tests in `Dashboard.test.tsx`, `Reports.test.tsx`, and `Admin.test.tsx`.
3. Implement the fixes in `Dashboard.tsx`, `Reports.tsx`, and `Admin.tsx`.
4. Verify green test runs and full fitness checks (`tsc`, `lint`, `knip`, `vitest`).
5. Lock mission and hand off commit commands to user.
