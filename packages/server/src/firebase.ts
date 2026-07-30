import * as dotenv from "dotenv";
import * as admin from "firebase-admin";

dotenv.config();

// To connect to a real Firebase project locally, you will need a Service Account Key.
// 1. Go to Firebase Console -> Project Settings -> Service Accounts
// 2. Generate New Private Key
// 3. Save it to packages/server/serviceAccountKey.json (ADD THIS TO .gitignore!)
// 4. Set GOOGLE_APPLICATION_CREDENTIALS environment variable in your .env
// OR pass the credential directly as shown below if it's easier during dev.

if (!admin.apps.length) {
	admin.initializeApp({
		credential: admin.credential.cert("./serviceAccountKey.json"),
	});
}

export const db = admin.firestore();
export const auth = admin.auth();
