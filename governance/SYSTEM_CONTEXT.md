# System Context

**What is Level-Up-Game-Zone?**
A web application monorepo managing point-of-sale, store credit, shifts, and keno for the game zone.

**Why does it exist?**
To provide a unified, secure, and robust platform for managing the physical store's transactions and employee operations.

**Current Phase:** Phase 5 — Maturation
**Current Mission:** M-87 Active Debt Resolution by Priority — Deploy Path (TD-018/019/023) + Firebase Init Hardening (TD-021/022) + Pagination (TD-032) + Hygiene/QA (TD-041/036) + Structured Logging (TD-024) + Breaking Majors (TD-013)
**Mission Status:** Verification (all gates green; pending PO commit → lock_guard)

**Current Architecture Version:** v1.0.0

**Locked Interfaces:**
- Express Backend API (v1.0.0)

**Active Constraints:**
- AI Implementor must follow the Engineering Constitution (`AGENTS.md`).
- Maintain Zero-Trust Thin Client architecture.
- All data mutations must route through Express API via centralized `API_BASE` (`VITE_API_URL` env variable with runtime fallback).
- Client must not use Firebase SDK for direct database reads or writes.

**System Boundaries & Ownership:**
*   **Express Backend** owns all database writes and transaction logic.
*   **React Frontend** owns presentation and state management.

**Forbidden Dependency Matrix:**
*   `packages/client/src` -> `packages/server/src` (Forbidden)
*   `packages/client/src` -> `firebase-admin` (Forbidden)
*   `packages/shared/src` -> `packages/client/src` (Forbidden)
*   `packages/shared/src` -> `packages/server/src` (Forbidden)

