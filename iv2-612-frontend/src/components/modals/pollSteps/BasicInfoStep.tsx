import { Button, Checkbox, Flex, Text } from "@radix-ui/themes";
import type React from "react";
import DatePicker from "react-datepicker";
import type { PollFormData } from "./types";

interface BasicInfoStepProps {
	formData: PollFormData;
	updateFormData: (data: Partial<PollFormData>) => void;
	onNext: () => void;
	onCancel: () => void;
}

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
	formData,
	updateFormData,
	onNext,
	onCancel,
}) => {
	const handleInputChange = (field: string, value: string | boolean) => {
		updateFormData({ [field]: value });
	};

	const isValid = formData.title.trim() !== "";

	return (
		<div className="space-y-4">
			<Text className="mb-4 block" size="4" weight="bold">
				Basic Info
			</Text>
			<div className="space-y-4">
				<div>
					<Text as="label" className="block mb-2" size="2" weight="medium">
						Poll Title <span className="text-[#FB8379]">*</span>
					</Text>
					<input
						className="w-full border-1 border-[#148696] focus:ring-0 p-3 rounded-xs"
						onChange={(e) => handleInputChange("title", e.target.value)}
						placeholder="Enter poll title..."
						type="text"
						value={formData.title}
					/>
				</div>

				<div>
					<Text as="label" className="block mb-2" size="2" weight="medium">
						Description
					</Text>
					<textarea
						className="w-full p-3 border-1 border-[#148696] rounded-xs resize-none h-24"
						onChange={(e) => handleInputChange("description", e.target.value)}
						placeholder="Enter poll description..."
						value={formData.description}
					/>
				</div>

				{/* Scheduled Poll */}
				<div className="space-y-3">
					<Flex align="center" gap="2">
						<Checkbox
							checked={formData.isScheduled}
							id={"is-scheduled"}
							onCheckedChange={(checked) =>
								handleInputChange("isScheduled", checked as boolean)
							}
						/>
						<label htmlFor="is-scheduled">Scheduled Poll</label>
					</Flex>

					{formData.isScheduled && (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div className="col-1">
								<Text as="label" className="block" size="2">
									Start Date
								</Text>
								<DatePicker
									className="w-full rounded-md border-1 border-[#148696] px-3 py-2 text-sm transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400"
									dateFormat="yyyy-MM-dd"
									id={"start-date"}
									onChange={(date) =>
										updateFormData({
											startDate: date ? date.toISOString() : "",
										})
									}
									placeholderText="Select date"
									selected={
										formData.startDate ? new Date(formData.startDate) : null
									}
								/>
							</div>
							<div className="col-2">
								<Text as="label" className="block" size="2">
									End Date
								</Text>
								<div>
									<DatePicker
										className="w-full rounded-md border-1 border-[#148696] px-3 py-2 text-sm transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400"
										dateFormat="yyyy-MM-dd"
										id={"end-date"}
										onChange={(date) =>
											updateFormData({
												endDate: date ? date.toISOString() : "",
											})
										}
										placeholderText="Select date"
										selected={
											formData.endDate ? new Date(formData.endDate) : null
										}
									/>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			<div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-between sm:pt-6">
				<Button
					className="w-full sm:w-auto"
					onClick={onCancel}
					variant="outline"
				>
					Cancel
				</Button>
				<Button
					className="w-full sm:w-auto"
					disabled={!isValid}
					onClick={onNext}
					style={{ background: "#148696" }}
				>
					Next
				</Button>
			</div>
		</div>
	);
};

export default BasicInfoStep;
