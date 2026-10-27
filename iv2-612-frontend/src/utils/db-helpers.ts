/**
 * Utility functions to help with IndexedDB operations
 */

/**
 * Ensures a value is a valid IndexedDB key
 * Valid keys are: numbers, strings, Dates, and Arrays of these types
 */
export function ensureValidKey(key: any): string | number | Date | Array<any> {
	if (key === undefined || key === null) {
		return "undefined_key";
	}

	// If it's already a valid simple key type
	if (
		typeof key === "string" ||
		typeof key === "number" ||
		key instanceof Date
	) {
		return key;
	}

	// If it's an array, make sure all items are valid keys
	if (Array.isArray(key)) {
		return key.map(ensureValidKey);
	}

	// For objects or other types, convert to string
	return String(key);
}

/**
 * Safely creates a compound key for IndexedDB
 */
export function createSafeKey(prefix: string, id?: any): string {
	// Ensure id is a valid string and doesn't contain characters that might cause issues
	const safeId =
		id !== undefined && id !== null
			? String(id).replace(/[^\w-]/g, "_")
			: "anonymous";
	return `${prefix}${safeId}`;
}

/**
 * Creates a safe bound for use in IDBKeyRange
 * This is especially useful for fixing the "Failed to execute 'bound' on 'IDBKeyRange'" error
 */
export function createSafeBound(
	lower: any,
	upper: any,
	lowerOpen?: boolean,
	upperOpen?: boolean,
) {
	try {
		// Ensure both values are valid keys
		const safeLower = ensureValidKey(lower);
		const safeUpper = ensureValidKey(upper);

		// Create the bound
		return IDBKeyRange.bound(
			safeLower,
			safeUpper,
			lowerOpen || false,
			upperOpen || false,
		);
	} catch (error) {
		console.warn("Failed to create IDBKeyRange bound, using fallback", {
			lower,
			upper,
			error,
		});
		// Return a safe fallback range
		return IDBKeyRange.lowerBound("");
	}
}

/**
 * Safely handles IndexedDB transaction errors
 */
export function safeDbOperation<T>(
	operation: () => Promise<T>,
	fallback: T,
): Promise<T> {
	return operation().catch((error) => {
		console.warn("IndexedDB operation failed:", error);
		return fallback;
	});
}
