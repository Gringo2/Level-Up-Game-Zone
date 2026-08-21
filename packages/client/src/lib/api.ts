import { signOut } from "firebase/auth";
import { auth } from "../firebase";

/**
 * API_BASE resolves from the VITE_API_URL environment variable if set
 * (useful for staging/production deployments behind HTTPS proxies),
 * otherwise falls back to the runtime hostname on port 4000.
 */
export const API_BASE: string =
	(import.meta.env.VITE_API_URL as string | undefined) ??
	`http://${window.location.hostname}:4000`;

/**
 * Safely parses a fetch Response as JSON.
 * Returns an empty object instead of throwing SyntaxError when the server
 * returns a non-JSON body (e.g. HTML 502 Bad Gateway / 504 Gateway Timeout).
 */
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
