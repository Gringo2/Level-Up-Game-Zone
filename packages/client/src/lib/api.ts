import { signOut } from "firebase/auth";
import { auth } from "../firebase";

/**
 * API_BASE resolves from the VITE_API_URL environment variable if set
 * (useful for staging/production deployments behind HTTPS proxies).
 * TD-015: the plaintext http fallback is permitted ONLY for loopback dev
 * hosts — any other host without an explicit VITE_API_URL fails fast at
 * boot rather than silently sending Firebase ID tokens over cleartext.
 */
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export function resolveApiBase(
	envUrl: string | undefined,
	hostname: string,
): string {
	if (envUrl) return envUrl;
	if (LOOPBACK_HOSTNAMES.has(hostname)) return `http://${hostname}:4001`;
	throw new Error(
		"VITE_API_URL is required when serving from a non-loopback host: refusing to send auth tokens over plaintext HTTP.",
	);
}

export const API_BASE: string = resolveApiBase(
	import.meta.env.VITE_API_URL as string | undefined,
	window.location.hostname,
);

/**
 * Safely parses a fetch Response as JSON.
 * Returns an empty object instead of throwing SyntaxError when the server
 * returns a non-JSON body (e.g. HTML 502 Bad Gateway / 504 Gateway Timeout).
 */
// TD-032: list endpoints return either a legacy bare array or the
// { data, nextCursor } pagination envelope. This normalizes both.
export function listFromPayload<T>(
	payload: T[] | { data: T[]; nextCursor?: string | null },
): T[] {
	return Array.isArray(payload) ? payload : payload.data;
}

export async function safeJson<T = Record<string, unknown>>(
	res: Response,
): Promise<T & { error?: string }> {
	const contentType = res.headers.get("content-type") ?? "";
	if (!contentType.includes("application/json"))
		return {} as T & { error?: string };
	return res.json() as Promise<T & { error?: string }>;
}

/**
 * Authenticated fetch wrapper.
 * Automatically attaches the Firebase ID token and handles 401 responses
 * by signing the user out.
 */
export async function authFetch(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	const token = await auth.currentUser?.getIdToken();
	if (!token) {
		await signOut(auth);
		throw new Error("Not authenticated");
	}

	const headers = new Headers(init?.headers);
	headers.set("Authorization", `Bearer ${token}`);

	const response = await fetch(input, { ...init, headers });

	if (response.status === 401) {
		await signOut(auth);
		throw new Error("Session expired. Please sign in again.");
	}

	return response;
}
