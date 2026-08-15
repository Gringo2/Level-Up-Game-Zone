import request from "supertest";
import { describe, expect, it } from "vitest";
import "./setupTests.js";
import app from "../app.js";

describe("App Composition Root Integration Tests", () => {
	describe("Health Check Endpoint", () => {
		it("returns 200 with service status", async () => {
			const response = await request(app).get("/api/health");

			expect(response.status).toBe(200);
			expect(response.body).toEqual({
				status: "ok",
				message: "Server is running properly!",
			});
		});
	});

	describe("Global Error Handler", () => {
		it("returns 500 for malformed JSON body (express.json SyntaxError)", async () => {
			const response = await request(app)
				.post("/api/expenses")
				.set("Authorization", "Bearer valid-mock-token")
				.set("Content-Type", "application/json")
				.send("{invalid-json");

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});
	});
});
