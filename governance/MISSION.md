# CURRENT MISSION

**Type:** Governance
**Mission:** M-42 Mission Record Standardization — AVP Checkbox Flip & Type-Field Convention
**Status:** Locked

## 1. Objective
Close the review observations recorded at M-41 lock (2026-08-16):
1. **AVP checkbox flip at lock:** `lock_mission.sh` stamps `**Status:** Locked
2. **`**Type:**` field convention:** `mission_gate.sh` requires `**Type:** Governance|Infrastructure` before permitting `.agents/*` edits (line 41-47), but mission records never declare it — M-41's own `lock_mission.sh` edits would have been denied by the guardrail. Fix: document the mandatory field in ENGINEERING_LIFECYCLE.md (extending ACP-019, no new governance artifact per Frozen Governance), add a non-fatal lock-time warning when the field is absent, and model the convention in this M-42 record (`**Type:** Governance`).
3. **Packet `commitHash` quirk (documented, no change):** the evidence packet records HEAD at lock time — before the Product Owner commits — so it always points at the prior commit. Inherent to the lock-before-commit workflow; consistent with all prior packets. Accepted.

## 2. Evidence Payload
- [x] Functional — existing vitest integration suite (188) + 6 Playwright e2e re-verified by the AVP-001 gate run; success metric: checkbox flipped at lock, no Type warning, `biome check .` 0 warnings.
- [x] Architectural — zero architectural change; script/tooling-only; Proposal Gate (ACP-019) no-arch; AVP-001 depcruise 0 violations.
- [x] Dependency — no packages touched; no new dependencies.
- [x] ADR compliance — consistent with ADR-002 governance routing, ADR-007 guardrail intent (mission_gate Type enforcement), and ENGINEERING_LIFECYCLE ACP-019 gates.

## 3. Scope & Boundaries
- **In Scope:** `.agents/scripts/lock_mission.sh` (AVP checkbox flip + Type-field warning); `governance/ENGINEERING_LIFECYCLE.md` (Type-field convention); `governance/MISSION.md`, `governance/TASKS.md`, `governance/ROADMAP.md`.
- **Out of Scope:** retrofitting locked records (M-39/40/41 — committed and guardrail-blocked); packet commitHash design; other script behavior; production source.

## 4. Referenced Architecture
- AGENTS.md Rule 27 (root-cause targeted fixes) and Rule 3 (ENGINEERING_LIFECYCLE.md is not a frozen artifact — convention extends ACP-019).
- ADR-007 (mission_gate guardrail Type enforcement).
- ENGINEERING_LIFECYCLE.md ACP-019 gates; ADR-002 governance routing.

## 5. Verification Gates (Rule 11)
- [x] Functional Verification: lock run → §5 AVP checkbox flipped `[x]`; Type-field warning absent; vitest + e2e green.
- [x] AVP-001 Architecture Verification: passed via lock gates.
- [x] Evidence Package: this document + TASKS/ROADMAP rows + archived M-42 packet.
- [x] User Approval — approved 2026-08-16.
