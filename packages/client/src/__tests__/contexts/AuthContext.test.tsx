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

vi.mock("firebase/firestore", () => ({
	doc: vi.fn(),
	getDoc: vi.fn().mockResolvedValue({
		exists: () => false, // Simulate user not found in DB
	}),
}));

vi.mock("../../firebase", () => ({
	auth: {},
	db: {},
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
		// Mock a backend rejection (e.g., 500 error during user creation)
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
			json: vi.fn().mockResolvedValue({ error: "User already exists" }),
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
