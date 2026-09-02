# Architecture Plan: Level-Up Game Zone

**Version:** 1.0.0
**Status:** Frozen & Governed
**Last Updated:** 2026-09-02

---

## 1. Architecture Overview

Level-Up Game Zone is a point-of-sale (POS) and daily gaming lounge management system structured as a decoupled TypeScript monorepo. It operates on a strict **Zero-Trust Thin Client** model backed by an authoritative Express.js REST API and Firestore persistence.

```
+----------------------------------------------------------------+
|                   packages/client (Thin Client)                |
|  - React 19 + Vite + TailwindCSS                               |
|  - Firebase Client Auth (Token Issuance Only)                  |
|  - Zero direct Firestore read/write capabilities               |
+-------------------------------+--------------------------------+
                                |  Authenticated HTTP / Bearer JWT
                                v
+----------------------------------------------------------------+
|               packages/server (Composition Root)               |
|  - Express REST API (CORS allowlist, Helmet, Rate Limiting)    |
|  - Firebase Admin SDK (Authoritative Firestore CRUD & Auth)    |
|  - Domain Validation (Zod schemas, finite math, safe errors)   |
|  - Immutable Audit Trail (db.runTransaction)                   |
+-------------------------------+--------------------------------+
                                |
                                v
+----------------------------------------------------------------+
|                 packages/shared (Domain Baseline)              |
|  - Pure TypeScript interfaces, collection names, constants     |
+----------------------------------------------------------------+
```

---

## 2. Core Architectural Decisions

1. **ADR-001 (Thin Client Composition Roots):** React frontend never directly accesses Firestore admin credentials or SDK database mutators. All reads and mutations route through Express endpoints (`/api/*`).
2. **ADR-003 (Reusability & Anti-Reinvention):** Reuse mature ecosystem dependencies (pino for structured logging, express-rate-limit for security, Zod for schema validation).
3. **ADR-004 (Observability & Traceability):** Structured JSON logging across all backend operations with automatic redaction of sensitive credentials.
4. **ADR-005 (Deterministic Debugging):** Root cause analysis (RCA) and non-destructive targeted fixes instead of trial-and-error mutations.
5. **ADR-006 (Test Negative Gating):** Mandatory negative path coverage and time-deterministic test suites using scoped fake timers (`vi.setSystemTime`).
6. **ADR-008 (Non-Blocking Shifts & Backdated Entry):** Shift operations do not hard-block daily historical review; backdated financial entries are explicitly timezone-anchored (`Africa/Addis_Ababa`, UTC+3).

---

## 3. Core System Boundaries & Interfaces

| Component | Responsibility & Interface Scope |
| :--- | :--- |
| **`@level-up/shared`** | Pure contracts: `AppUser`, `Employee`, `GameRate`, `GameSalesLog`, `KenoLog`, `Credit`, `Expense`, `Shift`, `AuditLog`, `COLLECTIONS`, `ROLES`, `ROOT_ADMIN_EMAILS`. |
| **`@level-up/server`** | Authoritative REST API: `/api/shifts`, `/api/sales`, `/api/keno`, `/api/expenses`, `/api/expense-categories`, `/api/rates`, `/api/credits`, `/api/employees`, `/api/users`, `/api/audit-logs`, `/api/health`, plus SPA static hosting. |
| **`@level-up/client`** | Presentation layer: Dashboard, POS GameSales, Keno, Expenses, Credits, Employee Roster & Salary Report, Admin Configuration, User Management, Activity Audit Logs, Analytics Reports. |

---

## 4. Deployment & Infrastructure

- **Containerization:** Multi-stage Dockerfile (`node:22-slim`) with non-root execution (`USER node`) and unified build/start pipeline.
- **Firebase Initialization:** Multi-tier credential resolution order (`GOOGLE_APPLICATION_CREDENTIALS` -> `SERVICE_ACCOUNT_KEY_PATH` -> local key file) with actionable startup failure guards (`FirebaseConfigError`).
