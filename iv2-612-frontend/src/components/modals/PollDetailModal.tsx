import {
	CalendarIcon,
	Cross2Icon,
	GlobeIcon,
	PersonIcon,
} from "@radix-ui/react-icons";
import { Badge, Button, Card, Dialog, Flex, Text } from "@radix-ui/themes";
import moment from "moment";
import { useTheme } from "next-themes";
import type React from "react";
import { statusColorPalette as colors } from "$src/assets/mock/common-data";
import nationalityData from "$src/assets/mock/nationalities.json";
import { useCountries } from "$src/hooks/useCommonData";

interface PollDetailModalProps {
	open: boolean;
	onClose: () => void;
	poll: any; // Poll data from the selected row
}

const PollDetailModal: React.FC<PollDetailModalProps> = ({
	open,
	onClose,
	poll,
}) => {
	const { theme } = useTheme();
	const { data: countryData } = useCountries();
	if (!poll) return null;

	const totalVotes =
		poll.choices?.reduce(
			(total: number, choice: any) => total + choice.votes_count,
			0,
		) || 0;
	const countryNames = (country: number[]) =>
		country
			.map((c) => countryData?.find((country) => country.country === c))
			.map((c) => c?.name);
	const nationalityNames = (nationality: number[]) =>
		nationality
			.map((c) => nationalityData.find((n) => n.nationality === c))
			.map((c) => c?.name);
	const genderLabels: Record<string, string> = {
		M: "Male",
		F: "Female",
		N: "Prefer not to say",
		X: "Non-Binary",
	};
	const genderNames = (gender: string[]) =>
		gender.map((item) => genderLabels[item] ?? item);
	const hasAgeRange =
		Number.isFinite(Number(poll.age_min)) &&
		Number.isFinite(Number(poll.age_max));
	const ageRangeLabel = hasAgeRange
		? `${Number(poll.age_min)} - ${Number(poll.age_max)}`
		: "";
	const downloadPollResults = () => {
		const pollResults = (poll.choices || []).filter(
			(choice: any) => choice.description !== null,
		);
		const csvRows = [
			["Poll ID", String(poll.id ?? "")],
			["Question", String(poll.question_text || poll.description || "")],
			["Description", String(poll.poll_description || "")],
			["Created At", moment(poll.created_at).format("YYYY-MM-DD")],
			["Language", String(poll.language || "English")],
			["Total Votes", String(totalVotes)],
			[
				"Genders",
				Array.isArray(poll.gender) ? genderNames(poll.gender).join(", ") : "",
			],
			[
				"Nationalities",
				Array.isArray(poll.nationality)
					? nationalityNames(poll.nationality).join(", ")
					: "",
			],
			["Age Range", ageRangeLabel],
			[],
			["Option", "Votes", "Percentage"],
			...pollResults.map((choice: any) => [
				String(choice.description ?? ""),
				String(choice.votes_count ?? 0),
				totalVotes > 0
					? `${((choice.votes_count / totalVotes) * 100).toFixed(1)}%`
					: "0%",
			]),
		];

		const csvContent = csvRows
			.map((row) =>
				row
					.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
					.join(","),
			)
			.join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `poll-${poll.id ?? "details"}-results.csv`;
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	return (
		<Dialog.Root onOpenChange={onClose} open={open}>
			<Dialog.Content
				style={{
					maxWidth: "700px",
					padding: "0",
					background: theme === "dark" ? "#004A60" : "rgba(239, 253, 255, 1)",
				}}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<div>
						<Dialog.Title className="text-2xl font-bold">
							Poll Details
						</Dialog.Title>
						<Text className="mt-1" size="2">
							View comprehensive poll information and results
						</Text>
					</div>
					<Dialog.Close>
						<Button className="rounded-full" size="2" variant="ghost">
							<Cross2Icon />
						</Button>
					</Dialog.Close>
				</div>

				{/* Content */}
				<div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
					{/* Poll Question */}
					<Card className="p-4">
						<Text className="block mb-2 " size="3" weight="medium">
							Question
						</Text>
						<Text className="leading-relaxed" size="4">
							{poll.question_text || poll.description}
						</Text>
						{poll.poll_description ? (
							<Text className="mt-3 text-gray-600 leading-relaxed" size="2">
								{poll.poll_description}
							</Text>
						) : null}
					</Card>

					{/* Poll Metadata */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Card className="p-4">
							<Flex align="center" className="mb-2" gap="2">
								<CalendarIcon className="w-4 h-4 text-[#148696]" />
								<Text size="2" weight="bold">
									Created Date
								</Text>
							</Flex>
							<Text size="3">
								{moment(poll.created_at).format("MMMM DD, YYYY")}
							</Text>
						</Card>

						<Card className="p-4">
							<Flex align="center" className="mb-2" gap="2">
								<GlobeIcon className="w-4 h-4 text-[#148696]" />
								<Text className="" size="2" weight="bold">
									Language
								</Text>
							</Flex>
							<Text size="3">{poll.language || "English"}</Text>
						</Card>

						<Card className="p-4">
							<Flex align="center" className="mb-2" gap="2">
								<PersonIcon className="w-4 h-4 text-[#148696]" />
								<Text className="" size="2" weight="bold">
									Total Votes
								</Text>
							</Flex>
							<Text className="text-[#148696]" size="4" weight="bold">
								{totalVotes.toLocaleString()}
							</Text>
						</Card>

						<Card className="p-4">
							<Text className=" mb-2" size="2" weight="bold">
								Status
							</Text>
							<br />
							<Badge color="green" size="2">
								Active
							</Badge>
						</Card>
					</div>

					{/* Target Demographics */}
					{(poll.country || poll.gender || poll.nationality || hasAgeRange) && (
						<Card className="p-4">
							<Text className="block" mb={"3"} size="3" weight="medium">
								Target Groups
							</Text>
							<div className="space-y-2">
								{poll.country && (
									<div>
										<Text size="2" weight="bold">
											Countries:&nbsp;
										</Text>
										<Text className="ml-2" size="2">
											{Array.isArray(poll.country)
												? countryNames(poll.country).join(", ")
												: poll.country}
										</Text>
									</div>
								)}

								{poll.gender && (
									<div>
										<Text size="2" weight="bold">
											Gender:&nbsp;
										</Text>
										<Text className="ml-2" size="2">
											{Array.isArray(poll.gender)
												? genderNames(poll.gender).join(", ")
												: poll.gender}
										</Text>
									</div>
								)}

								{poll.nationality && (
									<div>
										<Text size="2" weight="bold">
											Nationalities:&nbsp;
										</Text>
										<Text className="ml-2" size="2">
											{Array.isArray(poll.nationality)
												? nationalityNames(poll.nationality).join(", ")
												: poll.nationality}
										</Text>
									</div>
								)}

								{hasAgeRange && (
									<div>
										<Text size="2" weight="bold">
											Age Range:&nbsp;
										</Text>
										<Text className="ml-2" size="2">
											{ageRangeLabel}
										</Text>
									</div>
								)}
							</div>
						</Card>
					)}

					{/* Poll Results */}
					<Card className="p-4">
						<Text className="block mb-4 " size="3" weight="medium">
							Poll Results
						</Text>

						{/* Detailed Results */}
						<div className="space-y-2">
							{poll.choices
								?.filter((choice: any) => choice.description !== null)
								.map((choice: any, index: number) => {
									// Generate consistent colors for each choice
									const choiceColor = colors[index % colors.length];

									return (
										<div
											className="flex items-center justify-between p-2 rounded-md"
											key={index}
										>
											<div className="flex items-center gap-3 flex-1">
												<div
													className="w-3 h-3 rounded-full flex-shrink-0"
													style={{ backgroundColor: choiceColor }}
												/>
												<Text size="2" weight="medium">
													{choice.description}
												</Text>
											</div>
											<div className="flex items-center gap-3">
												<Text size="2">{choice.votes_count} votes</Text>
												<Text
													className="text-[#148696] min-w-[50px] text-right"
													size="2"
													weight="bold"
												>
													{totalVotes > 0
														? ((choice.votes_count / totalVotes) * 100).toFixed(
																1,
															)
														: 0}
													%
												</Text>
											</div>
										</div>
									);
								})}
						</div>
					</Card>
				</div>

				{/* Footer */}
				<div className="flex justify-end gap-3 p-6 border-t border-gray-200">
					<Button onClick={onClose} variant="outline">
						Close
					</Button>
					<Button
						onClick={downloadPollResults}
						style={{ background: "#148696", cursor: "pointer" }}
					>
						Export Results
					</Button>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	);
};

export default PollDetailModal;
