import { describe, expect, it } from "vitest";

// TD-024: structured logger contract. Red until utils/logger.ts exists.

class MemorySink {
	public lines: string[] = [];
	write(chunk: string) {
		this.lines.push(chunk);
	}
}

describe("TD-024: structured logger", () => {
	it("defaults to info level", async () => {
		const { createLogger } = await import("../utils/logger.js");
		expect(createLogger({}).level).toBe("info");
	});

	it("honors LOG_LEVEL env override", async () => {
		const { createLogger } = await import("../utils/logger.js");
		expect(createLogger({ LOG_LEVEL: "error" }).level).toBe("error");
	});

	it("emits single-line JSON with msg and level fields", async () => {
		const { createLogger } = await import("../utils/logger.js");
		const sink = new MemorySink();
		const log = createLogger({}, sink as never);
		log.info("hello structured world");
		expect(sink.lines).toHaveLength(1);
		const parsed = JSON.parse(sink.lines[0]);
		expect(parsed.msg).toBe("hello structured world");
		expect(parsed.level).toBeDefined();
	});

	it("redacts configured sensitive keys", async () => {
		const { createLogger } = await import("../utils/logger.js");
		const sink = new MemorySink();
		const log = createLogger({}, sink as never);
		log.info({ authorization: "Bearer secret", idToken: "tok" }, "req");
		const out = sink.lines.join("");
		expect(out).not.toContain("Bearer secret");
		expect(out).not.toContain('"tok"');
	});
});
