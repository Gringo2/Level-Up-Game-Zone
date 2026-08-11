import type { Shift } from "@level-up/shared";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase";
import { useAuth } from "./AuthContext";

interface ShiftContextType {
	activeShift: Shift | null;
	loadingShift: boolean;
}

const ShiftContext = createContext<ShiftContextType>({
	activeShift: null,
	loadingShift: true,
});

export function ShiftProvider({ children }: { children: React.ReactNode }) {
	const { user } = useAuth();
	const [activeShift, setActiveShift] = useState<Shift | null>(null);
	const [loadingShift, setLoadingShift] = useState(true);

	useEffect(() => {
		if (!user) {
			setActiveShift(null);
			setLoadingShift(false);
			return;
		}

		let mounted = true;
		const loadActiveShift = async () => {
			try {
				const token = await auth.currentUser?.getIdToken();
				if (!token) throw new Error("Not authenticated");

				const response = await fetch(
					`http://${window.location.hostname}:4000/api/shifts`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
						},
					},
				);
				if (!response.ok) {
					throw new Error("Failed to fetch shifts");
				}

				const data = (await response.json()) as Shift[];
				const openShift =
					data
						.filter((s) => s.status === "OPEN")
						.sort(
							(a, b) =>
								new Date(b.start_time).getTime() -
								new Date(a.start_time).getTime(),
						)[0] || null;

				if (mounted) {
					setActiveShift(openShift);
					setLoadingShift(false);
				}
			} catch (err) {
				console.error("Error fetching shift:", err);
				if (mounted) {
					setActiveShift(null);
					setLoadingShift(false);
				}
			}
		};

		void loadActiveShift();
		return () => {
			mounted = false;
		};
	}, [user]);

	return (
		<ShiftContext.Provider value={{ activeShift, loadingShift }}>
			{children}
		</ShiftContext.Provider>
	);
}

export function useShift() {
	return useContext(ShiftContext);
}
