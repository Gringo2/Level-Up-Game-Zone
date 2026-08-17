import type { Shift } from "@level-up/shared";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { auth } from "../firebase";
import { API_BASE, safeJson } from "../lib/api";
import { useAuth } from "./AuthContext";

interface ShiftContextType {
	activeShift: Shift | null;
	loadingShift: boolean;
	refetchShift: () => Promise<void>;
}

const ShiftContext = createContext<ShiftContextType>({
	activeShift: null,
	loadingShift: true,
	refetchShift: async () => {},
});

export function ShiftProvider({ children }: { children: React.ReactNode }) {
	const { user } = useAuth();
	const [activeShift, setActiveShift] = useState<Shift | null>(null);
	const [loadingShift, setLoadingShift] = useState(true);

	const loadActiveShift = useCallback(async () => {
		if (!user) {
			setActiveShift(null);
			setLoadingShift(false);
			return;
		}

		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const [shiftsRes, missedRes] = await Promise.all([
				fetch(`${API_BASE}/api/shifts`, {
					headers: { Authorization: `Bearer ${token}` },
				}),
				fetch(`${API_BASE}/api/shifts/missed`, {
					headers: { Authorization: `Bearer ${token}` },
				}),
			]);

			if (!shiftsRes.ok || !missedRes.ok) {
				throw new Error("Failed to fetch shifts data");
			}

			const data = (await safeJson(shiftsRes)) as Shift[];
			const missedPayload = (await safeJson(missedRes)) as {
				newlyOpenedShift?: Shift | null;
			};

			let openShift =
				data
					.filter((s) => s.status === "OPEN")
					.sort(
						(a, b) =>
							new Date(b.start_time).getTime() -
							new Date(a.start_time).getTime(),
					)[0] || null;

			if (missedPayload.newlyOpenedShift) {
				openShift = missedPayload.newlyOpenedShift;
			}

			setActiveShift(openShift);
			setLoadingShift(false);
		} catch (err) {
			console.error("Error fetching shift:", err);
			setActiveShift(null);
			setLoadingShift(false);
		}
	}, [user]);

	useEffect(() => {
		void loadActiveShift();
	}, [loadActiveShift]);

	return (
		<ShiftContext.Provider
			value={{
				activeShift,
				loadingShift,
				refetchShift: loadActiveShift,
			}}
		>
			{children}
		</ShiftContext.Provider>
	);
}

export function useShift() {
	return useContext(ShiftContext);
}
