import type { Response } from "express";
import { db } from "../firebase.js";
import type { AuthRequest } from "../middleware/auth.js";

export const getMe = async (req: AuthRequest, res: Response) => {
	const user = req.user;
	if (!user) return res.status(401).json({ error: "Unauthorized" });

	try {
		const docSnap = await db.collection("users").doc(user.uid).get();
		if (!docSnap.exists) {
			return res.status(404).json({ error: "User profile not found" });
		}
		return res.status(200).json({ uid: docSnap.id, ...docSnap.data() });
	} catch (error: unknown) {
		console.error("Error fetching user profile:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};

export const listUsers = async (req: AuthRequest, res: Response) => {
	const user = req.user;
	if (!user) return res.status(401).json({ error: "Unauthorized" });

	try {
		const snapshot = await db.collection("users").get();
		const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		return res.status(200).json(rows);
	} catch (error: unknown) {
		console.error("Error listing users:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};

export const createUser = async (req: AuthRequest, res: Response) => {
	const user = req.user;
	if (!user) return res.status(401).json({ error: "Unauthorized" });

	const { role } = req.body;

	try {
		const docRef = db.collection("users").doc(user.uid);
		const auditRef = db.collection("audit_logs").doc();

		const data = {
			email: user.email,
			displayName: user.name || user.email?.split("@")[0] || "Unknown",
			role: role || "staff",
			created_at: new Date().toISOString(),
		};

		await db.runTransaction(async (transaction) => {
			const docSnap = await transaction.get(docRef);
			if (docSnap.exists) {
				throw new Error("User already exists");
			}

			transaction.set(docRef, data);
			transaction.set(auditRef, {
				table_affected: "users",
				record_id: user.uid,
				old_value: null,
				new_value: data,
				reason_for_change: "User registration",
				user_id: user.uid,
				timestamp: new Date().toISOString(),
			});
		});

		return res.status(201).json({ uid: user.uid, ...data });
	} catch (error: unknown) {
		console.error("Error creating user:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};

export const updateRole = async (req: AuthRequest, res: Response) => {
	const adminUser = req.user;
	if (!adminUser) return res.status(401).json({ error: "Unauthorized" });

	const { id } = req.params;
	const { role, editReason } = req.body;

	if (!editReason) {
		return res.status(400).json({ error: "Edit reason is required" });
	}

	try {
		const adminDoc = await db.collection("users").doc(adminUser.uid).get();
		if (adminDoc.data()?.role !== "admin") {
			return res.status(403).json({ error: "Forbidden: Admins only" });
		}

		const docRef = db.collection("users").doc(id);
		const auditRef = db.collection("audit_logs").doc();

		await db.runTransaction(async (transaction) => {
			const docSnap = await transaction.get(docRef);
			if (!docSnap.exists) {
				throw new Error("User not found");
			}

			const oldDoc = { uid: docSnap.id, ...docSnap.data() };

			transaction.update(docRef, { role });

			transaction.set(auditRef, {
				table_affected: "users",
				record_id: id,
				old_value: oldDoc,
				new_value: { ...oldDoc, role },
				reason_for_change: editReason,
				user_id: adminUser.uid,
				timestamp: new Date().toISOString(),
			});
		});

		return res.status(200).json({ message: "Role updated successfully" });
	} catch (error: unknown) {
		console.error("Error updating user role:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};
