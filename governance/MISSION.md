# CURRENT MISSION

**Mission:** M-41 Governance Housekeeping II — Evidence-Packet Versioning & SSOT Pointer Automation
**Status:** Locked

## 1. Objective
Fix two governance-tooling defects surfaced during M-38/M-39/M-40 (root-cause fixes, AGENTS.md Rule 27):
1. **Evidence-packet versioning:** `lock_mission.sh` currently overwrites `.agents/evidence_packet.json` on every lock (single slot). AFR-002 records that this already destroyed M-31/M-32 lock evidence. Fix: archive each mission's packet to `.agents/evidence_packets/<mission_id>.json` (mkdir -p + one additional `writeFileSync` reusing the `+ "\n"` trailing-newline fix so biome stays clean), keeping `.agents/evidence_packet.json` as the latest-pointer for backward compatibility. Zero code consumers of the packet were found by probe (2026-08-16) — blast radius is nil.
2. **SSOT mission-pointer automation:** `governance/SYSTEM_CONTEXT.md` drifted to "Current Mission: Mission 33" (7 missions stale) because the pointer has no automated maintenance. Fix: extend Gate 6 (SSOT) to stamp `Current Mission` (extracted from the MISSION.md `**Mission:**` line) and `Mission Status: Locked` into SYSTEM_CONTEXT.md at every lock — fixing the mechanism rather than one-off patching.

## 2. Evidence Payload
- [x] Functional — existing vitest integration suite (188) + 6 Playwright e2e re-verified by the AVP-001 gate run; success metric: packet written to both canonical + archive paths, pointer stamped by Gate 6, `biome check .` 0 warnings.
- [x] Architectural — zero architectural change; script/tooling-only; Proposal Gate (ACP-019) no-arch; AVP-001 depcruise 0 violations.
- [x] Dependency — no packages touched; no new dependencies.
- [x] ADR compliance — consistent with ADR-002 governance routing, AFR-002 remediation intent, and ENGINEERING_LIFECYCLE ACP-019 gates.

## 3. Scope & Boundaries
- **In Scope:** `.agents/scripts/lock_mission.sh` (packet archive write + Gate-6 pointer stamping); `.agents/evidence_packets/` archive (new); `governance/MISSION.md`, `governance/TASKS.md`, `governance/ROADMAP.md`; `governance/SYSTEM_CONTEXT.md` (pointer stamped by Gate 6 at lock).
- **Out of Scope:** other script behavior; biome.json rule configuration; production source; test logic; backfilling historical packets (prior packets remain only in git history — accepted, documented).

## 4. Referenced Architecture
- AGENTS.md Rule 27 (root-cause targeted fixes) and Rule 26 (blast-radius visibility: packet has zero code consumers — probed 2026-08-16).
- AFR-002 (documented single-slot packet damage, lines 44-62).
- ENGINEERING_LIFECYCLE.md ACP-019 gates; ADR-002 governance routing.

## 5. Verification Gates (Rule 11)
- [x] Functional Verification: lock run → archive + canonical packets both written with trailing newline; SYSTEM_CONTEXT pointer stamped; vitest + e2e green.
- [ ] AVP-001 Architecture Verification: pending.
- [x] Evidence Package: this document + TASKS/ROADMAP rows + the archived M-41 packet itself.
- [x] User Approval — approved 2026-08-16.
