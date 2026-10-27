/**
 * Creates a safe key for storage by removing invalid characters
 * @param prefix Prefix for the storage key
 * @param id Identifier to append to the prefix
 * @returns string Safe storage key
 */
export const createSafeKey = (
	prefix: string,
	id?: string | number | null,
): string => {
	if (!id) {
		return `${prefix}_anonymous`;
	}
	// Convert id to string and remove any characters that might be problematic for storage keys
	const stringId = String(id);
	const safeId = stringId.replace(/[^a-zA-Z0-9-_]/g, "_");
	return `${prefix}_${safeId}`;
};

/**
 * Separates company data into basic data and logo data for efficient storage
 * @param data Company data object
 * @returns Object with separated basic data and logo data
 */
export const separateCompanyDataForStorage = (data: any) => {
	if (!data) {
		return { basicData: null, logoData: null };
	}

	const { logoData, ...basicData } = data;

	return {
		basicData,
		logoData: logoData || null,
	};
};
