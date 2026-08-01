import type { Shift } from "@level-up/shared";
import {
	collection,
	onSnapshot,
	orderBy,
	query,
	where,
} from "firebase/firestore";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { db } from "../firebase";
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
		const q = query(
			collection(db, "shifts"),
			where("status", "==", "OPEN"),
			orderBy("start_time", "desc"),
		);
		const unsub = onSnapshot(
			q,
			(snap) => {
				if (!snap.empty) {
					setActiveShift({
						id: snap.docs[0].id,
						...snap.docs[0].data(),
					} as Shift);
				} else {
					setActiveShift(null);
				}
				setLoadingShift(false);
			},
			(err) => {
				console.error("Error fetching shift:", err);
				setLoadingShift(false);
			},
		);
		return () => unsub();
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
