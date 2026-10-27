import { Box, Flex, Text, TextArea } from "@radix-ui/themes";
import { Plus, X } from "lucide-react";
import moment from "moment";
import { type ChangeEvent, useId } from "react";
import PrevTextDataComponent from "../PrevTextDataComponent";
import "../tabStyles.css";
import type { GrievanceData } from "../../GrievanceForm";

type RemediationEntry = NonNullable<
	NonNullable<GrievanceData["list_of_text_fields"]>["remediations"]
>[number];

interface MonitoringAndCommunicationProps {
	context: { t: (x: string) => string };
	data: GrievanceData;
	onDataChange: (update: Record<string, unknown>) => void;
	handleOnClick: () => void;
	handlePreview: () => void;
	mode?: "all" | "remediation" | "system-strengthening";
	hideActions?: boolean;
}

const MonitoringAndCommunication: React.FC<MonitoringAndCommunicationProps> = ({
	context,
	data,
	onDataChange,
	handleOnClick,
	handlePreview,
	mode = "all",
	hideActions = false,
}) => {
	const fieldId = useId();
	const showRemediation = mode !== "system-strengthening";
	const showSystemStrengthening = mode !== "remediation";
	const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
		const { name, value } = event.target;
		onDataChange({
			[name]: {
				...((data as any)[name]?.id != null && { id: (data as any)[name].id }),
				description: value,
			},
		});
	};

	const remediationEntries: RemediationEntry[] =
		data.list_of_text_fields?.remediations &&
		data.list_of_text_fields.remediations.length > 0
			? data.list_of_text_fields.remediations
			: [
					{
						description: data.remediation?.description || "",
						is_submitted: false,
					},
				];

	const hasRemediations =
		Array.isArray(data.list_of_text_fields?.remediations) &&
		(data.list_of_text_fields.remediations as any[]).length > 0;

	const handleRemediationEntryChange = (index: number, value: string) => {
		const next = remediationEntries.map((entry, entryIndex) =>
			entryIndex === index
				? { ...entry, description: value, updated_at: new Date().toISOString() }
				: entry,
		);
		onDataChange({
			list_of_text_fields: { ...data.list_of_text_fields, remediations: next },
			remediation: { description: value },
		});
	};

	/**
	 * Drop an unsubmitted update — the escape hatch for an "Add more" tapped by
	 * mistake. Submitted updates have no remove control; they are part of the
	 * time-stamped record. The last remaining entry is kept so the section always
	 * has one editable box.
	 */
	const handleRemoveRemediationEntry = (index: number) => {
		const next = remediationEntries.filter(
			(_, entryIndex) => entryIndex !== index,
		);
		onDataChange({
			list_of_text_fields: { ...data.list_of_text_fields, remediations: next },
			remediation: { description: next[0]?.description || "" },
		});
	};

	const handleAddRemediationEntry = () => {
		const next = [
			...remediationEntries,
			{
				description: "",
				updated_at: new Date().toISOString(),
				is_submitted: false,
			},
		];
		onDataChange({
			list_of_text_fields: { ...data.list_of_text_fields, remediations: next },
		});
	};

	return (
		<Box className="space-y-6 px-4 pt-1 md:px-8 md:pt-3">
			{mode === "all" && (
				<Text as="label" className="question block" weight="bold">
					{context.t(
						"Case updates entered here are time-stamped and viewable by your team, the Issara team, and your customers that are Strategic Partners in the ILM system. If there is any additional information that you would like to add regarding Remediation or Systems Strengthening and Continuous Improvement, please enter it here:",
					)}
				</Text>
			)}

			<Flex direction="column" gap="4" mt="4">
				{showRemediation && (
					<div className="space-y-3">
						{remediationEntries.map((entry, index) =>
							entry.is_submitted ? (
								<div
									className="rounded-lg border border-[#A6DFDD]/70 bg-white px-4 py-3"
									key={entry.id ?? `submitted-${index}`}
								>
									<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
										<span className="font-semibold text-[#0f6b78]">
											{context.t("Remediation Update")} {index + 1}
										</span>
										{entry.updated_at && (
											<span>
												{moment(entry.updated_at).format("DD MMM YYYY, HH:mm")}
											</span>
										)}
									</div>
									<p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
										{entry.description}
									</p>
								</div>
							) : (
								<div
									className="overflow-hidden rounded-lg border border-gray-200"
									key={entry.id ?? `draft-${index}`}
								>
									<div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
										<Text
											as="label"
											className="text-[11px] font-semibold text-gray-600"
											htmlFor={`${fieldId}-remediation-${index}`}
										>
											{context.t("Remediation Update")} {index + 1}
										</Text>
										<div className="flex items-center gap-2">
											<span className="text-[10px] text-gray-400">
												{entry.updated_at
													? moment(entry.updated_at).format(
															"DD MMM YYYY, HH:mm",
														)
													: context.t("Draft")}
											</span>
											{remediationEntries.length > 1 && (
												<button
													aria-label={`${context.t("Remove")} ${context.t("Remediation Update")} ${index + 1}`}
													className="-mr-1 rounded p-0.5 text-[#8A979C] transition-colors hover:bg-[#D2D2D2]/40 hover:text-[#333333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] focus-visible:ring-offset-1"
													onClick={() => handleRemoveRemediationEntry(index)}
													title={context.t("Remove this update")}
													type="button"
												>
													<X size={14} />
												</button>
											)}
										</div>
									</div>
									<TextArea
										className="w-full rounded-none shadow-none"
										id={`${fieldId}-remediation-${index}`}
										onChange={(event) =>
											handleRemediationEntryChange(index, event.target.value)
										}
										placeholder={context.t(
											"Please add notes on case remediation",
										)}
										rows={3}
										value={entry.description}
									/>
								</div>
							),
						)}
						<Flex justify="start">
							<button
								className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-xs font-semibold text-[#148696] hover:border-[#148696] hover:bg-[#148696]/5"
								onClick={handleAddRemediationEntry}
								type="button"
							>
								<Plus size={14} />
								{context.t("Add more")}
							</button>
						</Flex>
					</div>
				)}
				{showSystemStrengthening && (
					<div>
						<Text
							as="label"
							className="block text-[15px] font-medium text-gray-600"
							htmlFor={`${fieldId}-system-strengthening`}
						>
							{context.t("Systems Strengthening and Continuous Improvement")}
						</Text>
						<TextArea
							className="w-full mt-2"
							id={`${fieldId}-system-strengthening`}
							name="system_strengthening"
							onChange={handleChange}
							placeholder={context.t(
								"Please add notes on Systems Strengthening and Continuous Improvement related to this worker-reported issue",
							)}
							rows={3}
							value={
								data.system_strengthening
									? data.system_strengthening.description
									: ""
							}
						/>
					</div>
				)}
			</Flex>
			{/* Remediation entries are rendered directly above (draft and
			submitted alike), so only system-strengthening notes still rely on
			this legacy read-only history list. */}
			<PrevTextDataComponent
				context={context}
				data={[
					{
						remediations: [],
						system_strengthenings: showSystemStrengthening
							? data.list_of_text_fields?.system_strengthenings || []
							: [],
					},
				]}
				entryLabel={context.t("Submitted Update")}
				is_notes={false}
				primaryField="system_strengthenings"
				text_header_1={context.t(
					"Systems Strengthening and Continuous Improvement: ",
				)}
				text_header_2={context.t(
					"Systems Strengthening and Continuous Improvement: ",
				)}
			/>
			{!hideActions && (
				<Flex justify="end" mt="4">
					{hasRemediations ? (
						<button
							className="bg-crimson-500 text-white px-4 py-2 rounded hover:bg-crimson-600"
							onClick={handlePreview}
						>
							{context.t("Preview & Submit")}
						</button>
					) : (
						<button
							className="bg-crimson-500 text-white px-4 py-2 rounded hover:bg-crimson-600"
							onClick={handleOnClick}
						>
							{context.t("Save as Draft")}
						</button>
					)}
				</Flex>
			)}
		</Box>
	);
};

export default MonitoringAndCommunication;
