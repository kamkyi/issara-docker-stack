import type { Company } from "$src/components/directory/types";

// Function to compress image data URL
export const compressImage = async (
	dataUrl: string,
	maxWidth = 800,
	quality = 0.8,
): Promise<string> => {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			// Create canvas for resizing
			const canvas = document.createElement("canvas");
			let width = img.width;
			let height = img.height;

			// Calculate new dimensions if image is too large
			if (width > maxWidth) {
				const ratio = maxWidth / width;
				width = maxWidth;
				height = height * ratio;
			}

			canvas.width = width;
			canvas.height = height;

			// Draw and compress
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(new Error("Could not get canvas context"));
				return;
			}

			ctx.drawImage(img, 0, 0, width, height);
			resolve(canvas.toDataURL("image/jpeg", quality));
		};
		img.onerror = reject;
		img.src = dataUrl;
	});
};

// Function to separate company data for storage
export const separateCompanyDataForStorage = (data: Partial<Company>) => {
	// Make sure we convert non-serializable data to serializable format
	// Extract logo data to store separately
	const { logoData, ...basicData } = data;

	// Ensure any Date objects are converted to ISO strings
	const cleanedData = Object.entries(basicData).reduce(
		(acc, [key, value]) => {
			// Convert Date objects to strings
			if (value instanceof Date) {
				acc[key] = value.toISOString();
			}
			// Ensure arrays have valid contents
			else if (Array.isArray(value)) {
				acc[key] = value.map((item) =>
					typeof item === "object" && item !== null
						? JSON.parse(JSON.stringify(item))
						: item,
				);
			}
			// Keep primitive values as is
			else {
				acc[key] = value;
			}
			return acc;
		},
		{} as Record<string, any>,
	);

	return { basicData: cleanedData, logoData };
};

// Safe function to create valid IndexedDB keys
export const createSafeKey = (prefix: string, id?: string | number): string => {
	// Ensure id is a valid string and doesn't contain characters that might cause issues
	const safeId = id ? String(id).replace(/[^\w-]/g, "_") : "anonymous";
	return `${prefix}${safeId}`;
};
