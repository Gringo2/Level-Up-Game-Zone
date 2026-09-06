import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const adminMock = vi.hoisted(() => ({
	getApps: vi.fn(() => [{}]),
	getApp: vi.fn(() => ({ __app: true })),
	initializeApp: vi.fn(),
	credential: { cert: vi.fn((c: unknown) => ({ __cert: c })) },
	getFirestore: vi.fn(() => ({ __db: true })),
	firestore: vi.fn(() => ({ __db2: true })),
	auth: vi.fn(() => ({ __auth: true })),
}));

vi.mock("firebase-admin", () => ({
	cert: adminMock.credential.cert,
	getApps: adminMock.getApps,
	getApp: adminMock.getApp,
	initializeApp: adminMock.initializeApp,
}));
vi.mock("firebase-admin/firestore", () => ({
	getFirestore: adminMock.getFirestore,
}));
vi.mock("firebase-admin/auth", () => ({ getAuth: () => adminMock.auth() }));

const { resolveCredentialPath, readServiceAccount, FirebaseConfigError } =
	await import("../firebase.js");

describe("TD-021/TD-022: firebase init hardening", () => {
	describe("resolveCredentialPath precedence", () => {
		it("prefers GOOGLE_APPLICATION_CREDENTIALS over everything", () => {
			expect(
				resolveCredentialPath({
					GOOGLE_APPLICATION_CREDENTIALS: "/creds/gac.json",
					SERVICE_ACCOUNT_KEY_PATH: "/creds/sak.json",
				}),
			).toBe("/creds/gac.json");
		});

		it("falls back to SERVICE_ACCOUNT_KEY_PATH", () => {
			expect(
				resolveCredentialPath({ SERVICE_ACCOUNT_KEY_PATH: "/creds/sak.json" }),
			).toBe("/creds/sak.json");
		});

		it("falls back to the legacy repo-relative key file", () => {
			const p = resolveCredentialPath({});
			expect(p).toContain("serviceAccountKey.json");
			expect(p).not.toContain("/creds/");
		});
	});

	describe("readServiceAccount error contract (TD-022)", () => {
		it("throws an actionable error naming the missing path and both env knobs", () => {
			try {
				readServiceAccount("/nonexistent/path/key.json");
				expect.unreachable("should have thrown");
			} catch (err) {
				expect(err).toBeInstanceOf(FirebaseConfigError);
				const msg = (err as Error).message;
				expect(msg).toContain("/nonexistent/path/key.json");
				expect(msg).toContain("GOOGLE_APPLICATION_CREDENTIALS");
				expect(msg).toContain("SERVICE_ACCOUNT_KEY_PATH");
			}
		});

		it("rejects non-JSON content with an actionable message", () => {
			const dir = mkdtempSync(path.join(tmpdir(), "fb-init-"));
			try {
				const file = path.join(dir, "broken.json");
				writeFileSync(file, "{not json");
				try {
					readServiceAccount(file);
					expect.unreachable("should have thrown");
				} catch (err) {
					expect(err).toBeInstanceOf(FirebaseConfigError);
					expect((err as Error).message).toContain(file);
				}
			} finally {
				rmSync(dir, { recursive: true, force: true });
			}
		});

		it("rejects JSON that is not a service account (missing project_id)", () => {
			const dir = mkdtempSync(path.join(tmpdir(), "fb-init-"));
			try {
				const file = path.join(dir, "wrong.json");
				writeFileSync(file, JSON.stringify({ hello: "world" }));
				try {
					readServiceAccount(file);
					expect.unreachable("should have thrown");
				} catch (err) {
					expect(err).toBeInstanceOf(FirebaseConfigError);
					expect((err as Error).message).toContain("project_id");
				}
			} finally {
				rmSync(dir, { recursive: true, force: true });
			}
		});

		it("returns parsed credentials for a valid service-account file", () => {
			const dir = mkdtempSync(path.join(tmpdir(), "fb-init-"));
			try {
				const file = path.join(dir, "good.json");
				writeFileSync(
					file,
					JSON.stringify({ project_id: "proj-1", client_email: "x@y" }),
				);
				expect(readServiceAccount(file)).toMatchObject({
					project_id: "proj-1",
				});
			} finally {
				rmSync(dir, { recursive: true, force: true });
			}
		});
	});
});
