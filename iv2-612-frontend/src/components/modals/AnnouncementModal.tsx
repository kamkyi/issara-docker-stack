import { Cross2Icon, PaperPlaneIcon } from "@radix-ui/react-icons";
import { Box, Button, Dialog, Flex, Text } from "@radix-ui/themes";
import { useTheme } from "next-themes";
import type React from "react";
import { useEffect, useState } from "react";
import UploadArea from "../inputs/uploadArea";

// Define the announcement data structure
interface AnnouncementData {
	title: string;
	description: string;
	images: File[];
}

// Define the props for the AnnouncementModal component
interface AnnouncementModalProps {
	isOpen: boolean; // Controls whether the modal is open
	onClose: () => void; // Function to call when the modal should be closed
	onSubmit: (announcementData: AnnouncementData) => void | Promise<void>; // Function to call when the form is submitted
	isSubmitting?: boolean;
	errorMessage?: string | null;
	initialData?: Pick<AnnouncementData, "title" | "description"> | null;
	mode?: "create" | "edit";
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
	errorMessage,
	isOpen,
	isSubmitting = false,
	initialData = null,
	mode = "create",
	onClose,
	onSubmit,
}) => {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [uploadedImages, setUploadedImages] = useState<File[]>([]);

	useEffect(() => {
		if (!isOpen) return;
		setTitle(initialData?.title ?? "");
		setDescription(initialData?.description ?? "");
		setUploadedImages([]);
	}, [initialData, isOpen]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		const announcementData: AnnouncementData = {
			title,
			description,
			images: uploadedImages,
		};

		onSubmit(announcementData);
	};

	const handleFilesChange = (files: File[]) => {
		setUploadedImages((prev) => [...prev, ...files]);
	};

	const { theme } = useTheme();

	return (
		<Dialog.Root
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			open={isOpen}
		>
			<Dialog.Content
				style={{
					maxWidth: 600,
					background: theme === "dark" ? "#004A60" : "rgba(239, 253, 255, 1)",
				}}
			>
				<Flex align="center" justify="between">
					<Dialog.Title mb="0">
						{mode === "edit" ? "Edit Announcement" : "Create Announcement"}
					</Dialog.Title>
					<Dialog.Close>
						<Button
							className="rounded-full"
							onClick={onClose}
							size="2"
							variant="ghost"
						>
							<Cross2Icon />
						</Button>
					</Dialog.Close>
				</Flex>
				<Dialog.Description mb="4" size="2">
					{mode === "edit"
						? "Update this announcement for your company group."
						: "Fill out the form below to create an announcement."}
				</Dialog.Description>
				<form onSubmit={handleSubmit}>
					<Flex direction="column" gap="3">
						<Box>
							<Text as="div" mb="1" size="2" weight="bold">
								Title
							</Text>
							<input
								className="border border-gray-300 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-3"
								maxLength={600}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Add Title"
								required
								type="text"
								value={title}
							/>
						</Box>

						<Box>
							<Text as="div" mb="1" size="2" weight="bold">
								Description
							</Text>
							<textarea
								className="border border-gray-300 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-3"
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Add Description"
								required
								rows={5}
								value={description}
							/>
						</Box>

						<Box>
							<Text as="div" mb="1" size="2" weight="bold">
								{mode === "edit" ? "Replace Image" : "Upload Images"}
							</Text>
							<UploadArea onFilesChange={handleFilesChange} />
						</Box>
						{errorMessage && (
							<Text className="text-[#004A60]" size="2">
								{errorMessage}
							</Text>
						)}
					</Flex>

					<Flex gap="3" justify="end" mt="4">
						<Button
							onClick={onClose}
							size={"3"}
							style={{ background: "#004A60", cursor: "pointer" }}
							type="button"
						>
							Cancel
						</Button>
						<Button
							// endIcon={<PaperPlaneIcon />}
							disabled={isSubmitting}
							size={"3"}
							style={{ background: "#148696", cursor: "pointer" }}
							type="submit"
						>
							<PaperPlaneIcon />
							{isSubmitting
								? mode === "edit"
									? "Saving..."
									: "Posting..."
								: mode === "edit"
									? "Save Changes"
									: "Post"}
						</Button>
					</Flex>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	);
};
