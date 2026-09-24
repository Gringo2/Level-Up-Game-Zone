# M-125 Blast Radius & Plan Correctness Report

**Mission:** M-125 Credits Yesterday & Date Filter Presets  
**Proposal:** ACP-033  
**Generated:** 2026-09-24  
**Status:** Pre-Execution Architecture & Correctness Review  

---

## 1. Changed-File Manifest

### Client Presentation Layer (1 Terminal Leaf Page)
1. `packages/client/src/pages/Credits.tsx`
   - **Changes:**
     - Import `getShopYesterdayString`, `getShopStartOfDay`, and `getShopEndOfDay` from `../lib/dateUtils`.
     - Initialize `filterDateFrom` and `filterDateTo` state (defaulting to today's shop date).
     - Add `listLoading` state for query feedback.
     - Add `From` and `To` date pickers, alongside `Today` and `Yesterday` buttons in the card header.
     - Send `startDate` and `endDate` ISO strings to `GET /api/credits`.
     - Update `CardDescription` with period-aware contextual description.
     - Add active range summary banner (`data-testid="credits-range-summary"`).
     - Enforce ACP-020 range guard on local credit creation.
   - **Downstream consumers:** 0 (Routed terminal leaf in `App.tsx`).

### Test Files (1 File)
1. `packages/client/src/__tests__/pages/Credits.test.tsx`
   - Add Red-Green test asserting `Yesterday` and `Today` preset buttons update date bounds, contextual description, and API query parameters.

---

## 2. Structural Dependency & Blast Radius Containment Analysis

```mermaid
graph TD
    App[App.tsx Router] --> Credits[Credits.tsx (Isolated Leaf)]
    dateUtils[lib/dateUtils.ts (Additive/Pure)] -.-> Credits
    Credits --> BackendAPI["Express GET /api/credits?startDate=...&endDate=...&employee_id=..."]
    BackendAPI --> Firestore[(Firestore 'credits' Collection)]

    subgraph Untouched Subsystems
        Server["Express Controllers & Schemas (0 changes)"]
        Shared["@level-up/shared Types & Constants (0 changes)"]
        OtherPages["Dashboard, Reports, Expenses, Sales, Keno, Betting (0 changes)"]
    end
```

### Blast Radius Assessment
| Layer | Direct Changes | Indirect Impact | Risk Level |
|---|---|---|---|
| Server / Express API | None (`creditsController.ts` already handles range queries) | None | Zero |
| Database / Firestore | None (Indexes `date DESC` and `employee_id ASC, date DESC` already exist) | None | Zero |
| Shared Types (`@level-up/shared`) | None | None | Zero |
| Client Date Utility (`dateUtils.ts`) | None (reusing existing helpers) | None | Zero |
| Client Route Pages | 1 terminal leaf component (`Credits.tsx`) | None | Minimal (isolated UI) |

---

## 3. Plan Correctness & State Safety Verification

1. **Backend & Query Correctness**:
   - `creditsController.ts` accepts `startDate` and `endDate`, applying `where("date", ">=", startDate)` and `where("date", "<=", endDate)`.
   - `firestore.indexes.json` indexes `(employee_id ASC, date DESC)` and `date DESC`, covering all filtered query combinations.

2. **Test Invariant Safety**:
   - Form date input uses `id="entryDate"` (`Label: "Date"`). Filter inputs use `id="creditFilterFrom"` (`Label: "From"`) and `id="creditFilterTo"` (`Label: "To"`). Zero label collisions.
   - Combobox count remains invariant (exactly 2).
   - Default empty state text `<p>No credits logged yet.</p>` preserved.

3. **Responsive Containment**:
   - Control bar uses `flex flex-wrap items-center gap-2 mt-2 sm:mt-0`. Inputs wrap gracefully without horizontal container blowout.

---

## 4. Test-Negative / Red-Green Gating Strategy (Rule 28)

1. **Step 1 (Red Phase)**: Write unit test in `Credits.test.tsx` querying for `Yesterday` and `Today` buttons and verifying their behavior. Execute `vitest` to capture failure proof.
2. **Step 2 (Green Phase)**: Implement the toolbar and range queries in `Credits.tsx`.
3. **Step 3 (Green Verification)**: Re-run `Credits.test.tsx` to confirm 100% pass.
4. **Step 4 (Full Verification)**: Run full suite (unit tests, Playwright E2E suite, Biome lint, Knip, and TypeScript monorepo build).
