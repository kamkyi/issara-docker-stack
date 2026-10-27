import type {
	PersistedClient,
	Persister,
} from "@tanstack/react-query-persist-client";
import { db } from "../db/database";

/**
 * Creates a Dexie-based persister for React Query
 * Uses the queryCache table in our ILMDatabase
 */
export function createIDBPersister(idbValidKey: string = "reactQuery") {
	return {
		persistClient: async (client: PersistedClient) => {
			const serialized = JSON.stringify(client);
			// Store in our queryCache table
			await db.queryCache.put({ key: idbValidKey, value: serialized });
		},

		restoreClient: async () => {
			// Get from our queryCache table
			const record = await db.queryCache.get(idbValidKey);
			if (!record) {
				return undefined;
			}
			return JSON.parse(record.value) as PersistedClient;
		},

		removeClient: async () => {
			// Delete from our queryCache table
			await db.queryCache.delete(idbValidKey);
		},
	} satisfies Persister;
}
