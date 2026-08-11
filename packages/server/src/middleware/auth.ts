import type { NextFunction, Request, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { auth } from "../firebase.js";

export interface AuthRequest extends Request {
	user?: DecodedIdToken;
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
			console.error("Error verifying auth token", error);
			res.status(401).json({ error: "Unauthorized: Invalid token" });
		}
	};

export const requireAuth = makeRequireAuth((token) =>
	auth.verifyIdToken(token),
);
