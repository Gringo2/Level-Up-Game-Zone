import { execSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const WAKE_SCRIPT = path.join(REPO_ROOT, ".agents/scripts/wake_summary.sh");
const MISSION_GATE = path.join(REPO_ROOT, ".agents/scripts/mission_gate.sh");

describe("Zero-Trust Infrastructure Metatests", () => {
	it("WAKE protocol should accurately extract the current mission status from MISSION.md", () => {
		const output = execSync(`bash ${WAKE_SCRIPT}`, {
			encoding: "utf-8",
			cwd: REPO_ROOT,
		});
		expect(output).toMatch(/\*\*Status:\*\*\s*(Active|Verification|Locked)/);
	});

	it("WAKE protocol should extract the active mission scope anchors", () => {
		const output = execSync(`bash ${WAKE_SCRIPT}`, {
			encoding: "utf-8",
			cwd: REPO_ROOT,
		});
		expect(output).toContain("ACTIVE MISSION SCOPE:");
		expect(output).toContain("- **In Scope:**");
	});

	it("mission_gate.sh should enforce Mandatory Section Validation and reject edits while the mission is Locked", () => {
		// This will fail if MISSION.md is structurally broken, but it should remain blocked
		// because the current locked mission is not allowed to edit protected boundaries.
		expect(() =>
			execSync(`bash ${MISSION_GATE} test_file.ts`, {
				encoding: "utf-8",
				cwd: REPO_ROOT,
			}),
		).toThrow();
	});
});
