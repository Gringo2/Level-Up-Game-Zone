import { COLLECTIONS } from "@level-up/shared";
import type { NextFunction, Request, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { auth, db } from "../firebase.js";
import { logger } from "../utils/logger.js";

export interface AuthRequest extends Request {
	user: DecodedIdToken;
	// M-132: role of the registered member, resolved once by requireAuth.
	appRole?: string;
}

declare global {
	namespace Express {
		interface Request {
			user: DecodedIdToken;
			appRole?: string;
		}
	}
}

export type TokenVerifier = (token: string) => Promise<DecodedIdToken>;

// Resolves a registered member by uid; null when no users/{uid} document exists.
export type MemberLookup = (uid: string) => Promise<{ role?: string } | null>;

export const makeRequireToken =
	(verifier: TokenVerifier) =>
	async (
		req: AuthRequest,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		const authHeader = req.headers.authorization;
		if (!authHeader?.startsWith("Bearer ")) {
			res.status(401).json({ error: "Unauthorized: No token provided" });
			return;
		}

		const token = authHeader.split("Bearer ")[1];

		try {
			const decodedToken = await verifier(token);
			req.user = decodedToken;
			next();
		} catch (error) {
			logger.error({ err: error }, "Error verifying auth token");
			res.status(401).json({ error: "Unauthorized: Invalid token" });
		}
	};

// M-132 / ACP-040: a valid token is not membership. Only callers with a
// users/{uid} document pass; the resolved role is cached on req.appRole.
export const makeRequireMember =
	(verifier: TokenVerifier, lookup: MemberLookup) =>
	async (
		req: AuthRequest,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		let tokenVerified = false;
		await makeRequireToken(verifier)(req, res, () => {
			tokenVerified = true;
		});
		if (!tokenVerified) return;

		try {
			const member = await lookup(req.user.uid);
			if (!member) {
				res.status(403).json({ error: "Forbidden: Account not registered" });
				return;
			}
			req.appRole = member.role;
			next();
		} catch (error) {
			logger.error({ err: error }, "Error checking account membership");
			res.status(500).json({ error: "Internal server error" });
		}
	};

const verifyFirebaseToken: TokenVerifier = (token) => auth.verifyIdToken(token);

const lookupMember: MemberLookup = async (uid) => {
	const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
	return userDoc.exists ? { role: userDoc.data()?.role } : null;
};

// Token-only: reserved for self-registration (GET /api/users/me, POST /api/users).
export const requireToken = makeRequireToken(verifyFirebaseToken);

export const requireAuth = makeRequireMember(verifyFirebaseToken, lookupMember);

export const requireRole = (allowedRoles: string[]) => {
	return async (
		req: AuthRequest,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		// requireAuth should have already run and populated req.user
		if (!req.user) {
			res.status(401).json({ error: "Unauthorized: No user found in request" });
			return;
		}

		try {
			let userRole = req.appRole;
			if (userRole === undefined) {
				const userDoc = await db
					.collection(COLLECTIONS.USERS)
					.doc(req.user.uid)
					.get();
				userRole = userDoc.exists ? userDoc.data()?.role : undefined;
			}
			if (!userRole || !allowedRoles.includes(userRole)) {
				res
					.status(403)
					.json({ error: "Forbidden: Insufficient role permissions" });
				return;
			}
			next();
		} catch (error) {
			logger.error({ err: error }, "Error checking user role");
			res.status(500).json({ error: "Internal server error" });
		}
	};
};
