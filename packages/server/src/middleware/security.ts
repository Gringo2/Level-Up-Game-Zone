import type { CorsOptions } from "cors";
import type { RequestHandler } from "express";
import { type RateLimitRequestHandler, rateLimit } from "express-rate-limit";

export const DEFAULT_ALLOWED_ORIGINS: readonly string[] = [
	"http://localhost:3000",
	"http://localhost:3002",
	"http://localhost:5173",
];

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
export const API_RATE_LIMIT_MAX = Number(process.env.API_RATE_LIMIT_MAX ?? 300);
export const MUTATION_RATE_LIMIT_MAX = Number(
	process.env.MUTATION_RATE_LIMIT_MAX ?? 60,
);

export function parseAllowedOrigins(envValue?: string): string[] {
	if (!envValue || envValue.trim() === "") {
		return [...DEFAULT_ALLOWED_ORIGINS];
	}
	return envValue
		.split(",")
		.map((origin) => origin.trim())
		.filter((origin) => origin.length > 0);
}

export function buildCorsOptions(allowedOrigins: string[]): CorsOptions {
	return {
		origin(source: string | undefined, callback) {
			if (!source) {
				callback(null, true);
				return;
			}
			callback(null, allowedOrigins.includes(source));
		},
	};
}

export type RateLimitConfig = {
	windowMs?: number;
	max: number;
};

export function buildApiRateLimit(
	config: RateLimitConfig,
): RateLimitRequestHandler {
	return rateLimit({
		windowMs: config.windowMs ?? DEFAULT_WINDOW_MS,
		limit: config.max,
		standardHeaders: "draft-7",
		legacyHeaders: false,
		message: { error: "Too many requests, please try again later." },
	});
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function buildMutationRateLimit(
	limiter: RateLimitRequestHandler,
): RequestHandler {
	return (req, res, next) => {
		if (!MUTATING_METHODS.has(req.method)) {
			next();
			return;
		}
		limiter(req, res, next);
	};
}
