# Proposal: ACP-030 Reports Yesterday Date Filter Preset

## 1. Context and Problem Statement
On the Historical Reports page (`/reports`), operators can select common relative date presets to quickly analyze performance:
- `Today`
- `This Week`
- `This Month`
- `Last 7 Days`
- `Last 30 Days`

In physical retail shop operations, analyzing the previous day's shift and sales performance first thing in the morning is one of the most frequent workflows. Currently, operators must manually enter yesterday's date into both the `From` and `To` input fields and click `Apply`. The page lacks a one-click `Yesterday` preset button.

## 2. Proposed Solution
1. In `packages/client/src/pages/Reports.tsx`:
   - Compute `yesterdayStr` from `shopToday` using `subDays(shopToday, 1)` and `toShopDateStr`.
   - Add `{ label: "Yesterday", from: yesterdayStr, to: yesterdayStr }` directly following `Today` in the `presets` array.
2. In `packages/client/src/__tests__/pages/Reports.test.tsx`:
   - Add a unit test verifying that the "Yesterday" button renders, and clicking it updates the date inputs and triggers report loading for yesterday's range.

## 3. Alternative Options
- **Leave manual selection (Rejected)**: Causes daily operational friction for store managers reviewing the previous day's numbers.

## 4. Consequences
- **Positive**: One-click access to the previous day's financial breakdown (revenue, keno, sports betting, expenses, credits, shifts).
- **Positive**: Consistent with the existing preset architecture and shop timezone calculations.

## 5. Affected Documents
- `packages/client/src/pages/Reports.tsx`
- `packages/client/src/__tests__/pages/Reports.test.tsx`
- `governance/MISSION.md`
- `governance/SYSTEM_CONTEXT.md`
- `governance/TASKS.md`
- `governance/ROADMAP.md`

## 6. Action Items
1. Formalize Mission M-122 under ACP-030.
2. Add Red test for "Yesterday" preset button in `Reports.test.tsx`.
3. Add `Yesterday` preset in `Reports.tsx`.
4. Verify Green test and run fitness gates.
5. Lock M-122.
