import type { AppUser } from "@level-up/shared";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { auth } from "../firebase";
import { API_BASE, safeJson } from "../lib/api";

interface AuthContextType {
	user: AppUser | null;
	loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<AppUser | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// E2E Test Mocking Hook
		// @ts-expect-error
		if (typeof window !== "undefined" && window.__E2E_USER__) {
			// @ts-expect-error
			setUser(window.__E2E_USER__);
			setLoading(false);
			return;
		}

		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (firebaseUser) {
				try {
					const token = await firebaseUser.getIdToken();
					const meResponse = await fetch(`${API_BASE}/api/users/me`, {
						headers: {
							Authorization: `Bearer ${token}`,
						},
					});

					if (meResponse.ok) {
						const meData = await meResponse.json();
						setUser(meData as AppUser);
					} else if (meResponse.status === 404) {
						const role =
							firebaseUser.email === "bezueyob3@gmail.com" ? "admin" : "staff";
						const createResponse = await fetch(`${API_BASE}/api/users`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								Authorization: `Bearer ${token}`,
							},
							body: JSON.stringify({ role }),
						});

						if (createResponse.ok) {
							const newUser = await createResponse.json();
							setUser(newUser as AppUser);
							toast.success("Login successful!");
						} else {
							const errData = await createResponse.json().catch(() => ({}));
							const errMsg = errData.error || createResponse.statusText;
							toast.error(
								`Backend Login Error: ${createResponse.status} ${errMsg}`,
							);
							setUser(null);
							signOut(auth);
						}
					} else {
						const errData = await meResponse.json().catch(() => ({}));
						const errMsg = errData.error || meResponse.statusText;
						toast.error(`Backend Auth Error: ${meResponse.status} ${errMsg}`);
						setUser(null);
						signOut(auth);
					}
				} catch (error) {
					console.error("Error fetching user role:", error);
					toast.error(`Auth Error: ${(error as Error).message}`);
					setUser(null);
					signOut(auth);
				}
			} else {
				setUser(null);
			}
			setLoading(false);
		});

		return () => unsubscribe();
	}, []);

	return (
		<AuthContext.Provider value={{ user, loading }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	return useContext(AuthContext);
}
