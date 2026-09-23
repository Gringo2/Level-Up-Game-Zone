# Proposal: ACP-029 Sports Betting E2E Suite & Mobile Ergonomics Hardening

## 1. Context and Problem Statement
In Mission M-120 (ACP-028 / ADR-009), the Sports Betting income stream was integrated into the application full-stack, including client UI (`/betting`), server API, drawer calculations, Dashboard KPI, and Reports.

To guarantee operational longevity, prevent regressions, and ensure touch usability in real-world retail store conditions:
1. **End-to-End Browser Automation Gap**: While unit tests cover the component and controller layers (T-1 to T-7), there is currently no Playwright E2E suite covering the live `/betting` route, role guards, modal interactions, or multi-step CRUD workflows in an actual browser environment.
2. **Mobile & Tablet Touch Ergonomics**: Retail cashiers and managers frequently operate on mobile tablets and phones. The Sports Betting net entry input lacks `inputMode="decimal"`, which hinders quick mobile keyboard entry. Furthermore, the history date range toolbar can experience cramped button wrapping on narrow 320px–375px mobile viewports if not explicitly hardened against horizontal container expansion.

## 2. Proposed Solution

### 2.1 Mobile & Tablet Touch Ergonomics Hardening (`packages/client/src/pages/SportsBetting.tsx`)
1. **Virtual Keypad Optimization**:
   - Add `inputMode="decimal"` to the `#net` input so mobile/tablet browsers automatically display the dedicated numeric keypad with decimal support.
2. **Responsive Date Range Toolbar**:
   - Harmonize the From/To date filter layout using `min-[400px]:flex-row` and `w-full min-[400px]:w-auto` button wrapping (following the proven pattern in Expenses/Reports M-111).
   - Ensure the Apply and Today buttons stretch cleanly on mobile (`flex-1 min-[400px]:flex-initial`) with touch-friendly 36px/40px height targets.
3. **Responsive Container Containment**:
   - Guarantee zero horizontal scroll blowout (`main.scrollWidth <= main.clientWidth + 1`) across all standard mobile and tablet viewports (320px, 375px, 768px, 1280px).

### 2.2 Playwright E2E Suite Expansion (`tests/e2e/sports_betting_flow.spec.ts`)
Create a hermetic, resilient E2E test suite covering:
1. **RBAC Isolation**:
   - Staff role navigating to `/betting` is blocked and redirected to `/`.
   - Sports Betting nav link is hidden from staff in both the desktop sidebar and mobile navigation drawer.
2. **Manager / Admin Logging Flow**:
   - Manager navigates to `/betting` via sidebar link.
   - Enters positive net income (e.g. `$125.00`), clicks submit, verifies history list insertion and period summary calculation.
   - Enters negative net loss (e.g. `-$35.50`), clicks submit, verifies red-styled negative net row.
3. **Verification Workflow**:
   - Manager clicks `Verify` on an unverified entry; verifies visual transition to the green `Verified` badge.
4. **Edit Workflow with Reason**:
   - Manager clicks `Edit`, edits the amount, provides a mandatory `editReason`, and submits; verifies updated values.
5. **Delete Workflow with Confirmation Safeguard**:
   - Manager clicks `Delete`, fills in mandatory `deleteReason` in the confirmation dialog, and confirms; verifies deletion and summary update.
6. **Multi-Viewport Responsive Verification**:
   - Asserts zero overflow across 320x568, 375x812, 768x1024, and 1280x800 viewports.

## 3. Alternative Options
- **Rely solely on Vitest unit tests (Rejected)**: Unit tests with mock DOM cannot catch layout overflow, CSS viewport wrapping issues, or actual browser routing and modal dismissal quirks.
- **Manual QA only (Rejected)**: Regressions would go undetected across subsequent mission refactors.

## 4. Consequences
- **Positive**: Comprehensive automated end-to-end regression protection for the Sports Betting feature.
- **Positive**: Effortless, fast decimal input on mobile devices for store staff and managers.
- **Positive**: Bulletproof layout across narrow phones (320px) through tablets (768px) and desktop displays.

## 5. Affected Documents
- `packages/client/src/pages/SportsBetting.tsx`
- `tests/e2e/sports_betting_flow.spec.ts` (new)
- `governance/MISSION.md`
- `governance/SYSTEM_CONTEXT.md`
- `governance/TASKS.md`
- `governance/ROADMAP.md`

## 6. Action Items
1. Formalize Mission M-121 under ACP-029.
2. Apply touch ergonomics and responsive enhancements to `SportsBetting.tsx`.
3. Create `tests/e2e/sports_betting_flow.spec.ts` with complete E2E scenario coverage.
4. Run all unit and E2E tests (`npx vitest run`, `npx playwright test`).
5. Run monorepo fitness gates (`npm run lint`, `npm run knip`, `npm run build`).
6. Lock M-121 with full evidence payload.
