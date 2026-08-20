import { COLLECTIONS } from "@level-up/shared";
import { db } from "../firebase.js";

async function runMigration() {
	console.log("Starting credits foreign key migration...");

	try {
		// 1. Fetch all employees
		const employeesSnap = await db.collection(COLLECTIONS.EMPLOYEES).get();
		const employeesByName: Record<string, string> = {};

		employeesSnap.forEach((doc) => {
			const data = doc.data();
			const name = data.name.trim().toLowerCase();
			employeesByName[name] = doc.id;
		});

		console.log(`Loaded ${employeesSnap.size} employees for matching.`);

		// 2. Fetch all credits
		const creditsSnap = await db.collection(COLLECTIONS.CREDITS).get();

		let updatedCount = 0;
		let missingCount = 0;

		const batch = db.batch();
		let batchOperationCount = 0;

		for (const doc of creditsSnap.docs) {
			const data = doc.data();

			if (data.employee_id) {
				// Already migrated
				continue;
			}

			const employeeName = data.employee_name?.trim().toLowerCase() || "";
			const matchedId = employeesByName[employeeName];

			if (matchedId) {
				batch.update(doc.ref, { employee_id: matchedId });
				updatedCount++;
				batchOperationCount++;
			} else {
				console.warn(
					`[WARNING] No active employee found for credit ID ${doc.id} (Name: ${data.employee_name}). Skipping.`,
				);
				missingCount++;
			}

			// Firestore batch limits to 500 ops
			if (batchOperationCount >= 400) {
				await batch.commit();
				batchOperationCount = 0;
			}
		}

		if (batchOperationCount > 0) {
			await batch.commit();
		}

		console.log("\nMigration Summary:");
		console.log(`- Credits successfully linked: ${updatedCount}`);
		console.log(`- Credits unlinked (historical/missing): ${missingCount}`);
		console.log("Migration completed.");
	} catch (error) {
		console.error("Migration failed:", error);
		process.exit(1);
	}
}

void runMigration();
