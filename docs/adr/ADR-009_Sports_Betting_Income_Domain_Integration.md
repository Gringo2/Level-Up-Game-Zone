# ADR-009: Sports Betting Income Domain Integration

**Status:** Proposed  
**Date:** 2026-09-23  
**Deciders:** Product Owner, AI Implementor  
**Governing Proposal:** ACP-028  

## Context
Level-Up Game Zone operates a sports betting terminal that produces daily net cash income. Previously, the system only accommodated Game Sales and Keno. In order to achieve full store cash accountability and drawer reconciliation, sports betting must be introduced as a primary income stream.

## Decision
1. **Shared Schema:** Define `SportsBettingLog` with `net_profit`, `user_id`, `user_name`, `date`, `verified`.
2. **Collection:** Store records in Firestore collection `sports_betting_logs` (`COLLECTIONS.SPORTS_BETTING_LOGS`).
3. **Shift Drawer Impact:** Register cash formula includes sports betting income:
   `expectedCash = opening_float + totalGameSales + totalKenoNet + totalSportsBettingNet - totalExpenses - pendingCredits`.
4. **Thin Client & Composition Root:** All sports betting writes route through Express backend at `/api/sports-betting` with transactional audit logging (`audit_logs`).
5. **RBAC:** Restricted to `[ROLES.ADMIN, ROLES.MANAGER]`.
6. **UI Integration:** Dedicated page `/betting`, Dashboard KPI card, Safe Slip printout line, and Reports revenue mix & ledger integration.

## Consequences
- **Positive:** Drawer variance calculations accurately reflect sports betting cash intake.
- **Positive:** Immutable audit trail records every create, edit, and deletion with mandatory operator reasoning.
- **Negative:** Increased surface area across backend, client state, and reports. Mitigated by mirroring established Keno patterns and comprehensive unit/integration test coverage.
