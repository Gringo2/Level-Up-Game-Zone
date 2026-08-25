import { COLLECTIONS } from "@level-up/shared";
import { db } from "../firebase.js";
import { logger } from "../utils/logger.js";

async function runMigration() {
	logger.info("Starting credits foreign key migration...");

	try {
		// 1. Fetch all employees
		const employeesSnap = await db.collection(COLLECTIONS.EMPLOYEES).get();
		const employeesByName: Record<string, string> = {};

		employeesSnap.forEach((doc) => {
			const data = doc.data();
			const name = data.name.trim().toLowerCase();
			employeesByName[name] = doc.id;
		});

		logger.info(`Loaded ${employeesSnap.size} employees for matching.`);

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
				logger.warn(
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

		logger.info("\nMigration Summary:");
		logger.info(`- Credits successfully linked: ${updatedCount}`);
		logger.info(`- Credits unlinked (historical/missing): ${missingCount}`);
		logger.info("Migration completed.");
	} catch (error) {
		logger.error({ err: error }, "Migration failed");
		process.exit(1);
	}
}

void runMigration();
