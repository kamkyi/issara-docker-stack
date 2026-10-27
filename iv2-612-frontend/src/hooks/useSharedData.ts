import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useState } from "react";
import { dbService } from "../services/db-service";
import { syncService } from "../services/sync-service";

export function useSharedData<T = any>(key: string, defaultValue?: T) {
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	// Live query to react to database changes
	const data = useLiveQuery(async () => {
		try {
			const value = await dbService.getSharedData(key);
			return value !== null ? value : defaultValue;
		} catch (err) {
			setError(err instanceof Error ? err : new Error(String(err)));
			return defaultValue;
		} finally {
			setIsLoading(false);
		}
	}, [key, defaultValue]);

	// Update shared data
	const updateData = useCallback(
		async (newValue: T) => {
			try {
				setIsLoading(true);
				await dbService.setSharedData(key, newValue);

				// Try to sync the change immediately
				syncService
					.syncSharedData()
					.catch((err) => console.error("Background sync failed:", err));

				return true;
			} catch (err) {
				setError(err instanceof Error ? err : new Error(String(err)));
				return false;
			} finally {
				setIsLoading(false);
			}
		},
		[key],
	);

	// Force sync with server
	const syncWithServer = useCallback(async () => {
		try {
			setIsLoading(true);
			await syncService.performFullSync();
			return true;
		} catch (err) {
			setError(err instanceof Error ? err : new Error(String(err)));
			return false;
		} finally {
			setIsLoading(false);
		}
	}, []);

	return {
		data,
		isLoading,
		error,
		updateData,
		syncWithServer,
	};
}
