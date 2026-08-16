# CURRENT MISSION

**Type:** Governance
**Mission:** M-44 Hook & Script Hardening — AVP-Flip Regex + Real lint-staged Gate
**Status:** Locked

## 1. Objective
Close two recorded deferrals from the M-43 review trail:
1. **Harden the AVP checkbox flip regex** in `.agents/scripts/lock_mission.sh` (line 230) from the exact string `- [x] AVP-001 Architecture Verification: passed via lock gates.
2. **Wire the dormant lint-staged gate:** `.husky/pre-commit` calls `npx lint-staged`, but `package.json` declares `"lint-staged": { "*.{ts,tsx,js,jsx,json}": [] }` — a no-op; only `tsc` + `knip` actually gate commits. Replace the empty command array with `["biome check --write --no-errors-on-unmatched"]` so every staged source file is linted/formatted to the M-40 zero-warning standard at commit time.

## 2. Evidence Payload
- [x] Functional — hardened regex flips a deliberately non-canonical AVP line in a `/tmp` probe (variant flips to `[x]`; canonical `pending.` still flips); lint-staged executes biome on staged files (probe: `npx lint-staged` reports running biome on staged `vitest.config.ts`; command form verified against biome 2.5.6).
- [x] Architectural — zero production-source change; tooling + governance only (lock_mission.sh, package.json, governance records); AVP-001 depcruise 0 violations; no new dependencies.
- [x] Dependency — no packages added; lint-staged + @biomejs/biome already present in root devDependencies (Rule 25 — reuse, no reinvention).
- [x] ADR compliance — ADR-007 guardrail intent (hook enforcement, not documentation-only); AGENTS.md Rule 28 (Red-Green gating for the regex fix), Rule 16 (verification by execution probes), Rule 27 (targeted root-cause fix).

## 3. Scope & Boundaries
- **In Scope:** `.agents/scripts/lock_mission.sh` (AVP-flip regex only); `package.json` (lint-staged biome command only); `governance/MISSION.md`, `governance/TASKS.md`, `governance/ROADMAP.md`.
- **Out of Scope:** pre-commit additions beyond lint-staged (tsc/knip already present — unchanged); evidence-packet versioning follow-ups; SYSTEM_CONTEXT pointer work; production source; new dependencies; Playwright runs inside the hook; `.husky/pre-commit` content changes.

## 4. Referenced Architecture
- AGENTS.md Rule 10 (No Silent TODOs — closure of the recorded deferral), Rule 16 (Verification & Anti-Assumption), Rule 27 (Deterministic Debugging — targeted fix), Rule 28 (Test-Negative Validation — Red-proof of the regex), Rule 25 (Reusability — no new tooling).
- ADR-007 (mission_gate guardrail — this mission declares `**Type:** Governance` per M-42 convention).
- ENGINEERING_LIFECYCLE.md ACP-019 gates; M-42 Type-field convention; M-43 Deferred Decision record.

## 5. Verification Gates (Rule 11)
- [x] Functional Verification: regex Red-proof probe passes (variant flips, canonical flips); lint-staged biome command executes successfully against staged file; `biome check .` clean (0 warnings), `tsc -b` 0 errors, vitest suite green at lock.
- [x] AVP-001 Architecture Verification: passed via lock gates.
- [x] Evidence Package: this document + TASKS/ROADMAP rows + archived M-44 packet.
- [x] User Approval — approved 2026-08-16 (mission selection: "Hook & script hardening").

## Deferred Decision (Rule 10)
- **Deferred:** none introduced by M-44. Prior deferrals resolved by this mission: (a) AVP-flip regex hardening (M-43 Deferred Decision — now implemented); (b) dormant lint-staged gate (review observation trail — now wired).
- **Remaining deferred from prior records:** evidence-packet versioning follow-ups and SYSTEM_CONTEXT pointer items remain open for a future governance mission; page-level unit coverage remains out of scope by design (Playwright e2e covers pages).

## Review Resolution (pre-commit, 2026-08-16)
Post-lock review observations for M-44 resolved before the Product Owner commit:
1. **First lock attempt failed Gate 1 (P1):** single-line lint-staged array `["biome check --write --no-errors-on-unmatched"]` is non-canonical under biome's JSON formatter (wants multi-line). Root cause identified from the Gate-1 boundary report and fixed with the canonical multi-line form; second lock run passed all 6 gates. No production effect.
2. **Red-proof of the hardened regex:** `/tmp` probe proved the OLD regex leaves `pending (flipped by lock script).` un-flipped (M-43 failure mode) while the NEW prefix-anchored regex flips both the variant and canonical `pending.` lines and leaves already-`[x]` lines untouched. Probe file deleted (Rule 23).
3. **lint-staged wiring verified:** config parses (`lint-staged` run), biome command form executes cleanly (`biome check --write --no-errors-on-unmatched` against real files), `--no-errors-on-unmatched` flag confirmed present in biome 2.5.6.
