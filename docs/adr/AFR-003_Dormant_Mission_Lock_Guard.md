# AFR-003: Dormant Mission Lock Guard — Keyword/Payload Format Drift (M-67..M-79)

## 1. Friction Source

- **Mechanism:** ACP-005 Enforced Pre-Commit Mission Lock (`.agents/scripts/lock_guard.sh` → `.agents/scripts/lock_mission.sh`, AVP-001 Gate 5)
- **Trigger commit:** `a3b2842` (M-79) landed with MISSION.md still `Active`
- **Discovered:** 2026-08-23 during post-commit verification (AI Implementor probe)

## 2. The Conflict

ACP-005 and `ENGINEERING_LIFECYCLE.md` guarantee: *"a complete mission can never be committed in Active state"* — the last pre-commit job must run the full AVP-001 lock suite and flip MISSION.md to `Locked` before acceptance.

In reality, `lock_guard.sh`'s fast pre-check requires checked-evidence lines matching ALL keywords: `Functional`, `Architectural|AVP`, `Dependency`, `ADR|Compliance`. Missions M-67 through M-79 use a compact two-line Evidence Payload (`Functional Verification…` / `AVP-001…`) that satisfies only two of the four keywords. The guard therefore hits its silent `exit 0` path on every recent commit: missions were committed `Active`, no lock suite ran, no evidence packets generated.

This conflicts with:
- `AGENTS.md` Rule 11 (Mission Completion Gates require AVP-001)
- `AGENTS.md` Rule 16 / Rule 26 (silent failures forbidden)
- ACP-005's core invariant (enforced path)

## 3. Evidence

Measured 2026-08-23, all commands executed locally:

1. `ls .agents/evidence_packets/ | sort | tail` → newest packet prior to remediation is `M-66.json`. No packets for M-67..M-78 despite all showing `Locked` in history.
2. Commit `a3b2842`: tree clean post-commit; `governance/MISSION.md` inside the commit reads `Status: Active`; no lock artifacts staged.
3. Manual `bash .agents/scripts/lock_mission.sh M-79` (initial compact payload): Gates 1–4 PASSED (biome check, tsc -b, vitest --coverage 470/470, Playwright 6/6), Gate 5 DENIED — output: `❌ Dependency Graph Clean — NOT checked` / `❌ ADR Compliance — NOT checked`.
4. Corroborating drift: `governance/SYSTEM_CONTEXT.md` mission pointer read `M-76` while `governance/MISSION.md` read `M-78 Locked` (pointer only refreshes via Gate 6, which had not run since M-76-era).
5. After expanding M-79 payload to the four-box format: re-run → ALL 6 GATES PASSED, `Locked`, `.agents/evidence_packets/M-79.json` generated.

## 4. Impact

- At least 12 missions (M-67..M-79-initial) locked without automated gate enforcement; "Locked" status rested on self-reported evidence only.
- The enforced-lock architecture (ACP-005) has been effectively dormant since the payload format changed; governance guarantees and reality diverged silently — precisely the failure mode Rule 26 exists to prevent.

## 5. Proposed Resolutions (Product Owner decision required)

- **(a) Template alignment:** restore the four-box payload format in `governance/proposals/MISSION_TEMPLATE.md` so every future mission satisfies the matcher naturally. Low effort, but brittle (keyword coupling remains).
- **(b) Matcher hardening:** change `lock_guard.sh` Gate-5 pre-check from keyword matching to structural matching — e.g., "Evidence Payload section contains ≥N checkboxes and zero unchecked `[ ]`" — decoupling it from prose wording.
- **(c) Fail-loud policy:** when status=`Active`, boxes appear complete, yet keywords don't match, emit a loud warning (or block) instead of `exit 0`.

**AI recommendation:** (b) + (c), Confidence Medium-High; (a) regardless as immediate hygiene.

## 6. Status

**Resolved (2026-08-23, M-84)** — Product Owner approved option (b)+(c): keyword matching replaced by structural check (≥1 checked box AND zero unchecked in Evidence Payload section); incomplete/no-checkbox Active missions now emit loud visible warnings instead of silent `exit 0`. All four branches proven in isolated fixture repo (complete→enforces, partial→loud-skip, no-boxes→warn, locked→silent). Template alignment unnecessary under structural matching.
