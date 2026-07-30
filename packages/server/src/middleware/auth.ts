import type { NextFunction, Request, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { auth } from "../firebase.js";

export interface AuthRequest extends Request {
	user?: DecodedIdToken;
}

export const requireAuth = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const authHeader = req.headers.authorization;
	if (!authHeader?.startsWith("Bearer ")) {
		return res.status(401).json({ error: "Unauthorized: No token provided" });
	}

	const token = authHeader.split("Bearer ")[1];

	try {
		const decodedToken = await auth.verifyIdToken(token);
		Object.assign(req, { user: decodedToken });
		next();
	} catch (error) {
		console.error("Error verifying auth token", error);
		return res.status(401).json({ error: "Unauthorized: Invalid token" });
	}
};
