import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import "./setupTests.js";
import app from "../app.js";

const { db } = await import("../firebase.js");

describe("Audit Logs Integration Tests", () => {
	const authHeader = "Bearer valid-mock-token";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Golden Path (Success Scenarios)", () => {
		it("should successfully list audit logs", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "audit_logs") {
					return {
						orderBy: vi.fn().mockReturnThis(),
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "log1",
									data: () => ({ table_affected: "users" }),
								},
							],
						}),
					} as any;
				}
				return { get: vi.fn().mockResolvedValue({ docs: [] }) } as any;
			});

			const response = await request(app)
				.get("/api/audit-logs")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body).toHaveLength(1);
			expect(response.body[0].id).toBe("log1");
		});
	});

	describe("Negative Path (Rejection Scenarios)", () => {
		it("should return 401 if authorization header is missing", async () => {
			const response = await request(app).get("/api/audit-logs");
			expect(response.status).toBe(401);
		});
	});
});
