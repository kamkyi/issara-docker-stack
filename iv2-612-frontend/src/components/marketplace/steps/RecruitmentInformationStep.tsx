import { Box, RadioGroup, Select, Text } from "@radix-ui/themes";
import type { CSSProperties } from "react";
import { InputField } from "$src/components/inputs/InputField";
import { useCurrencies } from "$src/hooks/useCurrencies";
import { FormStepNavigation } from "../FormStepNavigation";
import type { JobPostingData } from "../JobPostingForm";

interface RecruitmentInformationStepProps {
	data: JobPostingData;
	updateData: (updates: Partial<JobPostingData>) => void;
	onNext: () => void;
	onPrevious: () => void;
	onSaveDraft?: () => void;
	onPreview?: () => void;
	isFirstStep: boolean;
	isLastStep: boolean;
	isLoading?: boolean;
}

const employerPaysPolicyTypes = [
	{
		value: "COMPANY_PAYS_IN_ADVANCE",
		label:
			"Candidate pays fees in advance, then is reimbursed by company after starting work",
	},
	{
		value: "CANDIDATE_PAYS_IN_ADVANCE",
		label: "Company pays all fees in advance",
	},
];

const radioRow: CSSProperties = {
	display: "flex",
	flexDirection: "row",
};

export const RecruitmentInformationStep = ({
	data,
	updateData,
	onNext,
	onPrevious,
	isFirstStep,
	isLastStep,
	isLoading = false,
}: RecruitmentInformationStepProps) => {
	const { data: currencies } = useCurrencies();
	const currencyCode = currencies?.find((c) => c.id === data.currency)?.code;
	return (
		<Box className="space-y-6">
			<div>
				<h3 className="mb-2 block text-2xl">Recruitment Information</h3>
				<Text className="mb-6 block" color="gray" size="4">
					Define recruitment policies and fee arrangements.
				</Text>
			</div>

			{/* Ethical Recruitment Policy */}
			<div className="gap-3">
				<Text size="4" weight="bold">
					Do you have an ethical recruitment policy?
				</Text>
				<RadioGroup.Root
					className="mt-4 grid grid-cols-2 gap-4 items-center h-16 w-full"
					onValueChange={(value) =>
						updateData({ haveEthicalRecruitmentPolicy: value === "yes" })
					}
					style={radioRow}
					value={data.haveEthicalRecruitmentPolicy ? "yes" : "no"}
				>
					<label
						className="flex w-1/2 gap-2 items-center bg-gray-50 p-3 rounded cursor-pointer"
						htmlFor="ethical-yes"
					>
						<RadioGroup.Item id={"ethical-yes"} value="yes" />
						<Text as="label" htmlFor="ethical-yes" size="3">
							Yes
						</Text>
					</label>
					<label
						className="flex w-1/2 gap-2 items-center bg-gray-50 p-3 rounded cursor-pointer"
						htmlFor="ethical-no"
					>
						<RadioGroup.Item id={"ethical-no"} value="no" />
						<Text as="label" htmlFor="ethical-no" size="3">
							No
						</Text>
					</label>
				</RadioGroup.Root>
			</div>

			{/* Employer Pays Policy */}
			<div className="gap-3">
				<Text size="4" weight="bold">
					Do you have an employer pays policy?
				</Text>
				<RadioGroup.Root
					className="mt-4"
					onValueChange={(value) =>
						updateData({ haveEmployerPaysPolicy: value === "yes" })
					}
					style={radioRow}
					value={data.haveEmployerPaysPolicy ? "yes" : "no"}
				>
					<label
						className="flex w-1/2 gap-2 items-center bg-gray-50 p-3 rounded cursor-pointer"
						htmlFor="employer-pays-yes"
					>
						<RadioGroup.Item id={"employer-pays-yes"} value="yes" />
						<Text as="label" htmlFor="employer-pays-yes" size="3">
							Yes
						</Text>
					</label>
					<label
						className="flex w-1/2 gap-2 items-center bg-gray-50 p-3 rounded cursor-pointer"
						htmlFor="employer-pays-no"
					>
						<RadioGroup.Item id={"employer-pays-no"} value="no" />
						<Text as="label" htmlFor="employer-pays-no" size="3">
							No
						</Text>
					</label>
				</RadioGroup.Root>
			</div>

			{/* Employer Pays Policy Type */}
			{data.haveEmployerPaysPolicy && (
				<div className="space-y-2">
					<Text as="label" className="flex" size="3" weight="medium">
						Employer Pays Policy Type
					</Text>
					<Select.Root
						onValueChange={(value) =>
							updateData({ employerPaysPolicyType: value })
						}
						value={data.employerPaysPolicyType || ""}
					>
						<Select.Trigger
							placeholder="Select policy type"
							style={{ width: "100%", height: 40 }}
						/>
						<Select.Content>
							{employerPaysPolicyTypes.map((type) => (
								<Select.Item key={type.value} value={type.value}>
									{type.label}
								</Select.Item>
							))}
						</Select.Content>
					</Select.Root>
				</div>
			)}

			{/* Visa Fees */}
			<div className="space-y-4">
				<Text size="4" weight="bold">
					Who pays the visa fees?
				</Text>
				<div className="grid grid-cols-2 gap-4 items-center h-16">
					<div className="gap-3">
						<RadioGroup.Root
							onValueChange={(value) => updateData({ visaFeePayer: value })}
							style={radioRow}
							value={data.visaFeePayer || ""}
						>
							<label
								className="flex w-1/2 gap-2 items-center bg-gray-50 p-3 rounded cursor-pointer"
								htmlFor="visa-employer"
							>
								<RadioGroup.Item id={"visa-employer"} value="employer" />
								<Text as="label" htmlFor="visa-employer" size="3">
									Employer
								</Text>
							</label>
							<label
								className="flex w-1/2 gap-2 items-center bg-gray-50 p-3 rounded cursor-pointer"
								htmlFor="visa-worker"
							>
								<RadioGroup.Item id={"visa-worker"} value="worker" />
								<Text as="label" htmlFor="visa-worker" size="3">
									Worker
								</Text>
							</label>
						</RadioGroup.Root>
					</div>
					{data.visaFeePayer === "worker" && (
						<InputField
							label={"Amount (" + currencyCode + ")"}
							min="0"
							onChange={(e) =>
								updateData({ visaFeeAmount: parseFloat(e.target.value) || 0 })
							}
							placeholder="e.g. 500.00"
							step="0.01"
							type="number"
							value={data.visaFeeAmount?.toString() || ""}
						/>
					)}
				</div>
			</div>

			{/* Work Permit Fees */}
			<div className="space-y-4">
				<Text size="4" weight="bold">
					Who pays the work permit fees?
				</Text>
				<div className="grid grid-cols-2 gap-4 items-center h-16">
					<div className="gap-3">
						<RadioGroup.Root
							onValueChange={(value) =>
								updateData({ workPermitFeePayer: value })
							}
							style={radioRow}
							value={data.workPermitFeePayer || ""}
						>
							<label
								className="flex w-1/2 gap-2 items-center bg-gray-50 p-3 rounded cursor-pointer"
								htmlFor="permit-employer"
							>
								<RadioGroup.Item id={"permit-employer"} value="employer" />
								<Text as="label" htmlFor="permit-employer" size="3">
									Employer
								</Text>
							</label>
							<label
								className="flex w-1/2 gap-2 items-center bg-gray-50 p-3 rounded cursor-pointer"
								htmlFor="permit-worker"
							>
								<RadioGroup.Item id={"permit-worker"} value="worker" />
								<Text as="label" htmlFor="permit-worker" size="3">
									Worker
								</Text>
							</label>
						</RadioGroup.Root>
					</div>
					{data.workPermitFeePayer === "worker" && (
						<InputField
							label={"Amount (" + currencyCode + ")"}
							min="0"
							onChange={(e) =>
								updateData({
									workPermitFeeAmount: parseFloat(e.target.value) || 0,
								})
							}
							placeholder="e.g. 300.00"
							step="0.01"
							type="number"
							value={data.workPermitFeeAmount?.toString() || ""}
						/>
					)}
				</div>
			</div>

			{/* Medical Checkup Fees */}
			<div className="space-y-4">
				<Text size="4" weight="bold">
					Who pays the medical checkup fees?
				</Text>
				<div className="grid grid-cols-2 gap-4 items-center h-16">
					<RadioGroup.Root
						onValueChange={(value) =>
							updateData({ medicalCheckupFeePayer: value })
						}
						style={radioRow}
						value={data.medicalCheckupFeePayer || ""}
					>
						<label
							className="flex w-1/2 gap-2 items-center bg-gray-50 p-3 rounded cursor-pointer"
							htmlFor="medical-employer"
						>
							<RadioGroup.Item id={"medical-employer"} value="employer" />
							<Text as="label" htmlFor="medical-employer" size="3">
								Employer
							</Text>
						</label>
						<label
							className="flex w-1/2 gap-2 items-center bg-gray-50 p-3 rounded cursor-pointer"
							htmlFor="medical-worker"
						>
							<RadioGroup.Item id={"medical-worker"} value="worker" />
							<Text as="label" htmlFor="medical-worker" size="3">
								Worker
							</Text>
						</label>
					</RadioGroup.Root>
					{data.medicalCheckupFeePayer === "worker" && (
						<InputField
							label={"Amount (" + currencyCode + ")"}
							min="0"
							onChange={(e) =>
								updateData({
									medicalCheckupFeeAmount: parseFloat(e.target.value) || 0,
								})
							}
							placeholder="e.g. 150.00"
							step="0.01"
							type="number"
							value={data.medicalCheckupFeeAmount?.toString() || ""}
						/>
					)}
				</div>
			</div>

			{/* Navigation */}
			<FormStepNavigation
				isFirstStep={isFirstStep}
				isLastStep={isLastStep}
				isLoading={isLoading}
				onNext={onNext}
				onPrevious={onPrevious}
			/>
		</Box>
	);
};
