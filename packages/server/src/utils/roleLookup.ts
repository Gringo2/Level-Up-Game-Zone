import { COLLECTIONS } from "@level-up/shared";
import { db } from "../firebase.js";

/** The user's role from their Firestore profile, or undefined if none. */
export async function getUserRole(uid: string): Promise<string | undefined> {
	const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
	return userDoc.exists ? userDoc.data()?.role : undefined;
}
