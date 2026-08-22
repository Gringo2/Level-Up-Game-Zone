# UI/UX Gap Analysis — GameSales & Keno Presentation Layer

Date: 2026-08-22 | Method: full source read of both pages + schema/SDK empirical probes. Every claim cites file:line or a probe result. Analysis only — no code changed; fixes require PO-approved missions.

## A. Data Integrity (verified by probe)
| # | Finding | Evidence | Severity |
| :-- | :--- | :--- | :--- |
| A1 | **Keno silent $0 entries**: bare `z.coerce.number()` accepts `null`/`""` as 0 (probe: `net_profit:null → ACCEPTED as 0`). Client chain permits it: garbage surviving `<input type=number>` ("--1", "1e-", paste) → truthy string passes `!netAmount` guard (Keno.tsx:143) → `parseFloat`=NaN → `JSON.stringify` emits `null` → server coerces to $0, 201 Created. GameSales is guarded (`positiveNumber`/`nonNegativeNumber` NaN-refine, schemas/index.ts:10-27) — asymmetry. Negative net must STAY legal (legit losing days; preview renders red, Keno.tsx:234). | schemas/index.ts:95 vs :52-54; probe output | HIGH |

## B. History-Browsing Gaps (M-67 follow-ons)
| # | Finding | Evidence | Severity |
| :-- | :--- | :--- | :--- |
| B1 | **Keno rows are time-only** — multi-day ranges cannot be read day-by-day; GameSales rows include the date | Keno.tsx:338 `"h:mm a"` vs GameSales.tsx:467 `"MMM d, h:mm a"` | MED-HIGH |
| B2 | **No period summary** — browsed range shows no entry-count or net total; Reports already computes identical aggregates | Reports.tsx:180-199; absent in both list cards | MEDIUM |
| B3 | **From > To silently yields empty** — no cross-field guard, no inline hint, no reset-to-today affordance | Keno.tsx:285-311, GameSales.tsx:417-443 | LOW-MED |
| B4 | **No list-fetch feedback** — Apply/initial/visibility refetch has zero loading indication; `Loader2` exists only on form submit in both pages; Apply stays clickable during flight | Keno.tsx:262, GameSales.tsx:394 (only usages) | LOW-MED |
| B5 | **Unbounded rendering** — `logs.map` mounts every doc in range; no pagination/virtualization (cost scales with chosen window) | Keno.tsx:320, GameSales.tsx:452 | LOW |

## C. Interaction Safety
| # | Finding | Evidence | Severity |
| :-- | :--- | :--- | :--- |
| C1 | **Row actions lack in-flight guards** — Verify/Delete have no per-row pending flag; double-click fires duplicate DELETE (second 404s → spurious error toast). Edit-lock (`disabled={!!editingId}`) is correct | handleVerify/handleDelete Keno.tsx:96-121; GameSales.tsx:137-160 | MEDIUM |
| C2 | **Generic error toasts hide server reasons** — catch paths toast fixed strings, real error only via console.error (proven in 2026-08-22 hotfix RCA where user could not see actual cause) | e.g., Keno.tsx:193-196 | MEDIUM |
| C3 | Create/edit prepends row without range re-check — backdated entry appears under a non-matching filter until next refetch (pre-existing, documented in M-67 review) | setLogs prepend paths | LOW |

## D. Accessibility
| # | Finding | Evidence | Severity |
| :-- | :--- | :--- | :--- |
| D1 | **Icon-only Delete button unlabeled** — Trash2 ghost button has no `aria-label`/`sr-only`; screen readers announce an unnamed button | grep aria-label/sr-only in both pages: 0 hits; GameSales.tsx:484-492, Keno.tsx:380-388 | MEDIUM |
| D2 | Positives verified: all inputs have Label htmlFor↔id pairs; destructive deletes require ConfirmDialog reason; edit mode locks sibling rows; live net preview color semantics; sm: responsive row stacking; visibilitychange refetch | throughout both files | — |

## E. Consistency Notes
- Card-title convention diverges: Keno form title static "Daily Keno Entry" vs GameSales dynamic "New Entry"/"Edit Entry" (GameSales.tsx:304).
- Layout asymmetry (Keno stacked max-w cards vs GS lg:grid-cols-3) reads as deliberate density choice, not defect.
- Currency formatting uniform (`toFixed(2)` inline) across both pages and Reports.

## Candidate Missions (require PO approval — none implemented)
| ID | Scope | Addresses |
| :-- | :--- | :--- |
| P1 | Keno numeric guard: client-side parseFloat validation pre-submit + schema NaN-refine parity with sales helpers (keep negatives legal) | A1 |
| P2 | Keno row date display + range header summary (count · net) on both pages | B1, B2 |
| P3 | List-loading states (spinner/disable during fetch) + From>To guard & reset control | B3, B4 |
| P4 | Per-row action pending guards + surface `safeErrorMessage` text in toasts | C1, C2 |
| P5 | Repo-wide icon-button aria-label audit (extends beyond these two pages) | D1 |
