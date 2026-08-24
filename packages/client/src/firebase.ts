import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";

/**
 * Firebase web config comes from VITE_FIREBASE_* env vars (TD-016) instead of
 * a committed JSON file. These identifiers are public-by-design, but keeping
 * them out of git removes them from the tracked attack surface.
 */
const env = import.meta.env;

const REQUIRED_VARS = [
	"VITE_FIREBASE_API_KEY",
	"VITE_FIREBASE_AUTH_DOMAIN",
	"VITE_FIREBASE_PROJECT_ID",
	"VITE_FIREBASE_APP_ID",
] as const;

const missing = REQUIRED_VARS.filter((key) => !env[key]);
if (missing.length > 0) {
	throw new Error(
		`Missing Firebase client config: ${missing.join(", ")}. Copy packages/client/firebase-applet-config.json values into packages/client/.env.local (see .env.example).`,
	);
}

const app = initializeApp({
	apiKey: env.VITE_FIREBASE_API_KEY,
	authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: env.VITE_FIREBASE_PROJECT_ID,
	appId: env.VITE_FIREBASE_APP_ID,
	messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
