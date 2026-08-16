import { describe, expect, it } from "vitest";
import { cn } from "../../lib/utils.js";

describe("cn", () => {
	it("joins truthy class names", () => {
		expect(cn("px-2", "py-1")).toBe("px-2 py-1");
	});

	it("filters out falsy values", () => {
		expect(cn("a", false && "b", null, undefined, 0, "c")).toBe("a c");
	});

	it("resolves tailwind class conflicts in favor of the last value", () => {
		expect(cn("px-2", "px-4")).toBe("px-4");
	});

	it("accepts conditional object and array forms", () => {
		expect(cn({ "text-red-500": true, "text-blue-500": false }, ["p-4"])).toBe(
			"text-red-500 p-4",
		);
	});
});
