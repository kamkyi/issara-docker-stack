/**
 * Compresses an image provided as base64 string
 * @param imageData Base64 string of the image data
 * @returns Promise<string> Compressed image as base64 string
 */
export const compressImage = async (imageData: string): Promise<string> => {
	// Return original if not a valid base64 image
	if (!imageData.startsWith("data:image")) {
		return imageData;
	}

	// Create an image element to load the data
	const img = new Image();
	img.src = imageData;

	return new Promise((resolve) => {
		img.onload = () => {
			// Create a canvas to draw and compress the image
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");

			// Calculate new dimensions (max 800px width/height while maintaining aspect ratio)
			let width = img.width;
			let height = img.height;
			const maxSize = 800;

			if (width > maxSize || height > maxSize) {
				if (width > height) {
					height = Math.round((height * maxSize) / width);
					width = maxSize;
				} else {
					width = Math.round((width * maxSize) / height);
					height = maxSize;
				}
			}

			// Set canvas dimensions and draw image
			canvas.width = width;
			canvas.height = height;
			ctx?.drawImage(img, 0, 0, width, height);

			// Convert to base64 with compression
			const compressedData = canvas.toDataURL("image/jpeg", 0.8);
			resolve(compressedData);
		};

		// Handle load errors
		img.onerror = () => {
			resolve(imageData); // Return original on error
		};
	});
};
