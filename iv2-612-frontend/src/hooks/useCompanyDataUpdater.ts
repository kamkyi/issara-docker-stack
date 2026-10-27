import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";

/**
 * Custom hook for managing company data updates
 * Provides a clean interface for updating company data fields
 */
export function useCompanyDataUpdater(
	setCompanyData: Dispatch<SetStateAction<any>>,
) {
	const updateField = useCallback(
		<K extends string>(field: K, value: any) => {
			setCompanyData((prev: any) => ({
				...prev,
				[field]: value,
			}));
		},
		[setCompanyData],
	);

	const updateMultipleFields = useCallback(
		(updates: Record<string, any>) => {
			setCompanyData((prev: any) => ({
				...prev,
				...updates,
			}));
		},
		[setCompanyData],
	);

	const updateNestedField = useCallback(
		(path: string, value: any) => {
			const keys = path.split(".");
			setCompanyData((prev: any) => {
				const updated = { ...prev };
				let current = updated;

				for (let i = 0; i < keys.length - 1; i++) {
					const key = keys[i];
					current[key] = current[key] ? { ...current[key] } : {};
					current = current[key];
				}

				current[keys[keys.length - 1]] = value;
				return updated;
			});
		},
		[setCompanyData],
	);

	return {
		updateField,
		updateMultipleFields,
		updateNestedField,
	};
}
