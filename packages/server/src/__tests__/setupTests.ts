import { vi } from "vitest";

// Global mock for firebase.js
vi.mock("../firebase.js", () => {
	// 1. Create a chained mock for db.collection().doc().get() etc.
	// This will act as the default fallback for all queries unless overridden.
	const mockDb = {
		collection: vi.fn().mockReturnThis(),
		doc: vi.fn().mockReturnThis(),
		get: vi.fn().mockResolvedValue({
			exists: true,
			data: () => ({ role: "admin" }), // Default admin role for requireRole middleware
			docs: [], // For where().get()
			empty: true,
		}),
		where: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		set: vi.fn().mockResolvedValue(true),
		update: vi.fn().mockResolvedValue(true),
		delete: vi.fn().mockResolvedValue(true),

		// runTransaction executes the callback immediately with a mock transaction object
		runTransaction: vi.fn().mockImplementation(async (callback) => {
			const mockTransaction = {
				get: vi.fn().mockResolvedValue({
					exists: true,
					data: () => ({ status: "OPEN", opening_float: 100 }), // Common shift data needed
				}),
				getAll: vi.fn().mockResolvedValue([]),
				set: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
			};
			// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
			return await callback(mockTransaction as any);
		}),
	};

	// 2. Global mock for Firebase Auth used by requireAuth middleware.
	// DecodedIdToken does NOT carry a `role` field; roles live in Firestore.
	const mockAuth = {
		verifyIdToken: vi.fn().mockResolvedValue({
			uid: "mock-admin-uid",
			email: "admin@example.com",
		}),
	};

	return {
		db: mockDb,
		auth: mockAuth,
	};
});

// Role lookup used by requireRole. Reads the role from whatever the test's
// Firestore mock returns for users/{uid}; when a suite's ad-hoc mock carries
// no role (most controller suites), fall back to admin so the manager/admin
// operator gate in app.ts doesn't mask the behaviour under test. Suites that
// exercise 403s set role: "staff" on the users mock as before. The real
// lookup is covered in auth.test.ts.
vi.mock("../utils/roleLookup.js", async () => {
	const { db } = await import("../firebase.js");
	return {
		getUserRole: vi.fn(async (uid: string) => {
			try {
				const snap = await db.collection("users").doc(uid).get();
				const role = snap?.exists ? snap.data?.()?.role : undefined;
				return role ?? "admin";
			} catch {
				return "admin";
			}
		}),
	};
});
