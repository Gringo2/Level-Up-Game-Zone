# Roadmap: Level-Up-Game-Zone

## Phase 1 & 2 — Backend Refactoring
*   [x] **Mission 1:** Express Setup & Controllers
*   [x] **Mission 2:** Firebase Client Eradication

## Phase 3 — Firestore Lockdown
*   [x] **Mission 3:** Restrict Firestore Rules (allow read, write: if false)

## Phase 4 — Client Refactoring
*   [x] **Mission 4:** Extract App.tsx into pages/ and layouts/
*   [x] **Mission 5:** Refactor Auth State Management

## Phase 5 — Maturation
*   [x] **Mission 6:** E2E Testing Strategy
*   [x] **Mission 7:** Technical Debt Resolution
*   [x] **Mission 8:** Domain Validation & Server Hardening
*   [x] **Mission 9:** System Stability & Crash Resilience
*   [x] **Mission 10:** Resolve lint warnings and any types
*   [x] **Mission 11:** Not separately recorded in git history — MISSION.md jumps M-10 → M-14 inside commit `1d5ebbe`; no trace in branches, reflog, dangling objects, or full-text search
*   [x] **Mission 12:** Whitelist User Invites
*   [x] **Mission 13:** Reactive State Synchronization
*   [x] **Mission 14:** Reactive State Synchronization (completion, grouped with M-12/13 in commit `1d5ebbe`)
*   [x] **Mission 15:** Store Employee Roster & Structured Credit Salary Reconciliation
*   [x] **Mission 16:** Net Payroll Payout Dashboard
*   [x] **Mission 17:** Shift Backend Guard (grouped with M-16 in commit `40178f4`)
*   [x] **Mission 18:** User Account Deletion & Invite Revocation
*   [x] **Mission 19:** Governance Framework Maturation (.agents 10/10 MVP)
*   [x] **Mission 20:** Interprocedural Taint Tracking Engine (`.agents/scripts/taint_tracer.ts`)
*   [x] **Mission 21:** ADR-007 Antigravity Specification Hooks Lifecycle
*   [x] **Mission 22:** Native Antigravity JSON Decisions & PreInvocation/Stop Hooks
*   [x] **Mission 23:** 100% Antigravity Specification Convergence
*   [x] **Mission 24:** Unified Inspect-File Composite CLI Endpoint
*   [x] **Mission 25:** Engineering Constitution Synchronization (v1.9.0)
*   [x] **Mission 26:** Root `.gitignore` Credential Hardening
*   [x] **Mission 27:** Stale Shift Tracking
*   [x] **Mission 28:** Antigravity Hook Fixes
*   [x] **Mission 29:** Shift Auto-Open Logic
*   [x] **Mission 30:** Shift Auto-Open Concurrency Race Resolution
*   [x] **Mission 31:** Backend Testing Architecture Rebuild (supertest integration)
*   [x] **Mission 32:** Backend Coverage Completion (re-verified 2026-08-14, AFR-002)
*   [x] **Mission 33:** Backend Coverage Completion — Shifts & Users Controllers (2026-08-14)
*   [x] **Mission 34:** Backend Coverage Completion — Expenses & AuditLogs Controllers (2026-08-14)
*   [x] **Mission 35:** Backend Coverage Completion — Final 4 Controllers (2026-08-14)
*   [x] **Mission 36:** Backend Coverage Completion — App Composition Root & Schemas (2026-08-15)
*   [x] **Mission 37:** Backend Coverage Completion — Shifts & Users Branch Gaps (2026-08-16; work shipped inside M-38 commit `5c5256d`)
*   [x] **Mission 38:** ACP-004 Dead Guard Removal (2026-08-16)
*   [x] **Mission 39:** Governance Housekeeping — M-37 closure, ROADMAP sync, TD-009 (2026-08-16)
*   [x] **Mission 40:** Zero-Lint-Warning Cleanup — `biome check .` 62 → 0 warnings (2026-08-16)
*   [x] **Mission 41:** Governance Housekeeping II — Evidence-Packet Versioning & SSOT Pointer Automation (2026-08-16)
*   [x] **Mission 42:** Mission Record Standardization — AVP Checkbox Flip & Type-Field Convention (2026-08-16)
*   [x] **Mission 43:** Client Coverage — Un-ghost `.tsx` Suites & Add Client Coverage Gate (2026-08-16)
*   [x] **Mission 44:** Hook & Script Hardening — AVP-Flip Regex + Real lint-staged Gate (2026-08-16)
*   [x] **Mission 45:** Client Page Unit Coverage — Cohort 1: Dashboard, AuditLogs, Expenses, GameSales, Keno (2026-08-16)
*   [x] **Mission 46:** Client Page Unit Coverage — Cohort 2: Admin, Credits, EmployeeRoster, Reports, SalaryReport, Layout (2026-08-17)
*   [x] **Mission 47:** App & UserManagement Unit Coverage (2026-08-17)
*   [x] **Mission 48:** ACP-005 Pre-Commit Mission Lock — enforced pre-commit lock guard (2026-08-17)
*   [x] **Mission 49:** Client Coverage — close AuthContext/ShiftContext/Credits/EmployeeRoster gaps + raise contexts/pages thresholds (2026-08-17)
*   [x] **Mission 50:** Shift Non-Blocking + Backdated Data Entry — remove MissedDataBlocker, add date pickers (2026-08-17)

