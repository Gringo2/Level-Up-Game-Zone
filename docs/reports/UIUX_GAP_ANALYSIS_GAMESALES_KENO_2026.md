# UI/UX Gap Analysis — GameSales & Keno Presentation Layer

Date: 2026-08-22 | Method: full source read of both pages + schema/SDK empirical probes. Supplemental verification performed 2026-09-21. Every claim cites file:line or a probe result.

**Implementation status (updated 2026-09-22):** M-68 delivered A1, B1, B2, C1, C2. M-69 resolved the E-section layout asymmetry. M-78 resolved B3 and B4. M-86 resolved D1 and structural findings F1-F2. M-87 resolved B5. M-89 resolved G1. M-90 resolved G3. M-91 resolved G5. M-94 resolved the E-title-divergence. M-95 resolved C3. All findings in this audit are resolved.

## A. Data Integrity (verified by probe)
| # | Finding | Evidence | Severity |
| :-- | :--- | :--- | :--- |
| A1 | **[RESOLVED — M-68]** Keno silent $0 entries: bare `z.coerce.number()` accepts `null`/`""` as 0 (probe: `net_profit:null → ACCEPTED as 0`). Client chain permits it: garbage surviving `<input type=number>` ("--1", "1e-", paste) → truthy string passes `!netAmount` guard (Keno.tsx:143) → `parseFloat`=NaN → `JSON.stringify` emits `null` → server coerces to $0, 201 Created. GameSales is guarded (`positiveNumber`/`nonNegativeNumber` NaN-refine, schemas/index.ts:10-27) — asymmetry. Negative net must STAY legal (legit losing days; preview renders red, Keno.tsx:234). | schemas/index.ts:95 vs :52-54; probe output | HIGH |

## B. History-Browsing Gaps (M-67 follow-ons)
| # | Finding | Evidence | Severity |
| :-- | :--- | :--- | :--- |
| B1 | **[RESOLVED — M-68]** Keno rows are time-only — multi-day ranges cannot be read day-by-day; GameSales rows include the date | Keno.tsx:338 `"h:mm a"` vs GameSales.tsx:467 `"MMM d, h:mm a"` | MED-HIGH |
| B2 | **[RESOLVED — M-68]** No period summary — browsed range shows no entry-count or net total; Reports already computes identical aggregates | Reports.tsx:180-199; absent in both list cards | MEDIUM |
| B3 | **[RESOLVED — M-78]** From > To now shows an inline validation hint, disables Apply, and provides a Today reset | Keno.tsx and GameSales.tsx range controls | LOW-MED |
| B4 | **[RESOLVED — M-78]** List fetches now expose loading feedback and disable Apply while in flight | Keno.tsx and GameSales.tsx `listLoading` controls | LOW-MED |
| B5 (TD-032) | **[RESOLVED — M-87]** History lists now use bounded pagination with a Load older control | Keno.tsx and GameSales.tsx history controls | LOW |

## C. Interaction Safety
| # | Finding | Evidence | Severity |
| :-- | :--- | :--- | :--- |
| C1 | **[RESOLVED — M-68]** Row actions lack in-flight guards — Verify/Delete have no per-row pending flag; double-click fires duplicate DELETE (second 404s → spurious error toast). Edit-lock (`disabled={!!editingId}`) is correct | handleVerify/handleDelete Keno.tsx:96-121; GameSales.tsx:137-160 | MEDIUM |
| C2 | **[RESOLVED — M-68]** Generic error toasts hide server reasons — catch paths toast fixed strings, real error only via console.error (proven in 2026-08-22 hotfix RCA where user could not see actual cause) | e.g., Keno.tsx:193-196 | MEDIUM |
| C3 | **[RESOLVED — M-95]** Create/edit now validates active date range before retaining or prepending rows in GameSales and Keno | GameSales.tsx and Keno.tsx mutation handlers | LOW |

