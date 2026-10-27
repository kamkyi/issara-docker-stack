/**
 * Safely ensures the given value is returned as a JavaScript Array.
 * - If `val` is already an Array, returns `val`.
 * - If `val` is a JSON array string (e.g. '["a", "b"]'), parses and returns the array.
 * - If `val` is a non-empty string, wraps it in a single-element array `[val]`.
 * - For `null`, `undefined`, non-array objects, numbers, booleans, returns `[]`.
 */
export function ensureArray<T = any>(val: unknown): T[] {
	if (Array.isArray(val)) {
		return val;
	}
	if (typeof val === "string") {
		const trimmed = val.trim();
		if (!trimmed) return [];
		if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
			try {
				const parsed = JSON.parse(trimmed);
				if (Array.isArray(parsed)) {
					return parsed;
				}
			} catch (_) {
				// ignore invalid JSON
			}
		}
		return [trimmed as unknown as T];
	}
	return [];
}
