# CURRENT MISSION

**Type:** Governance / Documentation  
**Mission:** M-115 Repository Governance & Lifecycle Documentation Hygiene  
**Status:** Locked  
**Proposal:** ACP-023  

## 1. Objective
Synchronize and correct identified documentation anomalies across repository governance and lifecycle specifications following the post-M-114 line-by-line audit:
1. Correct `RELEASE_READINESS.md` line 107 to reflect 6 moderate `qs` advisories per `npm audit` and `DEBT.md`.
2. Correct `ENGINEERING_LIFECYCLE.md` line 39 proposal pointer from ACP-019 to ACP-005.
3. Replace alien subsystem examples (`Observation Graph`, `Session Manager`, `Canvas Analyzer`, `Animation Detector`, `AI Summarizer`) in `ENGINEERING_LIFECYCLE.md` lines 75–76 with genuine Level-Up Game Zone subsystems.
4. Correct `AGENTS.md` line 132 ADR-001 reference from `Observation Graph` to `Thin Client Composition Roots` per Product Owner approval.
5. Update `SYSTEM_CONTEXT.md` current mission pointer to M-115.

## 2. Context
Following the sweep of stale prose in the repository after M-114, subtle discrepancies were catalogued in governance and lifecycle documents. Per the repository constitution (`AGENTS.md`), all changes must be traceable to an approved mission (M-115) and proposal (ACP-023).

## 3. Scope & Boundaries
- **In Scope:**
  - `governance/RELEASE_READINESS.md`
  - `governance/ENGINEERING_LIFECYCLE.md`
  - `governance/SYSTEM_CONTEXT.md`
  - `AGENTS.md`
  - `governance/TASKS.md`
  - `governance/ROADMAP.md`
  - `governance/MISSION.md`
  - `governance/proposals/ACP-023_Governance_Lifecycle_Documentation_Hygiene.md`
  - `governance/missions/M-115_GOVERNANCE_LIFECYCLE_HYGIENE.md`
- **Out of Scope:**
  - Runtime code modifications in `packages/client`, `packages/server`, or `packages/shared`.
  - Database schemas, API routes, or test implementations.
  - Git mutating operations.

## 4. Testing Strategy
- Monorepo fitness gates: `npm run lint`, `npm run knip`, `npm run build`, `npx vitest run`.
- Verification of documentation accuracy against active architecture documents and CLI audits.

## 5. Evidence Payload
- [x] Functional Verification: All targeted files strictly align with verified repository architecture and CLI audit output.
- [x] Monorepo Hygiene: Biome lint (0 errors, 0 warnings across 160 files), Knip (0 issues), TypeScript build clean, and Vitest suite (630/630 tests passing across 39 files).
- [x] Governance Traceability: ACP-023 approved, M-115 logged in TASKS.md and ROADMAP.md, and locked in MISSION.md.
