import type { NextFunction, RequestHandler, Response } from "express";
import type { z } from "zod";
import type { AuthRequest } from "./auth.js";

export const validateBody = (schema: z.ZodSchema): RequestHandler => {
	return (req: AuthRequest, res: Response, next: NextFunction): void => {
		const result = schema.safeParse(req.body);
		if (!result.success) {
			const firstIssue = result.error.issues[0];
			const errorMessage = firstIssue
				? firstIssue.message
				: "Invalid request payload";
			res.status(400).json({ error: errorMessage });
			return;
		}

		req.body = result.data;
		next();
	};
};

export const validateQuery = (schema: z.ZodSchema): RequestHandler => {
	return (req: AuthRequest, res: Response, next: NextFunction): void => {
		const result = schema.safeParse(req.query);
		if (!result.success) {
			const firstIssue = result.error.issues[0];
			const errorMessage = firstIssue
				? firstIssue.message
				: "Invalid query parameters";
			res.status(400).json({ error: errorMessage });
			return;
		}

		req.query = result.data;
		next();
	};
};
