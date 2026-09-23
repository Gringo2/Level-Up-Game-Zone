/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { parseNetAmountInput } from "../../lib/inputUtils.js";

describe("parseNetAmountInput", () => {
	it("parses a valid positive decimal string", () => {
		expect(parseNetAmountInput("75.50")).toBe(75.5);
	});

	it("parses a valid negative decimal string (losing day)", () => {
		expect(parseNetAmountInput("-25.00")).toBe(-25);
	});

	it("parses zero", () => {
		expect(parseNetAmountInput("0")).toBe(0);
	});

	it("returns null for empty string", () => {
		expect(parseNetAmountInput("")).toBeNull();
	});

	it("returns null for whitespace-only string", () => {
		expect(parseNetAmountInput("   ")).toBeNull();
	});

	it("returns null for partial scientific notation garbage ('1e-')", () => {
		expect(parseNetAmountInput("1e-")).toBeNull();
	});

	it("returns null for double-negative ('--1')", () => {
		expect(parseNetAmountInput("--1")).toBeNull();
	});

	it("returns null for string 'null'", () => {
		expect(parseNetAmountInput("null")).toBeNull();
	});

	it("parses a valid integer string", () => {
		expect(parseNetAmountInput("100")).toBe(100);
	});

	// Red-Green boundary: verify NaN values are rejected
	it("returns null for 'NaN'", () => {
		expect(parseNetAmountInput("NaN")).toBeNull();
	});

	it("returns null for 'Infinity'", () => {
		expect(parseNetAmountInput("Infinity")).toBeNull();
	});

	it("returns null for alphabetic input", () => {
		expect(parseNetAmountInput("abc")).toBeNull();
	});
});
