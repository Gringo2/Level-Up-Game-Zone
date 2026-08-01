import type { AppUser } from "@level-up/shared";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { auth, db } from "../firebase";

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
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (firebaseUser) {
				try {
					const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
					if (userDoc.exists()) {
						setUser(userDoc.data() as AppUser);
					} else {
						const role =
							firebaseUser.email === "bezueyob3@gmail.com" ? "admin" : "staff";
						const token = await firebaseUser.getIdToken();
						const response = await fetch(
							`http://${window.location.hostname}:4000/api/users`,
							{
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									Authorization: `Bearer ${token}`,
								},
								body: JSON.stringify({ role }),
							},
						);

						if (response.ok) {
							const newUser = await response.json();
							setUser(newUser as AppUser);
							toast.success("Login successful!");
						} else {
							const errData = await response.json().catch(() => ({}));
							const errMsg = errData.error || response.statusText;
							toast.error(`Backend Login Error: ${response.status} ${errMsg}`);
							setUser(null);
							signOut(auth);
						}
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
