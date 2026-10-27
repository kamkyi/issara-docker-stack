import { ensureValidKey } from "./db-helpers";

/**
 * This file patches the native IDBKeyRange methods to prevent "Invalid key" errors
 * by automatically sanitizing parameters
 */

// Store original methods before patching
const originalBound = IDBKeyRange.bound;
const originalLowerBound = IDBKeyRange.lowerBound;
const originalUpperBound = IDBKeyRange.upperBound;
const originalOnly = IDBKeyRange.only;

// Replace IDBKeyRange.bound with a safer version
IDBKeyRange.bound = function safebound(
	lower: any,
	upper: any,
	lowerOpen?: boolean,
	upperOpen?: boolean,
) {
	try {
		// Handle undefined/null values with safe defaults
		if (lower === undefined || lower === null) {
			lower = "";
		}
		if (upper === undefined || upper === null) {
			upper = "\uffff"; // High code point as a safe upper bound
		}

		// Sanitize the keys
		const safeLower = ensureValidKey(lower);
		const safeUpper = ensureValidKey(upper);

		// Call original with sanitized values
		return originalBound.call(
			this,
			safeLower,
			safeUpper,
			!!lowerOpen,
			!!upperOpen,
		);
	} catch (error) {
		console.warn(
			"[IDBKeyRange Patch] Error in bound(), using fallback:",
			error,
		);
		// Return a fallback that's guaranteed to work
		return originalLowerBound.call(this, "");
	}
};

// Replace IDBKeyRange.lowerBound with a safer version
IDBKeyRange.lowerBound = function safelowerbound(lower: any, open?: boolean) {
	try {
		const safeLower = ensureValidKey(lower ?? "");
		return originalLowerBound.call(this, safeLower, !!open);
	} catch (error) {
		console.warn(
			"[IDBKeyRange Patch] Error in lowerBound(), using fallback:",
			error,
		);
		return originalLowerBound.call(this, "");
	}
};

// Replace IDBKeyRange.upperBound with a safer version
IDBKeyRange.upperBound = function safeupperbound(upper: any, open?: boolean) {
	try {
		const safeUpper = ensureValidKey(upper ?? "\uffff");
		return originalUpperBound.call(this, safeUpper, !!open);
	} catch (error) {
		console.warn(
			"[IDBKeyRange Patch] Error in upperBound(), using fallback:",
			error,
		);
		return originalUpperBound.call(this, "\uffff");
	}
};

// Replace IDBKeyRange.only with a safer version
IDBKeyRange.only = function safeonly(value: any) {
	try {
		const safeValue = ensureValidKey(value ?? "");
		return originalOnly.call(this, safeValue);
	} catch (error) {
		console.warn("[IDBKeyRange Patch] Error in only(), using fallback:", error);
		return originalOnly.call(this, "");
	}
};

console.log(
	"[IDBKeyRange Patch] Applied - all IDBKeyRange methods now handle invalid keys gracefully",
);
