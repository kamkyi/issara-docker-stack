import Dexie, { type Table } from "dexie";

// Define interfaces for our data models
export interface UserData {
	id?: number;
	userId: string;
	key: string;
	value: any;
	updatedAt: Date;
}

export interface SharedData {
	id?: number;
	key: string;
	value: any;
	updatedAt: Date;
	lastSyncedAt?: Date;
}

export interface SyncLog {
	id?: number;
	operation: "create" | "update" | "delete";
	table: string;
	recordId: number;
	data: any;
	timestamp: Date;
	synced: boolean;
}

// Create and export the database class
class ILMDatabase extends Dexie {
	userData!: Table<UserData>;
	sharedData!: Table<SharedData>;
	syncLog!: Table<SyncLog>;
	queryCache!: Table<any>;

	constructor() {
		super("ILMDatabase");

		// Define tables and indexes
		this.version(1).stores({
			userData: "++id, userId, key, updatedAt",
			sharedData: "++id, key, updatedAt, lastSyncedAt",
			syncLog: "++id, operation, table, synced, timestamp",
			queryCache: "key", // For React Query cache storage
		});
	}
}

// Create a singleton instance
export const db = new ILMDatabase();

// Export Dexie for use in other modules
export { Dexie };
