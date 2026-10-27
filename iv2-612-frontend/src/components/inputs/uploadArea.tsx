import type React from "react";
import { useCallback, useState } from "react";

interface UploadAreaProps {
	onFilesChange?: (files: File[]) => void;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onFilesChange }) => {
	const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
	const [previews, setPreviews] = useState<string[]>([]);

	const handleFileChange = useCallback(
		(files: FileList | null) => {
			if (!files) return;

			const fileArray = Array.from(files);
			const imageFiles = fileArray.filter((file) =>
				file.type.startsWith("image/"),
			);

			setUploadedFiles((prev) => [...prev, ...imageFiles]);

			// Create preview URLs
			const newPreviews = imageFiles.map((file) => URL.createObjectURL(file));
			setPreviews((prev) => [...prev, ...newPreviews]);

			// Notify parent component
			onFilesChange?.(imageFiles);
		},
		[onFilesChange],
	);

	const removeFile = useCallback((index: number) => {
		setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
		setPreviews((prev) => {
			// Revoke the URL to prevent memory leaks
			URL.revokeObjectURL(prev[index]);
			return prev.filter((_, i) => i !== index);
		});
	}, []);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		handleFileChange(e.target.files);
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		handleFileChange(e.dataTransfer.files);
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
	};

	return (
		<div className="w-full">
			<div className="flex items-center justify-center w-full">
				<label
					className="flex flex-col items-center justify-center w-full h-44 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:opacity-70"
					htmlFor="dropzone-file"
					onDragOver={() => handleDragOver}
					onDrop={() => handleDrop}
				>
					<div className="flex flex-col items-center justify-center pt-5 pb-6">
						<svg
							aria-hidden="true"
							className="w-8 h-8 mb-4 text-gray-500"
							fill="none"
							viewBox="0 0 20 16"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
							/>
						</svg>
						<p className="mb-2 text-sm text-gray-500">
							<span className="font-semibold">Click to upload</span> or drag and
							drop
						</p>
						<p className="text-xs text-gray-500">
							SVG, PNG, JPG or GIF (MAX. 800x400px)
						</p>
					</div>
					<input
						accept="image/*"
						className="hidden"
						id={"dropzone-file"}
						multiple
						onChange={handleInputChange}
						type="file"
					/>
				</label>
			</div>

			{/* Display uploaded images */}
			{uploadedFiles.length > 0 && (
				<div className="mt-4">
					<p className="text-sm font-medium text-gray-700 mb-2">
						Uploaded Images ({uploadedFiles.length})
					</p>
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
						{previews.map((preview, index) => (
							<div className="relative group" key={index}>
								<img
									alt={`Upload ${index + 1}`}
									className="w-full h-24 object-cover rounded-md border border-gray-200"
									src={preview}
								/>
								<button
									className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
									onClick={() => removeFile(index)}
									type="button"
								>
									×
								</button>
								<div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
									{uploadedFiles[index].name}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default UploadArea;
