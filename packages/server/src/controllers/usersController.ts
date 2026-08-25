import { COLLECTIONS, ROLES, ROOT_ADMIN_EMAILS } from "@level-up/shared";
import type { Response } from "express";
import { db } from "../firebase.js";
import type { AuthRequest } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import { safeErrorMessage } from "../utils/safeError.js";

export const getMe = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	try {
		const docSnap = await db.collection(COLLECTIONS.USERS).doc(user.uid).get();
		if (!docSnap.exists) {
			return res.status(404).json({ error: "User profile not found" });
		}
		return res.status(200).json({ uid: docSnap.id, ...docSnap.data() });
	} catch (error: unknown) {
		logger.error({ err: error }, "Error fetching user profile");
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};

export const listUsers = async (_req: AuthRequest, res: Response) => {
	try {
		const snapshot = await db.collection(COLLECTIONS.USERS).get();
		const rows = snapshot.docs.map(
			(doc: FirebaseFirestore.DocumentSnapshot<unknown>) => ({
				id: doc.id,
				...(doc.data() as Record<string, unknown>),
			}),
		);
		return res.status(200).json(rows);
	} catch (error: unknown) {
		logger.error({ err: error }, "Error listing users");
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};

export const createUser = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const email = user.email;
	if (!email)
		return res.status(400).json({ error: "Email required from auth token" });

	try {
		const docRef = db.collection(COLLECTIONS.USERS).doc(user.uid);
		const inviteRef = db.collection(COLLECTIONS.USER_INVITES).doc(email);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		const isRootAdmin = ROOT_ADMIN_EMAILS.includes(email);
		let assignedRole: (typeof ROLES)[keyof typeof ROLES] = ROLES.STAFF;

		if (isRootAdmin) {
			assignedRole = ROLES.ADMIN;
		} else {
			const inviteSnap = await inviteRef.get();
			if (!inviteSnap.exists) {
				return res.status(403).json({
					error:
						"Forbidden: You are not authorized to access this system. Please request an invite.",
				});
			}
			assignedRole = inviteSnap.data()?.role || ROLES.STAFF;
		}

		const data = {
			email: user.email,
			displayName: user.name || user.email?.split("@")[0] || "Unknown",
			role: assignedRole,
			created_at: new Date().toISOString(),
		};

		await db.runTransaction(
			async (transaction: FirebaseFirestore.Transaction) => {
				const docSnap = await transaction.get(docRef);
				if (docSnap.exists) {
					throw new Error("User already exists");
				}

				if (!isRootAdmin) {
					transaction.delete(inviteRef);
				}

				transaction.set(docRef, data);
				transaction.set(auditRef, {
					action: "CREATE",
					table_affected: "users",
					record_id: user.uid,
					old_value: null,
					new_value: data,
					reason_for_change: isRootAdmin
						? "Root admin registration"
						: "User registration via invite",
					user_id: user.uid,
					timestamp: new Date().toISOString(),
				});
			},
		);

		return res.status(201).json({ uid: user.uid, ...data });
	} catch (error: unknown) {
		logger.error({ err: error }, "Error creating user");
		const message = (error as Error).message;
		if (message === "User already exists") {
			return res.status(400).json({ error: message });
		}
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};

export const inviteUser = async (req: AuthRequest, res: Response) => {
	const adminUser = req.user;

	const { email, role } = req.body;

	try {
		const adminDoc = await db
			.collection(COLLECTIONS.USERS)
			.doc(adminUser.uid)
			.get();
		if (adminDoc.data()?.role !== ROLES.ADMIN) {
			return res.status(403).json({ error: "Forbidden: Admins only" });
		}

		// Check if user is already registered
		const usersQuery = await db
			.collection(COLLECTIONS.USERS)
			.where("email", "==", email)
			.get();
		if (!usersQuery.empty) {
			return res.status(400).json({ error: "User is already registered" });
		}

		const inviteRef = db.collection(COLLECTIONS.USER_INVITES).doc(email);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(
			async (transaction: FirebaseFirestore.Transaction) => {
				const inviteSnap = await transaction.get(inviteRef);
				if (inviteSnap.exists) {
					throw new Error("User already invited");
				}

				const inviteData = {
					email,
					role,
					invitedBy: adminUser.email,
					createdAt: new Date().toISOString(),
				};

				transaction.set(inviteRef, inviteData);

				transaction.set(auditRef, {
					action: "CREATE",
					table_affected: "user_invites",
					record_id: email,
					old_value: null,
					new_value: inviteData,
					reason_for_change: "Admin invite",
					user_id: adminUser.uid,
					timestamp: new Date().toISOString(),
				});
			},
		);

		return res.status(201).json({ message: "User invited successfully" });
	} catch (error: unknown) {
		logger.error({ err: error }, "Error inviting user");
		const message = (error as Error).message;
		if (message === "User already invited") {
			return res.status(400).json({ error: message });
		}
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};

export const updateRole = async (req: AuthRequest, res: Response) => {
	const adminUser = req.user;

	const { id } = req.params;
	const { role, editReason } = req.body;

	try {
		const adminDoc = await db
			.collection(COLLECTIONS.USERS)
			.doc(adminUser.uid)
			.get();
		if (adminDoc.data()?.role !== ROLES.ADMIN) {
			return res.status(403).json({ error: "Forbidden: Admins only" });
		}

		const docRef = db.collection(COLLECTIONS.USERS).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(
			async (transaction: FirebaseFirestore.Transaction) => {
				const docSnap = await transaction.get(docRef);
				if (!docSnap.exists) {
					throw new Error("User not found");
				}

				const oldDoc = { uid: docSnap.id, ...docSnap.data() };

				transaction.update(docRef, { role });

				transaction.set(auditRef, {
					action: "UPDATE",
					table_affected: "users",
					record_id: id,
					old_value: oldDoc,
					new_value: { ...oldDoc, role },
					reason_for_change: editReason,
					user_id: adminUser.uid,
					timestamp: new Date().toISOString(),
				});
			},
		);

		return res.status(200).json({ message: "Role updated successfully" });
	} catch (error: unknown) {
		logger.error({ err: error }, "Error updating user role");
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
	const adminUser = req.user;

	const { id } = req.params;

	if (id === adminUser.uid) {
		return res
			.status(400)
			.json({ error: "Cannot delete your own user account" });
	}

	try {
		const adminDoc = await db
			.collection(COLLECTIONS.USERS)
			.doc(adminUser.uid)
			.get();
		if (adminDoc.data()?.role !== ROLES.ADMIN) {
			return res.status(403).json({ error: "Forbidden: Admins only" });
		}

		const userRef = db.collection(COLLECTIONS.USERS).doc(id);
		const inviteRef = db.collection(COLLECTIONS.USER_INVITES).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(
			async (transaction: FirebaseFirestore.Transaction) => {
				const userSnap = await transaction.get(userRef);
				const inviteSnap = await transaction.get(inviteRef);

				if (!userSnap.exists && !inviteSnap.exists) {
					throw new Error("User or invitation not found");
				}

				if (userSnap.exists) {
					const userData = userSnap.data();
					const targetEmail = userData?.email;

					if (ROOT_ADMIN_EMAILS.includes(targetEmail)) {
						throw new Error("Root admin accounts cannot be deleted");
					}

					const oldDoc = { uid: userSnap.id, ...userData };
					transaction.delete(userRef);
					transaction.set(auditRef, {
						action: "DELETE",
						table_affected: "users",
						record_id: id,
						old_value: oldDoc,
						new_value: null,
						reason_for_change: "User deleted by admin",
						user_id: adminUser.uid,
						timestamp: new Date().toISOString(),
					});
				} else if (inviteSnap.exists) {
					const oldInvite = { email: inviteSnap.id, ...inviteSnap.data() };
					transaction.delete(inviteRef);
					transaction.set(auditRef, {
						action: "DELETE",
						table_affected: "user_invites",
						record_id: id,
						old_value: oldInvite,
						new_value: null,
						reason_for_change: "Invitation revoked by admin",
						user_id: adminUser.uid,
						timestamp: new Date().toISOString(),
					});
				}
			},
		);

		return res
			.status(200)
			.json({ message: "User account or invitation removed successfully" });
	} catch (error: unknown) {
		logger.error({ err: error }, "Error deleting user");
		const message = (error as Error).message;
		if (
			message === "User or invitation not found" ||
			message === "Root admin accounts cannot be deleted"
		) {
			return res
				.status(message.includes("Root") ? 403 : 404)
				.json({ error: message });
		}
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};
