import { COLLECTIONS } from "@level-up/shared";
import type { NextFunction, Request, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { auth, db } from "../firebase.js";
import { logger } from "../utils/logger.js";

export interface AuthRequest extends Request {
	user: DecodedIdToken;
}

declare global {
	namespace Express {
		interface Request {
			user: DecodedIdToken;
		}
	}
}

export type TokenVerifier = (token: string) => Promise<DecodedIdToken>;

export const makeRequireAuth =
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

export const requireAuth = makeRequireAuth((token) =>
	auth.verifyIdToken(token),
);

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
			const userDoc = await db
				.collection(COLLECTIONS.USERS)
				.doc(req.user.uid)
				.get();
			const userRole = userDoc.exists ? userDoc.data()?.role : undefined;
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
