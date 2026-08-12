# System Context

**What is Level-Up-Game-Zone?**
A web application monorepo managing point-of-sale, store credit, shifts, and keno for the game zone.

**Why does it exist?**
To provide a unified, secure, and robust platform for managing the physical store's transactions and employee operations.

**Current Phase:** Phase 5 — Maturation
**Current Mission:** Mission 15 — Employee Roster & Salary Reconciliation
**Mission Status:** Locked

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
