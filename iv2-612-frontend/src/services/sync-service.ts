import { api } from "$src/api/axios";
import { db } from "../db/database";

class SyncService {
	private syncInProgress = false;

	// Sync shared data with server
	async syncSharedData(): Promise<void> {
		if (this.syncInProgress) return;

		try {
			this.syncInProgress = true;

			// Get all unsynced operations
			const unsyncedLogs = await db.syncLog.where("synced").equals(0).toArray();

			if (unsyncedLogs.length === 0) {
				console.log("No unsynced data to synchronize");
				return;
			}

			// Group by operation for batch processing
			const creates = unsyncedLogs.filter((log) => log.operation === "create");
			const updates = unsyncedLogs.filter((log) => log.operation === "update");
			const deletes = unsyncedLogs.filter((log) => log.operation === "delete");

			// Perform syncing with backend if available
			try {
				if (creates.length > 0) {
					await api.post("/api/shared-data/batch", {
						operations: creates.map((log) => ({
							id: log.recordId,
							...log.data,
						})),
					});

					// Mark as synced
					await db.syncLog.bulkPut(
						creates.map((log) => ({ ...log, synced: true })),
					);
				}

				if (updates.length > 0) {
					await api.put("/api/shared-data/batch", {
						operations: updates.map((log) => ({
							id: log.recordId,
							...log.data,
						})),
					});

					// Mark as synced
					await db.syncLog.bulkPut(
						updates.map((log) => ({ ...log, synced: true })),
					);
				}

				if (deletes.length > 0) {
					await api.delete("/api/shared-data/batch", {
						data: { ids: deletes.map((log) => log.recordId) },
					});

					// Mark as synced
					await db.syncLog.bulkPut(
						deletes.map((log) => ({ ...log, synced: true })),
					);
				}

				// Update lastSyncedAt for all synced records
				const now = new Date();
				for (const log of [...creates, ...updates]) {
					if (log.table === "sharedData") {
						await db.sharedData.update(log.recordId, {
							lastSyncedAt: now,
						});
					}
				}

				console.log(`Synced ${unsyncedLogs.length} operations with server`);
			} catch (error) {
				console.error("Failed to sync with server:", error);
				// We don't mark them as synced if there was an error
			}
		} finally {
			this.syncInProgress = false;
		}
	}

	// Download shared data updates from server
	async downloadSharedData(): Promise<void> {
		try {
			// Get the most recent sync timestamp
			const lastSync = await db.sharedData.orderBy("lastSyncedAt").last();

			const lastSyncTime = lastSync?.lastSyncedAt
				? new Date(lastSync.lastSyncedAt).toISOString()
				: null;

			// Fetch updates from server
			const { data } = await api.get("/api/shared-data/updates", {
				params: { since: lastSyncTime },
			});

			if (!data || !data.length) {
				console.log("No new shared data updates");
				return;
			}

			// Update local database with server data
			const now = new Date();

			await db.transaction("rw", db.sharedData, async () => {
				for (const item of data) {
					const existing = await db.sharedData.where({ key: item.key }).first();

					if (existing?.id) {
						await db.sharedData.update(existing.id, {
							value: item.value,
							updatedAt: new Date(item.updatedAt || now),
							lastSyncedAt: now,
						});
					} else {
						await db.sharedData.add({
							key: item.key,
							value: item.value,
							updatedAt: new Date(item.updatedAt || now),
							lastSyncedAt: now,
						});
					}
				}
			});

			console.log(`Downloaded ${data.length} shared data updates`);
		} catch (error) {
			console.error("Failed to download shared data:", error);
		}
	}

	// Perform full sync (upload local changes, download updates)
	async performFullSync(): Promise<void> {
		await this.syncSharedData();
		// await this.downloadSharedData();
	}
}

// Create singleton instance
export const syncService = new SyncService();
