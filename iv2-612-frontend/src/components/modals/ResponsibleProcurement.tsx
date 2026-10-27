import { Cross2Icon } from "@radix-ui/react-icons";
import {
	Box,
	Button,
	Dialog,
	Flex,
	Select,
	Separator,
	Text,
} from "@radix-ui/themes";
import type React from "react";
import { useState } from "react";

type FeedbackType = "org-supplier" | "org-recruitment-agency";

const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
	"org-recruitment-agency": "Recruitment Agency",
	"org-supplier": "Supplier",
};

const getFeedbackType = (): FeedbackType => {
	if (typeof window === "undefined") {
		return "org-supplier";
	}

	const storedFeedbackType = window.localStorage.getItem("feedbackType");

	return storedFeedbackType === "org-recruitment-agency"
		? "org-recruitment-agency"
		: "org-supplier";
};

// Define the props for the ResponsibleProcurementModal component
interface ResponsibleProcurementProps {
	isOpen: boolean; // Controls whether the modal is open
	onClose: () => void; // Function to call when the modal should be closed
	onSubmit: (feedbackData: any) => void; // Function to call when the form is submitted
}

export const ResponsibleProcurementModal: React.FC<
	ResponsibleProcurementProps
> = ({ isOpen, onClose, onSubmit }) => {
	// State to store the selected answers for the questions
	const [answer1, setAnswer1] = useState<boolean | null>(null);
	const [answer2, setAnswer2] = useState<boolean | null>(null);
	const [answer3, setAnswer3] = useState<boolean | null>(null);

	// State for dropdown selections (mock data)
	const [selectedBuyer, setSelectedBuyer] = useState<string | undefined>(
		undefined,
	);
	const [selectedContractDate, setSelectedContractDate] = useState<
		string | undefined
	>(undefined);
	// State for file upload (will store File object or null)
	const [uploadedFile, setUploadedFile] = useState<File | null>(null);

	// Mock data for dropdowns (replace with actual data fetching)
	const buyers = [
		"Global Sourcing Solutions Inc.",
		"Apex Procurement Group",
		"Innovate Supply Co.",
		"Horizon Trading Ltd.",
		"Synergy Global Partners",
		"Coastal Imports & Exports",
	];
	const contractDates = [
		"2023-01-15",
		"2023-03-20",
		"2023-06-10",
		"2023-09-01",
		"2024-02-18",
	];

	// Handler for file input change
	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.files && event.target.files.length > 0) {
			setUploadedFile(event.target.files[0]);
		} else {
			setUploadedFile(null);
		}
	};

	// Handler for the submit button
	const handleSubmit = () => {
		// Collect the feedback data
		const feedbackData = {
			buyer: selectedBuyer,
			contractDate: selectedContractDate,
			uploadedFile: uploadedFile, // You'll likely need to handle file uploads separately on the backend
			question1: answer1,
			question2: answer2,
			question3: answer3,
		};
		// Call the onSubmit prop with the collected data
		onSubmit(feedbackData);
		// Close the modal after submission
		onClose();
		// Reset state after submission (optional, depending on desired behavior)
		setAnswer1(null);
		setAnswer2(null);
		setAnswer3(null);
		setSelectedBuyer(undefined);
		setSelectedContractDate(undefined);
		setUploadedFile(null);
	};

	const feedbackType = getFeedbackType();
	const feedbackTypeLabel = FEEDBACK_TYPE_LABELS[feedbackType];
	const feedbackRecipientLabel =
		feedbackType === "org-supplier" ? "Buyer" : "Supplier";
	const selectFeedbackRecipient = `Select ${feedbackRecipientLabel}`;

	return (
		<Dialog.Root onOpenChange={onClose} open={isOpen}>
			<Dialog.Content style={{ maxWidth: 600 }}>
				<Flex align="center" justify="between">
					<Dialog.Title mb="0">
						Provide Feedback as a {feedbackTypeLabel}
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
					Fill out the form below to provide anonymous feedback.
				</Dialog.Description>

				<Flex direction="column" gap="3">
					{/* Select Buyer Dropdown */}
					<Box>
						<Text as="div" mb="1" size="2" weight="bold">
							{selectFeedbackRecipient}
						</Text>
						<Select.Root onValueChange={setSelectedBuyer} value={selectedBuyer}>
							<Select.Trigger
								placeholder={selectFeedbackRecipient}
								style={{ width: "50%" }}
							/>
							<Select.Content>
								{buyers.map((buyer, index) => (
									<Select.Item key={index} value={buyer}>
										{buyer}
									</Select.Item>
								))}
							</Select.Content>
						</Select.Root>
					</Box>

					{/* Select Contract Date Dropdown */}
					<Box>
						<Text as="div" mb="1" size="2" weight="bold">
							Select contract date
						</Text>
						<Select.Root
							onValueChange={setSelectedContractDate}
							value={selectedContractDate}
						>
							<Select.Trigger
								placeholder="Select contract date"
								style={{ width: "50%" }}
							/>
							<Select.Content>
								{contractDates.map((date, index) => (
									<Select.Item key={index} value={date}>
										{date}
									</Select.Item>
								))}
							</Select.Content>
						</Select.Root>
					</Box>

					{/* Upload Contract/PO */}
					<Box>
						<Text as="div" mb="1" size="2" weight="bold">
							Upload contract/PO for verification
						</Text>
						<input
							className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xs file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
							onChange={handleFileChange}
							type="file"
						/>
					</Box>
					<Separator mb="3" mt="3" orientation="horizontal" size="4" />

					{/* Question 1 */}
					<Flex align="center" direction="row" gap="2" justify="between">
						<Text as="div" size="2" style={{ flexGrow: 1 }} weight="bold">
							1. Timing of purchasing: Did the buyer provide enough time for you
							to complete all pre-production and production processes in
							compliance with all relevant laws and codes of conduct? Did they
							stick to promised timelines for orders and payment?
						</Text>
						<Flex gap="2">
							<Button
								color={answer1 === false ? "red" : "gray"}
								onClick={() => setAnswer1(false)}
								variant={answer1 === false ? "solid" : "soft"}
							>
								No
							</Button>
							<Button
								color={answer1 === true ? "green" : "gray"}
								onClick={() => setAnswer1(true)}
								variant={answer1 === true ? "solid" : "soft"}
							>
								Yes
							</Button>
						</Flex>
					</Flex>

					{/* Question 2 */}
					<Flex align="center" direction="row" gap="2" justify="between">
						<Text as="div" size="2" style={{ flexGrow: 1 }} weight="bold">
							2. Stability of purchasing: Did the buyer provide steady and
							predictable business across the year, avoiding sharp increases and
							decreases in volume? Did the buyer follow through on all orders as
							agreed, with no last-minute reductions or cancellations?
						</Text>
						<Flex gap="2">
							<Button
								color={answer2 === false ? "red" : "gray"}
								onClick={() => setAnswer2(false)}
								variant={answer2 === false ? "solid" : "soft"}
							>
								No
							</Button>
							<Button
								color={answer2 === true ? "green" : "gray"}
								onClick={() => setAnswer2(true)}
								variant={answer2 === true ? "solid" : "soft"}
							>
								Yes
							</Button>
						</Flex>
					</Flex>

					{/* Question 3 */}
					<Flex align="center" direction="row" gap="2" justify="between">
						<Text as="div" size="2" style={{ flexGrow: 1 }} weight="bold">
							3. Clear communication of end buyers' and social requirements: Did
							the buyer clearly communicate their own environmental and social
							requirements and that of the end buyers of your products?
						</Text>
						<Flex gap="2">
							<Button
								color={answer3 === false ? "red" : "gray"}
								onClick={() => setAnswer3(false)}
								variant={answer3 === false ? "solid" : "soft"}
							>
								No
							</Button>
							<Button
								color={answer3 === true ? "green" : "gray"}
								onClick={() => setAnswer3(true)}
								variant={answer3 === true ? "solid" : "soft"}
							>
								Yes
							</Button>
						</Flex>
					</Flex>
				</Flex>

				<Flex gap="3" justify="end" mt="4">
					<Dialog.Close>
						<Button color="gray" variant="soft">
							Cancel
						</Button>
					</Dialog.Close>
					<Button onClick={handleSubmit}>Submit</Button>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
};
