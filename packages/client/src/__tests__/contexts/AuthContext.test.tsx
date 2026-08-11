/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { signOut } from "firebase/auth";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../../contexts/AuthContext.js";

// Mock Firebase Modules
vi.mock("firebase/auth", () => ({
	onAuthStateChanged: vi.fn((_auth, callback) => {
		// Simulate a signed-in user
		callback({
			uid: "test1234",
			email: "test@example.com",
			getIdToken: vi.fn().mockResolvedValue("mock-token"),
		});
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
		// Mock a 404 for /api/users/me, followed by a 500 rejection for /api/users creation
		global.fetch = vi.fn().mockImplementation((url: string) => {
			if (url.includes("/api/users/me")) {
				return Promise.resolve({
					ok: false,
					status: 404,
					statusText: "Not Found",
					json: () => Promise.resolve({ error: "User profile not found" }),
				});
			}
			return Promise.resolve({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () => Promise.resolve({ error: "User already exists" }),
			});
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

		// Verify that it forcibly signed out the firebase user to fail closed
		expect(signOut).toHaveBeenCalled();
	});
});