## D. Accessibility
| # | Finding | Evidence | Severity |
| :-- | :--- | :--- | :--- |
| D1 | **[RESOLVED — M-86]** Icon-only Delete buttons now have accessible labels, with the repo-wide button audit completed | GameSales.tsx and Keno.tsx delete controls | MEDIUM |
| D2 | Positives verified: all inputs have Label htmlFor↔id pairs; destructive deletes require ConfirmDialog reason; edit mode locks sibling rows; live net preview color semantics; sm: responsive row stacking; visibilitychange refetch | throughout both files | — |

## E. Consistency Notes
- **[RESOLVED — M-94]:** Keno form title now dynamically renders "New Entry"/"Edit Entry" matching GameSales.
- ~~Layout asymmetry~~ RESOLVED by M-69 — both pages now share the `lg:grid-cols-3` form/history grid.
- Currency formatting uniform (`toFixed(2)` inline) across both pages and Reports.

## Candidate Missions
| ID | Scope | Addresses | Status |
| :-- | :--- | :--- | :--- |
| P1 | Keno numeric guard: client-side parseFloat validation pre-submit + schema NaN-refine parity with sales helpers (keep negatives legal) | A1 | **DONE — M-68** (5747c15) |
| P2 | Keno row date display + range header summary (count · net) on both pages | B1, B2 | **DONE — M-68** (5747c15) |
| P3 | List-loading states (spinner/disable during fetch) + From>To guard & reset control | B3, B4 | **DONE — M-78** |
| P4 | Per-row action pending guards + surface `safeErrorMessage` text in toasts | C1, C2 | **DONE — M-68** (5747c15) |
| P5 | Repo-wide icon-button aria-label audit (extends beyond these two pages) | D1 | **DONE — M-86** |

## F. Structural Findings (post-M-68 review, 2026-08-22 — require PO decision)
Both are contract-level asymmetries discovered while answering "missing details in log history presentation"; neither is fixable client-only.

| # | Finding | Evidence | Fix scope if approved |
| :-- | :--- | :--- | :--- |
| F1 (TD-051) | **[RESOLVED — M-86]** GameSales now has a manager verification workflow, including shared field, server route/controller, badge, action, and audit behavior | M-86 contract and verification implementation | Shared type + server route/controller + client badge/button |
| F2 (TD-052) | **[RESOLVED — M-86]** GameSales persists and displays unit-aware labels with a legacy fallback for historical rows | M-86 unit_type implementation and client row rendering | Server persistence + display fallback |

## G. Supplemental UX Findings (verified 2026-09-21)

These findings were validated from the live client implementation and are recorded here as additional evidence for the product backlog.

| # | Finding | Evidence | Why it matters | Severity |
| :-- | :--- | :--- | :--- | :--- |
| G1 | **[RESOLVED — M-89]** Game Sales now rejects malformed/non-finite quantity input before submit while preserving valid decimals | GameSales parser and regression suite | HIGH |
| G2 | **[RESOLVED — M-78]** Invalid ranges now show recovery guidance, disable Apply, and support Today reset | Keno/GameSales range controls and regression suite | MEDIUM |
| G3 | **[RESOLVED — M-90]** Entry and range date defaults now use shop-local Addis-time helpers | `dateUtils.ts` and affected entry pages | MEDIUM |
| G4 | **[RESOLVED — M-78]** History fetches now provide loading feedback and prevent duplicate Apply actions | Keno/GameSales `listLoading` behavior | MEDIUM |
| G5 | **[RESOLVED — M-91]** History rows now prioritize amount/game signals, group metadata/status, and isolate actions responsively | M-91 row-grid implementation and 375px/1280px E2E checks | MEDIUM |

### Status
All identified presentation-layer gaps in this analysis (A1, B1–B5, C1–C3, D1, E, F1–F2, G1–G5) are now resolved and locked across Missions M-68 through M-95.

**Artifact source:** [packages/client/src/pages/GameSales.tsx](../client/src/pages/GameSales.tsx), [packages/client/src/pages/Keno.tsx](../client/src/pages/Keno.tsx), [packages/client/src/layouts/Layout.tsx](../client/src/layouts/Layout.tsx)