*Note: M-11 has no lock commit or mission-labeled commit anywhere in git history (branches, reflog, dangling objects, and full-text search were all probed on 2026-08-14). Its true scope is not recoverable from repository history without Product Owner clarification. M-19's title was extracted from its lock commit `859a428`.*

## Phase 6 — Production Readiness (Planned)
*   [x] **Mission 51:** RBAC Enforcement — `requireRole()` middleware, server-side role checks on all 20+ endpoints, staff blocked from manager/admin routes (TD-025/037/043) — completed via M-75/M-76-era work; verified closed in DEBT 2026-08-25
*   [x] **Mission 52:** Data Integrity — server-side total verification (GameSales, Keno), credit `reason` type fix, editReason schema fix (TD-026/028/029/035) — completed via M-62/M-63/M-76; verified closed in DEBT 2026-08-25
*   [x] **Mission 53:** Employee-User Boundary Decision — employees are roster/payroll records, while system users are auth/role records; managers/admins may also be employees, and any user↔employee linkage is an explicit bridge recorded only when the same person holds both roles. TD-038/039/040 remain deferred only for the explicit mapping policy between an employee record and a privileged auth account, not for the core rule that the identities are distinct unless intentionally bridged.
*   [x] **Mission 54:** Security Hardening — CORS lockdown, helmet, rate limiting, error message sanitization (TD-010/011/012/014) — completed via M-65 (sanitization) + M-86 (transport hardening)
*   [ ] **Mission 55:** Dependency & Transport Security — npm audit fix, Vite/react-router-dom updates, HTTPS default (TD-013/015; TD-017 resolved by removal in M-80) — non-breaking surface cleared in M-86 (esbuild via tsx bump; HTTPS-default already satisfied by M-82 fail-fast rule); remainder = TD-013 upstream-blocked dependency mission (tracked as active infrastructure/infra risk, not app code)
*   [x] **Mission 56:** Deployment Infrastructure — Dockerfile, root build/start scripts, static file serving, Firebase config externalization (TD-016/018/019/021/022/023) — completed via M-87 except TD-016 (single PO git command pending). The app path is verified; TD-016 remains outside AI scope.
*   [x] **Mission 57:** Business Logic Fixes — Reports net profit, SalaryReport date filter, shift close audit log (TD-027/030/031) — implemented scope is closed: TD-027 and TD-031 are delivered and verified; TD-030 is parked under the deferred shift-identity decision and tracked separately in DEBT rather than as a code regression.
*   [x] **Mission 58:** Scalability — server-side date filtering, pagination, Firestore index definitions (TD-032/033/034) — TD-033/034 earlier; TD-032 via M-87
*   [x] **Mission 59:** Observability — structured logger, admin email externalization (TD-020/024) — TD-020 earlier; TD-024 via M-87 (pino)
*   [x] **Mission 60:** RBAC Test Coverage — E2E tests for staff API blocking, manager route restrictions, invite flow (TD-036) — shipped via M-87; TD-036 is explicitly closed in DEBT with the expanded RBAC E2E matrix.
