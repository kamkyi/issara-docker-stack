import { Cross2Icon, RocketIcon, UploadIcon } from "@radix-ui/react-icons";
import {
	Box,
	Card,
	Container,
	Flex,
	Text,
	TextArea,
	TextField,
} from "@radix-ui/themes";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import "react-datepicker/dist/react-datepicker.css";
import GoldenDreamsImage from "$src/assets/img/message_board/mb_golden_dreams.jpg";
import LabourImage from "$src/assets/img/message_board/mb_labourday.jpg";
import MedicalImage from "$src/assets/img/message_board/mb_medical_checkup.jpg";
import { showToast } from "$src/components/toast/toastUtil";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";

export const Route = createFileRoute("/news/upload")({
	beforeLoad: () => {
		const { isAuthenticated } = authStatus();
		if (!isAuthenticated) {
			throw new Error("Authentication required");
		}
	},
	component: RouteComponent,
});

interface NewsFormData {
	title: string;
	description: string;
	image: File | null;
	publishDate: Date;
}

function RouteComponent() {
	const navigate = useNavigate();
	const [formData, setFormData] = useState<NewsFormData>({
		title: "",
		description: "",
		image: null,
		publishDate: new Date(),
	});
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Mock uploaded news data - replace with actual API call
	const [uploadedNews] = useState([
		{
			id: 1,
			title: "Company Achieves Sustainability Milestone",
			description: "Our company has reached a major sustainability goal...",
			image: GoldenDreamsImage,
			publishDate: new Date("2024-01-15"),
			status: "published",
		},
		{
			id: 2,
			title: "New Partnership Announcement",
			description: "We are excited to announce our partnership with...",
			image: MedicalImage,
			publishDate: new Date("2024-01-10"),
			status: "published",
		},
		{
			id: 3,
			title: "Q4 Results Released",
			description: "Strong performance in the fourth quarter...",
			image: LabourImage,
			publishDate: new Date("2024-01-05"),
			status: "draft",
		},
	]);

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(false);

		const files = e.dataTransfer.files;
		if (files?.[0]) {
			handleImageFile(files[0]);
		}
	};

	const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files?.[0]) {
			handleImageFile(files[0]);
		}
	};

	const handleImageFile = (file: File) => {
		// Validate file type
		if (!file.type.startsWith("image/")) {
			showToast.error("Please upload an image file");
			return;
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			showToast.error("Image size should be less than 5MB");
			return;
		}

		setFormData((prev) => ({ ...prev, image: file }));

		// Create preview
		const reader = new FileReader();
		reader.onloadend = () => {
			setImagePreview(reader.result as string);
		};
		reader.readAsDataURL(file);
	};

	const handleRemoveImage = () => {
		setFormData((prev) => ({ ...prev, image: null }));
		setImagePreview(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validation
		if (!formData.title.trim()) {
			showToast.warning("Please enter a title");
			return;
		}

		if (!formData.description.trim()) {
			showToast.warning("Please enter a description");
			return;
		}

		if (!formData.image) {
			showToast.warning("Please upload an image");
			return;
		}

		setIsSubmitting(true);

		try {
			// TODO: Replace with actual API call
			const formDataToSend = new FormData();
			formDataToSend.append("title", formData.title);
			formDataToSend.append("description", formData.description);
			formDataToSend.append("image", formData.image);
			formDataToSend.append("publishDate", formData.publishDate.toISOString());

			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 1000));

			showToast.success("News published successfully!");
			navigate({ to: "/message-board" });
		} catch (error) {
			console.error("Error publishing news:", error);
			showToast.error("Failed to publish news. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	// const handleCancel = () => {
	// 	if (
	// 		formData.title ||
	// 		formData.description ||
	// 		formData.image ||
	// 		window.confirm(
	// 			"Are you sure you want to cancel? All changes will be lost.",
	// 		)
	// 	) {
	// 		navigate({ to: "/message-board" });
	// 	}
	// };

	return (
		<GuestLayout>
			<Container className="py-8" size="4">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Left Column - Uploaded News List */}
					<div className="lg:col-span-2">
						<Card className="shadow-lg ">
							<Box p="4">
								<Text className="text-xl font-bold">News</Text>
								<hr className="opacity-10 my-2" />

								<div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
									{uploadedNews.length === 0 ? (
										<Text className="text-gray-500 text-center py-8">
											No news uploaded yet
										</Text>
									) : (
										uploadedNews.map((news) => (
											<Card
												className="hover:shadow-md transition-shadow cursor-pointer input-radius"
												key={news.id}
											>
												<Box p="2">
													<Flex gap="3">
														<img
															alt={news.title}
															className="w-16 h-16 object-cover rounded"
															src={news.image}
														/>
														<div className="flex-1 min-w-0">
															<Text className="font-semibold text-sm line-clamp-2 mb-1">
																{news.title}
															</Text>
															<Text className="text-xs text-gray-500 mb-1">
																{news.publishDate.toLocaleDateString()}
															</Text>
															<span
																className={`inline-block px-2 py-0.5 text-xs rounded-full ${
																	news.status === "published"
																		? "bg-green-100 text-green-700"
																		: "bg-yellow-100 text-yellow-700"
																}`}
															>
																{news.status}
															</span>
														</div>
													</Flex>
												</Box>
											</Card>
										))
									)}
								</div>
							</Box>
						</Card>
					</div>

					{/* Right Column - Upload Form */}
					<div className="lg:col-span-1">
						<Card className="shadow-lg">
							<Box className="input-radius" p="4">
								<Text className="text-xl font-bold">Upload News</Text>
								<hr className="opacity-10 my-2" />

								<form onSubmit={handleSubmit}>
									<Flex direction="column" gap="5">
										{/* Title */}
										<Box>
											<Text
												as="label"
												className="block mb-2 font-semibold"
												size="2"
											>
												Title <span className="text-red-500">*</span>
											</Text>
											<TextField.Root
												className="input-radius"
												maxLength={100}
												onChange={(e) =>
													setFormData((prev) => ({
														...prev,
														title: e.target.value,
													}))
												}
												placeholder="Enter news title"
												required
												size="2"
												value={formData.title}
											/>
										</Box>

										{/* Description */}
										<Box>
											<Text
												as="label"
												className="block mb-2 font-semibold"
												size="2"
											>
												Description <span className="text-red-500">*</span>
											</Text>
											<TextArea
												className="input-radius"
												maxLength={500}
												onChange={(e) =>
													setFormData((prev) => ({
														...prev,
														description: e.target.value,
													}))
												}
												placeholder="Description (maximum 500 characters)"
												required
												rows={6}
												size="2"
												value={formData.description}
											/>
										</Box>

										{/* Image Upload */}
										<Box>
											<Text
												as="label"
												className="block mb-2 font-semibold"
												size="2"
											>
												Image <span className="text-red-500">*</span>
											</Text>

											{!imagePreview ? (
												<div
													className={`border-2 border-dashed rounded-md p-8 text-center transition-colors ${
														isDragging
															? "border-blue-500 bg-blue-50"
															: "border-gray-300 hover:border-gray-400"
													}`}
													onDragLeave={handleDragLeave}
													onDragOver={handleDragOver}
													onDrop={handleDrop}
												>
													<input
														accept="image/*"
														className="hidden"
														id={"image-upload"}
														onChange={handleFileInput}
														type="file"
													/>
													<label
														className="cursor-pointer flex flex-col items-center"
														htmlFor="image-upload"
													>
														<UploadIcon className="w-12 h-12 text-gray-400 mb-3" />
														<Text className="text-lg font-medium mb-2">
															Drop your image here, or{" "}
															<span className="text-blue-500">browse</span>
														</Text>
														<Text className="text-sm text-gray-500">
															Supports: JPG, PNG, GIF (Max 5MB)
														</Text>
													</label>
												</div>
											) : (
												<div className="relative border-2 border-gray-300 rounded-md p-4">
													<button
														className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
														onClick={handleRemoveImage}
														type="button"
													>
														<Cross2Icon className="w-4 h-4" />
													</button>
													<img
														alt="Preview"
														className="max-h-64 mx-auto rounded"
														src={imagePreview}
													/>
													<Text className="text-center mt-2 text-sm text-gray-600">
														{formData.image?.name}
													</Text>
												</div>
											)}
										</Box>

										{/* Action Buttons */}
										<Flex gap="3" justify="end" mt="4">
											<CascadeButton
												buttonText={"Cancel"}
												disabled={isSubmitting}
												handleOnClick={() => {
													console.log("Publishing News...");
												}}
												size="3"
												variant="outline"
											/>
											<CascadeButton
												buttonText={
													isSubmitting ? "Publishing..." : "Publish News"
												}
												disabled={isSubmitting}
												handleOnClick={() => {
													console.log("Publishing News...");
												}}
												iconRight={<RocketIcon />}
												size="3"
											/>
										</Flex>
									</Flex>
								</form>
							</Box>
						</Card>
					</div>
				</div>
			</Container>
		</GuestLayout>
	);
}

import { createFileRoute } from "@tanstack/react-router";
import CascadeButton from "$src/components/button/button";
