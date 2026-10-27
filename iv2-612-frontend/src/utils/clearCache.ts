import { db } from "$src/db/database";

const PROGRESS_KEY_PREFIX = "gm-diagnostic-progress";

/**
 * Clears all client-side cache: localStorage, sessionStorage, and Dexie IndexedDB
 */
export async function clearAllClientCache({
	reload = false,
}: {
	reload?: boolean;
} = {}) {
	try {
		const preservedProgressEntries = Object.entries(localStorage).filter(
			([key]) =>
				key === PROGRESS_KEY_PREFIX ||
				key.startsWith(`${PROGRESS_KEY_PREFIX}:`),
		);

		localStorage.clear();

		for (const [key, value] of preservedProgressEntries) {
			localStorage.setItem(key, value);
		}

		sessionStorage.clear();
		// Delete Dexie database (IndexedDB)
		await db.delete();
		if (reload) {
			window.location.href = "/";
		}
	} catch (error) {
		console.error("Error clearing client cache:", error);
	}
}
