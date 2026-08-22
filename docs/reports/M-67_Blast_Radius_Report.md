# M-67 Blast Radius Report — Game-Log History Browsing on Entry Pages

Date: 2026-08-22 | Verified by direct probe; no assumptions.

## Change Surface (git-verified: tree contains exactly this footprint)
| Layer | Files | Change |
| :--- | :--- | :--- |
| Client pages | `Keno.tsx`, `GameSales.tsx` | ranged GET (`startDate`/`endDate`, shop-day bounds via `getShopStartOfDay/EndOfDay(date)`), From/To pickers + Apply defaulting to today; period-aware titles/descriptions/empty states. Keno: fetch-all+client-filter removed. GameSales: monolithic loader split into rates (mount-once) + sales logs (ranged callback) |
| Server tests | `kenoController.test.ts`, `salesController.test.ts` | +1 range test each: behavioral exclusion proof — mock Firestore honors captured `where("date", ">="/"<=")` bounds and an out-of-range doc must be absent from the response |
| Client tests | `Keno.test.tsx`, `GameSales.test.tsx` | +2 each: initial-load param assertions (URL carries encoded shop-day bounds) and Apply-refetch flows asserting exact expected bounds (computed via shared dateUtils for tz-safety) + range wording swap |
| Governance | `DEBT.md`, `MISSION.md`, `TASKS.md` | TD-046 documented → mission record |

## Containment Evidence
- **Zero server source changes:** `git status` shows no modifications under `packages/server/src/controllers|routes|schemas`; endpoints already accepted `startDate`/`endDate` (grep-proven pre-mission). ADR-001 upheld — client only expresses query intent.
- **Consumer enumeration:** `loadKenoLogs`/`loadSalesLogs` referenced only within their own page modules (depcruise: no new cross-module edges — dependency count unchanged at 147 modules).
- **Entry forms untouched:** Sales/Keno POST/PUT paths and edit flows byte-identical (only list-fetch section refactored); backdated-entry behavior (ADR-008 adjacency) unaffected.
- **Rates loader isolation (GameSales):** rates now fetched once per mount instead of on every visibility/Apply reload — reduces redundant reads; rate-dependent form logic (`selectedRate`, defaults) unchanged.

## Red-Green Evidence (Rule 28)
- **Client (natural Red):** prior code issued parameterless GETs (`/api/keno`, `/api/sales?startDate=<today>` for sales was already ranged; keno fetched all); new URL-param assertions structurally could not pass against the old keno path.
- **Server exclusion tests:** mocks filter only when the controller invokes `where()` with bounds; an implementation ignoring range params returns both docs → `[in-range]` assertion fails. Call-shape-only assertions were rejected in favor of this behavioral form.
- **No over-mocking:** only external side-effect (Firestore/network via `authFetch`) mocked; internal module boundaries untouched.

## Gates
vitest 435/435 (34 files) → re-run post-test-hardening: server suites 43/43 | tsc -b both = 0 | knip = 0 | depcruise "no dependency violations (147 modules, 439 dependencies)" | Biome all touched = 0.

Final state certified after full re-run at mission close.

## Review Pass (2026-08-22 — correctness & containment, probe-based)

**Containment re-verified:** `git status` = exactly the 10 mission paths; zero modifications under `packages/server/src/{controllers,routes,schemas}`; depcruise edge delta (+4) fully attributable to new test-file imports.

**Empirical contract probes (transient tsx/node scripts in /tmp/opencode, deleted after run):**
1. `COLLECTIONS.KENO_LOGS = "keno_logs"` / `GAME_SALES_LOGS = "game_sales_logs"` — matches test mock literals.
2. Both `createKeno` and sale-create persist `date: new Date(...).toISOString()` → uniform ISO strings; Firestore `where("date", ">="/"<=")` lexicographic comparison is chronologically sound for this format.
3. `DateRangeQuerySchema.safeParse({startDate, endDate})` → accepted (optional strings); non-string rejected — client-encoded bounds pass `validateQuery`.
4. Handler decoupling: edit/delete/create mutate `logs` via local `setLogs` — independent of the hoisted ranged loaders; no stale-closure regression surface.

**Finding — host-TZ sensitivity (pre-existing systemic trait, documented not changed):**
Probe under `TZ=UTC`: `getShopStartOfDay(new Date("2026-08-01T00:00:00"))` → `2026-08-01T00:00:00.000Z` (=03:00 Addis; window shifted +3h vs true shop day). Under `TZ=Africa/Addis_Ababa` (shop runtime): → `2026-07-31T21:00:00.000Z`→`2026-08-01T20:59:59.999Z` = exactly the true Addis day, byte-identical to Reports' inline `+03:00` construction. Root cause: `startOfDay(toZonedTime(d, tz))` truncates via host-local getters. This trait predates M-67 (all existing no-arg "today" usages across entry pages share it); Reports.tsx is the only host-independent construction. Production impact nil for shop browsers set to Africa/Addis_Ababa. **Not remediated in-mission** (architecture-level date-handling decision requires PO approval). Candidate future proposal: normalize all bounds through explicit-offset construction or fix dateUtils to be host-independent; also consider aligning Reports.tsx onto shared helpers once fixed.
Related note: client tests assert param *wiring* using the same helpers (pass under any host TZ by construction); they intentionally do not pin absolute Addis instants.

**Minor pre-existing observations (unchanged by M-67, no action):**
- Create/edit prepends the mutated log into the visible list without range re-check — a backdated entry created while viewing "today" appears until next refetch.
- GameSales `loadingRates` is cleared by whichever loader finishes first (rates effect or sales callback) — affects only the no-games banner timing, cosmetically.

Post-review certification: vitest 435/435 (34 files) | tsc=0 | Biome=0 | footprint unchanged (10 paths).
