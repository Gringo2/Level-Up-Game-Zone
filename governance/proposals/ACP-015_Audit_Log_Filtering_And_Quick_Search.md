# ACP-015: Client-Side Multi-Filter & Quick Search for Activity Audit Logs

## 1. Context and Problem Statement
Level-Up Game Zone maintains an immutable audit trail (`audit_logs`) recording every entity mutation (e.g. shift opens/closes, sales updates, credit deductions, user role promotions, expense creations).
Currently, `packages/client/src/pages/AuditLogs.tsx` fetches and renders these records in a flat, paginated list of 50 items at a time without any filtering or search capabilities.

As transaction volume grows:
1. Store administrators cannot isolate operations by mutation action (`CREATE`, `UPDATE`, `DELETE`).
2. Store administrators cannot filter by entity/table (`shifts`, `game_sales`, `keno_tickets`, `expenses`, `credits`, `employees`, `users`, `game_rates`, `expense_categories`).
3. Store administrators cannot quickly search for specific operator UIDs, keywords in change reasons (e.g. "coin discrepancy", "promotion", "stale shift"), or payload attributes.
4. When hundreds of logs are loaded, reviewing specific security or operational events requires tedious visual scanning.

## 2. Proposed Solution
Enhance `packages/client/src/pages/AuditLogs.tsx` with dedicated **Multi-Filter & Quick Search Controls**:

### A. Filter Controls
Add an administrative filter toolbar atop the audit card:
1. **Action Filter (`select` / buttons):**
   - Options: `ALL` (default), `CREATE`, `UPDATE`, `DELETE`.
2. **Collection / Table Filter (`select`):**
   - Options: `ALL` (default), plus common collections: `shifts`, `game_sales`, `keno_tickets`, `expenses`, `credits`, `employees`, `users`, `game_rates`, `expense_categories`, alongside any dynamically discovered table in the loaded log set.
3. **Keyword Quick Search (`input`):**
   - Real-time text search with clear button (`Search by operator, reason, or payload...`).
   - Evaluates operator UID, reason for change, table affected, and stringified payload objects case-insensitively.

### B. Summary Count & Reset
- Render an active counter: `Showing {filteredCount} of {totalCount} audit logs`.
- Provide a `Clear Filters` button whenever active filters (search query, action != ALL, or table != ALL) are applied.
- Handle filter empty state gracefully: when logs exist but none match filters, render `No activity logs match the selected filters.` with a quick-reset action.

### C. Architectural Bounds & Thin Client Preservation
- **Thin Client Architecture (ADR-001):** Operates 100% on the client presentation layer over already-loaded paginated audit logs.
- **Reusability Principle (Rule 25):** Reuses existing UI components (`Input`, `Button`, `Card`, lucide icons `Search`, `X`, `Filter`).
- **Zero Server Drift:** No backend schema or Firestore index changes needed.

## 3. Alternative Options
- **Option 1: Server-Side Query Parameters (`/api/audit-logs?action=...&table=...`)**
  - *Rejected:* Firestore requires composite indexes for inequality or ordering queries across multiple fields (`table_affected` + `timestamp desc`, `action` + `timestamp desc`), which adds Firestore index maintenance and deployment overhead. Client-side filtering over paginated chunks provides zero-latency response and free full-text payload search.

## 4. Consequences
- **Positive:**
  - Dramatically improves auditability, security investigations, and cashier accountability review.
  - Zero backend risk or deployment dependencies.
  - Instantaneous feedback as the administrator types or toggles filters.
- **Negative:**
  - Filtering currently applies to the loaded window of audit logs (up to the cursor page). Administrator can click `Load More` to ingest more logs into the filterable pool.

## 5. Affected Documents
- `governance/proposals/ACP-015_Audit_Log_Filtering_And_Quick_Search.md` (New)
- `governance/missions/M-107_AUDIT_LOG_FILTERING_AND_SEARCH.md` (New)
- `packages/client/src/pages/AuditLogs.tsx` (Component update)
- `packages/client/src/__tests__/pages/AuditLogs.test.tsx` (Unit test expansion)
- `governance/MISSION.md`
- `governance/TASKS.md`
- `governance/ROADMAP.md`
- `governance/SYSTEM_CONTEXT.md`
