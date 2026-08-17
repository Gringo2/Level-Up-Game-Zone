/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../../contexts/AuthContext.js";

// Mock Firebase Modules
const { firebaseUser } = vi.hoisted(() => ({
	firebaseUser: {
		uid: "test1234",
		email: "test@example.com",
		getIdToken: vi.fn().mockResolvedValue("mock-token"),
	},
}));

vi.mock("firebase/auth", () => ({
	onAuthStateChanged: vi.fn((_auth, callback) => {
		// Simulate a signed-in user
		callback(firebaseUser);
		return vi.fn();
	}),
	signOut: vi.fn(),
}));

vi.mock("../../firebase", () => ({
	auth: {},
}));

// Mock sonner
vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

// Test Component to consume context
const TestComponent = () => {
	const { user, loading } = useAuth();
	if (loading) return <div data-testid="loading">Loading...</div>;
	if (!user) return <div data-testid="no-user">No User</div>;
	return <div data-testid="user">{user.role}</div>;
};

describe("AuthContext - Negative Tests", () => {
	it("should fail closed and sign out if backend token validation fails", async () => {
		// Mock a 404 for /api/users/me, followed by a 500 rejection for /api/users creation.
		// Real Response objects with JSON content-type headers exercise the intended
		// 404 -> creation -> error branches (not the generic catch path).
		global.fetch = vi.fn().mockImplementation((url: string) => {
			if (url.includes("/api/users/me")) {
				return Promise.resolve(
					new Response(JSON.stringify({ error: "User profile not found" }), {
						status: 404,
						statusText: "Not Found",
						headers: { "Content-Type": "application/json" },
					}),
				);
			}
			return Promise.resolve(
				new Response(JSON.stringify({ error: "User already exists" }), {
					status: 500,
					statusText: "Internal Server Error",
					headers: { "Content-Type": "application/json" },
				}),
			);
		});

		render(
			<AuthProvider>
				<TestComponent />
			</AuthProvider>,
		);

		// Wait for the context to process the auth state and fetch
		await waitFor(() => {
			expect(screen.getByTestId("no-user")).toBeInTheDocument();
		});

		// Prove the intended registration-error branch ran (not the catch path)
		expect(toast.error).toHaveBeenCalledWith(
			"Registration Error: 500 User already exists",
		);

		// Verify that it forcibly signed out the firebase user to fail closed
		expect(signOut).toHaveBeenCalled();
	});
});

describe("AuthContext - Positive Tests", () => {
	it("sets the user from /api/users/me when token validation succeeds", async () => {
		vi.mocked(signOut).mockClear();
		global.fetch = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					uid: "test1234",
					email: "test@example.com",
					displayName: "Test User",
					role: "manager",
				}),
				{
					status: 200,
					statusText: "OK",
					headers: { "Content-Type": "application/json" },
				},
			),
		);

		render(
			<AuthProvider>
				<TestComponent />
			</AuthProvider>,
		);

		await waitFor(() => {
			expect(screen.getByTestId("user")).toBeInTheDocument();
		});
		expect(screen.getByTestId("user")).toHaveTextContent("manager");
		expect(signOut).not.toHaveBeenCalled();
	});
});

describe("AuthContext - Additional Paths", () => {
	beforeEach(() => {
		vi.mocked(signOut).mockClear();
	});

	afterEach(() => {
		Object.defineProperty(window, "__E2E_USER__", {
			value: undefined,
			configurable: true,
		});
	});

	it("short-circuits to window.__E2E_USER__ without calling the backend", async () => {
		Object.defineProperty(window, "__E2E_USER__", {
			value: {
				uid: "e2e-user",
				email: "e2e@test.com",
				displayName: "E2E User",
				role: "admin",
			},
			configurable: true,
		});
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		render(
			<AuthProvider>
				<TestComponent />
			</AuthProvider>,
		);

		await waitFor(() => {
			expect(screen.getByTestId("user")).toHaveTextContent("admin");
		});
		expect(fetchMock).not.toHaveBeenCalled();
		expect(signOut).not.toHaveBeenCalled();
	});

	it("creates the user profile on 404 and toasts a successful login", async () => {
		global.fetch = vi.fn().mockImplementation((url: string) => {
			if (url.includes("/api/users/me")) {
				return Promise.resolve(
					new Response(JSON.stringify({ error: "User profile not found" }), {
						status: 404,
						statusText: "Not Found",
						headers: { "Content-Type": "application/json" },
					}),
				);
			}
			return Promise.resolve(
				new Response(
					JSON.stringify({
						uid: "test1234",
						email: "test@example.com",
						displayName: "Test User",
						role: "manager",
					}),
					{
						status: 200,
						statusText: "OK",
						headers: { "Content-Type": "application/json" },
					},
				),
			);
		});

		render(
			<AuthProvider>
				<TestComponent />
			</AuthProvider>,
		);

		await waitFor(() => {
			expect(screen.getByTestId("user")).toHaveTextContent("manager");
		});
		expect(toast.success).toHaveBeenCalledWith("Login successful!");
		expect(signOut).not.toHaveBeenCalled();
	});

	it("toasts the server message when profile creation is denied with 403", async () => {
		global.fetch = vi.fn().mockImplementation((url: string) => {
			if (url.includes("/api/users/me")) {
				return Promise.resolve(
					new Response(JSON.stringify({ error: "User profile not found" }), {
						status: 404,
						statusText: "Not Found",
						headers: { "Content-Type": "application/json" },
					}),
				);
			}
			return Promise.resolve(
				new Response(JSON.stringify({ error: "Invite required" }), {
					status: 403,
					statusText: "Forbidden",
					headers: { "Content-Type": "application/json" },
				}),
			);
		});

		render(
			<AuthProvider>
				<TestComponent />
			</AuthProvider>,
		);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Invite required");
		});
		expect(screen.getByTestId("no-user")).toBeInTheDocument();
		expect(signOut).toHaveBeenCalled();
	});

	it("fails closed with a Backend Auth Error when /me returns 500", async () => {
		global.fetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ error: "boom" }), {
				status: 500,
				statusText: "Internal Server Error",
				headers: { "Content-Type": "application/json" },
			}),
		);

		render(
			<AuthProvider>
				<TestComponent />
			</AuthProvider>,
		);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Backend Auth Error: 500 boom");
		});
		expect(screen.getByTestId("no-user")).toBeInTheDocument();
		expect(signOut).toHaveBeenCalled();
	});

	it("fails closed when the fetch rejects", async () => {
		global.fetch = vi.fn().mockRejectedValue(new Error("Network down"));

		render(
			<AuthProvider>
				<TestComponent />
			</AuthProvider>,
		);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Auth Error: Network down");
		});
		expect(screen.getByTestId("no-user")).toBeInTheDocument();
		expect(signOut).toHaveBeenCalled();
	});

	it("clears the user when firebase reports no signed-in user", async () => {
		vi.mocked(onAuthStateChanged).mockImplementationOnce(
			(_auth, nextOrObserver) => {
				(nextOrObserver as unknown as (user: null) => void)(null);
				return vi.fn();
			},
		);

		render(
			<AuthProvider>
				<TestComponent />
			</AuthProvider>,
		);

		await waitFor(() => {
			expect(screen.getByTestId("no-user")).toBeInTheDocument();
		});
	});
});
