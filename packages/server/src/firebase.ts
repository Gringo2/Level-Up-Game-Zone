import path from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// To connect to a real Firebase project locally, you will need a Service Account Key.
// 1. Go to Firebase Console -> Project Settings -> Service Accounts
// 2. Generate New Private Key
// 3. Save it to packages/server/serviceAccountKey.json (ADD THIS TO .gitignore!)
// 4. Set GOOGLE_APPLICATION_CREDENTIALS environment variable in your .env
// OR pass the credential directly as shown below if it's easier during dev.

import { getFirestore } from "firebase-admin/firestore";

if (!admin.apps.length) {
	admin.initializeApp({
		credential: admin.credential.cert(
			path.join(__dirname, "../serviceAccountKey.json"),
		),
	});
}

// TD-016: the server no longer reads the client's firebase-applet-config.json.
// A named Firestore database is opted into via FIRESTORE_DATABASE_ID; when
// unset, the project's (default) database is used.
export const db = process.env.FIRESTORE_DATABASE_ID
	? getFirestore(admin.app(), process.env.FIRESTORE_DATABASE_ID)
	: admin.firestore();

export const auth = admin.auth();
