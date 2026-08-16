# Proposal: ACP-005 Pre-Commit Mission Lock

**Status:** Implemented (2026-08-17)
**Lifecycle:** Draft → Discussion → **Approved** → **Implemented** → Closed
**Decision:** Approved — Product Owner directive (2026-08-17): **enforced, not advisory**. MISSION.md must be flipped to `Locked` as the last pre-commit job, before the commit is allowed to land.
**Mission:** M-48 ACP-005 Pre-Commit Mission Lock (Infrastructure)

## 1. Context and Problem Statement

The mission lifecycle requires an explicit `lock_mission.sh <MISSION_ID>` invocation as the final step before a mission can transition from `Active` to `Locked`. This run is the de-facto **User Approval moment** (AGENTS.md Rule 11) and executes the heavy 6-gate AVP-001 suite (biome, tsc, full vitest + coverage, Playwright e2e, knip, evidence-payload verification, SSOT stamping).

The current workflow for a completed mission is:

1. Implement all tasks.
2. Author the Evidence Payload in `governance/MISSION.md` (coverage numbers, ADR references) — the completion signal.
3. Commit the final changes.
4. Manually run `bash .agents/scripts/lock_mission.sh <MISSION_ID>`.
5. Commit the lock output (evidence packet + MISSION.md status flip).

Step 4 is **manual, unguarded, and redundant with the commit that precedes it**. Verified in M-47 (2026-08-17): the commit for the M-47 test suites passed pre-commit (biome + tsc + knip) but `lock_mission.sh` then **failed its Gate 2 (tsc)** on `App.test.tsx` / `UserManagement.test.tsx` because the suites imported only `vi` from `vitest` while using `describe`/`it`/`expect`/`beforeEach` as globals. The lock gates duplicate checks the commit already ran, but the commit had no way to know a lock was imminent. The only reason the failure was caught was the explicit manual lock run — and the fix required a second commit plus a third lock output commit.

Problem: the pre-commit hook gives **zero signal** that a mission appears complete-but-unlocked, so the operator discovers Gate failures at lock time — after the "final" commit — or forgets the lock step entirely, leaving `MISSION.md` stuck at `Active`.

**Product Owner directive:** the lock must not be a separate manual step. The pre-commit hook, as its last job, must run the lock gates and **flip `MISSION.md` to `Locked` before the commit is accepted**. A completed mission must never be committed in an `Active` state.

## 2. Proposed Solution

Add an **enforced lock job** as the **last job** of `.husky/pre-commit`, implemented as `.agents/scripts/lock_guard.sh`.

### 2.1 Completion detection (fast pre-check)

The guard inspects only `governance/MISSION.md` (sub-second, no test runs):

- `**Status:** Active` AND
- the Evidence Payload section has **all** `[x]` checkboxes (the 4 keywords: Functional, Architectural, Dependency, ADR — matching `lock_mission.sh` Gate 5's section-scoped check) AND
- a `**Mission:** M-NN` / `# CURRENT MISSION` id is parseable.

If any signal is absent, the guard **exits 0 silently** (mission mid-development, or already `Locked`) — regular commits stay fast.

### 2.2 Enforced lock run (triggered path)

When the pre-check detects a ready-to-lock mission:

1. Invoke `bash "$REPO_ROOT/.agents/scripts/lock_mission.sh <MISSION_ID>"`.
2. **On gate failure** → echo the failure block, **exit 1** → the commit is **blocked**. The M-47 failure mode moves from "manual lock step" into the commit itself: you cannot commit a completed-but-unverified mission.
3. **On gate success** → `lock_mission.sh` has already flipped `MISSION.md` to `Locked`, generated/stamped `.agents/evidence_packet.json` + `.agents/evidence_packets/M-<ID>.json`, and updated `SYSTEM_CONTEXT.md`. The guard then **stages these lock outputs** (`git add` the 4 files) so the in-flight commit contains the Locked state. Exit 0 → commit proceeds.

The commit itself is the **User Approval moment** (Rule 11): the human chooses when to commit the completed mission; the hook guarantees it lands already Locked.

### 2.3 Implementation notes

- The guard derives `MISSION_ID` from `MISSION.md` (the `**Mission:**` line), so no new argument is required from the operator.
- Runs **after** the existing knip job — it is the last pre-commit step.
- The guard script is repository infrastructure executed by the human's commit; the `git add` of lock outputs is performed by the hook, not by the AI implementor.
- `lock_mission.sh` is unchanged. It remains a standalone tool for manual/re-lock use; the guard simply invokes it at the correct time.
- Idempotency: once `MISSION.md` shows `Locked`, the 2.1 pre-check stops triggering, so the heavy suite is not re-run on subsequent commits.

## 3. Alternative Options

- **Advisory-only guard (warn, don't flip).** Considered and **rejected by Product Owner**: the operator explicitly directed that the flip must happen before commit, not merely be suggested.
- **Run the full lock suite on every commit unconditionally.** Rejected: the 6-gate suite (coverage + e2e, ~2 min) would run on every WIP commit and would attempt to lock mid-development. The 2.1 completion pre-check limits the heavy run to the final (evidence-complete) commit.
- **Status quo (manual `lock_mission.sh`).** Rejected: proven failure mode in M-47; redundant verification; lock can be forgotten.
- **Block every commit until a lock has run.** Rejected: cannot distinguish "ready to lock" from "boxes pre-checked during active work" and would stall normal development.

## 4. Consequences

- **Easier:** the final commit self-locks — no separate lock step, no "lock output" commit, and a completed mission can never be committed in `Active` state. A failed gate surfaces at commit time (M-47's tsc error would have blocked the commit instead of slipping through).
- **Harder:** the final commit of a mission takes ~2 min longer (coverage + e2e run inside pre-commit); a genuinely failing gate blocks the commit until fixed — by design. If the evidence payload is marked `[x]` prematurely during active work, the heavy run triggers early (and will block until gates pass).
- **Discipline preserved:** the heavy AVP-001 verification still runs before `Locked` is stamped; only the *orchestration* (who/when invokes it) changes.

## 5. Affected Documents

- `.agents/scripts/lock_guard.sh` (new)
- `.husky/pre-commit` (append lock_guard invocation as last job)

## 6. Action Items

- [x] Create `.agents/scripts/lock_guard.sh` implementing 2.1/2.2 (completion pre-check; invoke `lock_mission.sh`; block on gate failure; stage lock outputs on success).
- [x] Wire it as the last job in `.husky/pre-commit`.
- [x] Red-proof (Rule 28):
  - Ready-to-lock (`Active` + all evidence `[x]`) → guard triggers and stages Locked state; assert `MISSION.md` flipped + lock artifacts staged. **Verified** (stub `lock_mission.sh`, temp git repo): guard ran lock, flipped status, staged 4 artifacts, exit 0.
  - Not ready (any signal absent) → guard silent, exit 0, no side effects. **Verified**: unchecked ADR box → silent, status stays Active.
  - Already `Locked` → guard silent, exit 0. **Verified**.
  - Gate failure path → guard exits 1 (commit blocked), no partial staging. **Verified** (stub exiting 1): commit blocked, status stays Active, nothing staged.
- [x] Verify no interference with the normal pre-commit jobs (biome/tsc/knip) on non-final commits.
- [x] Document the flow in `ENGINEERING_LIFECYCLE.md` (mission transitions now include the enforced pre-commit lock).
