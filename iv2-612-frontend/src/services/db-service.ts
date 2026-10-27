// Authentication utilities
import { useAuth } from "@workos-inc/authkit-react";
import { db } from "../db/database";

class DatabaseService {
	// User-specific data operations
	async getUserData(key: string): Promise<any> {
		const { user } = useAuth();

		const userId = user?.id;
		if (!userId) return null;

		const record = await db.userData.where({ userId, key }).first();

		return record?.value ?? null;
	}

	async setUserData(key: string, value: any): Promise<number> {
		const { user } = useAuth();

		const userId = user?.id;

		if (!userId) throw new Error("User not authenticated");

		const existing = await db.userData.where({ userId, key }).first();

		const updatedAt = new Date();

		if (existing?.id) {
			await db.userData.update(existing.id, {
				value,
				updatedAt,
			});
			return existing.id;
		} else {
			return await db.userData.add({
				userId,
				key,
				value,
				updatedAt,
			});
		}
	}

	// Shared data operations
	async getSharedData(key: string): Promise<any> {
		const record = await db.sharedData.where({ key }).first();

		return record?.value ?? null;
	}

	async setSharedData(key: string, value: any): Promise<number> {
		const existing = await db.sharedData.where({ key }).first();

		const updatedAt = new Date();

		if (existing?.id) {
			await db.sharedData.update(existing.id, {
				value,
				updatedAt,
			});

			// Add to sync log
			await this.addToSyncLog("update", "sharedData", existing.id, {
				key,
				value,
			});

			return existing.id;
		} else {
			const id = await db.sharedData.add({
				key,
				value,
				updatedAt,
			});

			// Add to sync log
			await this.addToSyncLog("create", "sharedData", id, { key, value });

			return id;
		}
	}

	// Sync log operations
	private async addToSyncLog(
		operation: "create" | "update" | "delete",
		table: string,
		recordId: number,
		data: any,
	): Promise<void> {
		await db.syncLog.add({
			operation,
			table,
			recordId,
			data,
			timestamp: new Date(),
			synced: false,
		});
	}

	// Query cache operations (for React Query)
	async getQueryCache(key: string): Promise<any> {
		const record = await db.queryCache.get(key);
		return record?.value ?? null;
	}

	async setQueryCache(key: string, value: any): Promise<void> {
		await db.queryCache.put({ key, value });
	}

	async deleteQueryCache(key: string): Promise<void> {
		await db.queryCache.delete(key);
	}
}

// Create singleton instance
export const dbService = new DatabaseService();
