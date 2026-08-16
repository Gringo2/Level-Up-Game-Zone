# CURRENT MISSION

**Type:** Infrastructure
**Mission:** M-48 ACP-005 Pre-Commit Mission Lock
**Status:** Locked

## 1. Objective
Implement the enforced pre-commit mission lock (ACP-005): a completed mission (MISSION.md `Active` + all Evidence Payload boxes checked) must be flipped to `Locked` by the last pre-commit job before the commit is accepted — eliminating the separate manual `lock_mission.sh` step and the "commit passes, lock fails" failure mode (proven in M-47's tsc Gate-2 failure).

## 2. Evidence Payload
- [x] Functional — `.agents/scripts/lock_guard.sh` created and wired as the last `.husky/pre-commit` job; all 4 red-proof paths verified in a temp git repo with a stub lock script (ready-to-lock → triggers + stages Locked artifacts; unchecked box → silent; already Locked → silent; gate failure → commit blocked, exit 1, no partial staging).
- [x] Architectural — ACP-005 approved (Product Owner, 2026-08-17); flow documented in `ENGINEERING_LIFECYCLE.md`; zero production-source change; guard derives mission id from MISSION.md, no new arguments.
- [x] Dependency Graph Clean — no new imports or dependency changes; two new shell/governance files only.
- [x] ADR compliance — ACP-005 lifecycle (Draft → Approved → Implemented), AGENTS.md Rules 4/11/28, M-42 `**Type:**` convention (Infrastructure for `.agents/*` edits), ADR-006 knip advisory preserved unchanged in `lock_mission.sh`.

## 3. Scope & Boundaries
- **In Scope:** `.agents/scripts/lock_guard.sh` (new); `.husky/pre-commit` (append guard as last job); `governance/ENGINEERING_LIFECYCLE.md` (document flow); `governance/proposals/ACP-005_PreCommit_Mission_Lock.md` (status → Implemented).
- **Out of Scope:** `lock_mission.sh` behavior changes (unchanged, remains standalone tool); Gate-5 keyword leniency fix (flagged for future mission); production source; new dependencies.
- **Conventions:** guard is text-only fast pre-check (sub-second) before triggering the heavy 6-gate suite; `[x]`-anchored keyword matching (checked checkbox lines only).

## 4. Referenced Architecture
- ACP-005 (this mission), AGENTS.md Rule 4 (Change Control & Proposal Lifecycle), Rule 11 (Mission Completion Gates — commit is the User Approval moment), Rule 28 (Test-Negative red-proof), Rule 16 (Verification & Anti-Assumption).
- M-42 (`**Type:**` convention), M-44 (lint-staged hook hardening), ADR-006 (knip advisory), ADR-007 (hook lifecycle).

## 5. Verification Gates (Rule 11)
- [ ] Functional Verification: 4 red-proof paths executed and logged in ACP-005 §6; biome/tsc/knip clean post-change.
- [x] AVP-001 Architecture Verification: passed via lock gates.
- [ ] Evidence Package: this document + TASKS/ROADMAP rows + archived M-48 packet.
- [ ] User Approval — approved (ACP-005 approval, 2026-08-17).

## Deferred Decision (Rule 10)
- `lock_mission.sh` Gate 5 uses a lenient bare-keyword match (`grep -qi "\[x\].*ADR\|Compliance"`) that counts an unchecked box as checked when the line contains e.g. "Compliance". The new guard anchors to `[x]`-checkbox lines; the standalone lock script retains the lenient check. Reason: scope discipline (guard correctness was in-scope; lock-script hardening was not). Impact: manual `lock_mission.sh` runs may over-approve the evidence gate. Future mission: harden Gate 5 to `[x]`-anchored matching.
