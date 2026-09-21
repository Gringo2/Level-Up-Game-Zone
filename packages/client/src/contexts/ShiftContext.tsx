import type { Shift } from "@level-up/shared";
import { SHIFT_STATUSES } from "@level-up/shared";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { API_BASE, authFetch, safeJson } from "../lib/api";
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

	const loadActiveShift = useCallback(
		async (skipAutoOpen = false) => {
			if (!user) {
				setActiveShift(null);
				setLoadingShift(false);
				return;
			}

			try {
				const [shiftsRes, missedRes] = await Promise.all([
					authFetch(`${API_BASE}/api/shifts`),
					authFetch(`${API_BASE}/api/shifts/missed`),
				]);

				if (!shiftsRes.ok || !missedRes.ok) {
					throw new Error("Failed to fetch shifts data");
				}

				const data = (await safeJson(shiftsRes)) as Shift[];
				// ACP-011: getMissedData is now read-only.
				// Consume missedShifts and gapDates to guard the auto-open call below.
				const missedPayload = (await safeJson(missedRes)) as {
					missedShifts: unknown[];
					gapDates: string[];
				};
				const hasGaps = (missedPayload.gapDates ?? []).length > 0;
				const hasMissed = (missedPayload.missedShifts ?? []).length > 0;

				let openShift =
					data
						.filter((s) => s.status === SHIFT_STATUSES.OPEN)
						.sort(
							(a, b) =>
								new Date(b.start_time).getTime() -
								new Date(a.start_time).getTime(),
						)[0] || null;

				// OQ-1 resolved — Option B: call auto-open with floatAmount: 0 when state
				// is provably clean. skipAutoOpen=true when called from refetchShift (after
				// close/float-update) so a manager can close a shift without immediately
				// reopening one in the same session.
				if (!hasGaps && !hasMissed && !openShift && !skipAutoOpen) {
					const autoRes = await authFetch(`${API_BASE}/api/shifts/auto-open`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							floatAmount: 0,
							managerName: user.displayName || user.email || "Unknown",
						}),
					});
					// 201 = shift created; 409 = already open or closed today (expected non-error).
					if (autoRes.ok) {
						openShift = (await safeJson(autoRes)) as Shift;
					}
				}

				setActiveShift(openShift);
				setLoadingShift(false);
			} catch (err) {
				console.error("Error fetching shift:", err);
				setActiveShift(null);
				setLoadingShift(false);
			}
		},
		[user],
	);

	useEffect(() => {
		void loadActiveShift();
	}, [loadActiveShift]);

	return (
		<ShiftContext.Provider
			value={{
				activeShift,
				loadingShift,
				refetchShift: () => loadActiveShift(true),
			}}
		>
			{children}
		</ShiftContext.Provider>
	);
}

export function useShift() {
	return useContext(ShiftContext);
}
