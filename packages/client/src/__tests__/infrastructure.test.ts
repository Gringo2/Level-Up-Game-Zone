import { execSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(__dirname, "../../../../");
const WAKE_SCRIPT = path.join(REPO_ROOT, ".agents/scripts/wake_summary.sh");
const MISSION_GATE = path.join(REPO_ROOT, ".agents/scripts/mission_gate.sh");

describe("Zero-Trust Infrastructure Metatests", () => {
	it("WAKE protocol should accurately extract Active Status from MISSION.md", () => {
		const output = execSync(`bash ${WAKE_SCRIPT}`, {
			encoding: "utf-8",
			cwd: REPO_ROOT,
		});
		expect(output).toContain("**Status:** Active");
	});

	it("WAKE protocol should extract the active mission scope anchors", () => {
		const output = execSync(`bash ${WAKE_SCRIPT}`, {
			encoding: "utf-8",
			cwd: REPO_ROOT,
		});
		expect(output).toContain("ACTIVE MISSION SCOPE:");
		expect(output).toContain("- **In Scope:**");
	});

	it("mission_gate.sh should enforce Mandatory Section Validation and allow edits when Active", () => {
		// This will fail if MISSION.md is structurally broken (missing ## 3. Scope & Boundaries) or is not Active
		const result = execSync(`bash ${MISSION_GATE} test_file.ts`, {
			encoding: "utf-8",
			cwd: REPO_ROOT,
		});
		expect(result).toContain("MISSION GATE: Status=Active. Edits permitted.");
	});
});
