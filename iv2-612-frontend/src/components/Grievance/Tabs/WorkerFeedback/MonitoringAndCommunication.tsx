import { Box, Flex, Text, TextArea } from "@radix-ui/themes";
import type React from "react";
import { useId } from "react";
import PrevTextDataComponent from "../PrevTextDataComponent";
import "../tabStyles.css";
import type { GrievanceData } from "../../GrievanceForm";

interface MonitoringAndCommunicationProps {
	context: { t: (x: string) => string };
	data: GrievanceData;
	onDataChange: (update: Record<string, unknown>) => void;
	handleOnClick: () => void;
	handlePreview: () => void;
}

const MonitoringAndCommunication: React.FC<MonitoringAndCommunicationProps> = ({
	context,
	data,
	onDataChange,
}) => {
	const remediationId = useId();
	const systemStrengtheningId = useId();

	const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		const { name, value } = event.target;
		onDataChange({
			[name]: {
				...((data as any)[name]?.id != null && { id: (data as any)[name].id }),
				description: value,
			},
		});
	};

	return (
		<Box className="space-y-6 px-4 pt-1 md:px-8 md:pt-3">
			<h3
				style={{
					color: "#3f51d6",
					fontSize: "1.15rem",
					fontWeight: 500,
					letterSpacing: "0.01em",
					margin: 0,
				}}
			>
				{context.t("workerFeedbackGrievance.monitoring.title")}
			</h3>
			<Flex direction="column" gap="4" mt="4">
				<div>
					<Text
						as="label"
						className="block text-[15px] font-medium text-gray-600"
						htmlFor={remediationId}
					>
						{context.t("workerFeedbackGrievance.monitoring.remediationActions")}
					</Text>
					<TextArea
						className="w-full mt-2"
						id={remediationId}
						name="remediation"
						onChange={handleChange}
						placeholder={context.t(
							"workerFeedbackGrievance.monitoring.remediationPlaceholder",
						)}
						rows={3}
						value={data.remediation ? data.remediation.description : ""}
					/>
				</div>
				<div>
					<Text
						as="label"
						className="block text-[15px] font-medium text-gray-600"
						htmlFor={systemStrengtheningId}
					>
						{context.t(
							"workerFeedbackGrievance.monitoring.systemStrengtheningMeasures",
						)}
					</Text>
					<TextArea
						className="w-full mt-2"
						id={systemStrengtheningId}
						name="system_strengthening"
						onChange={handleChange}
						placeholder={context.t(
							"workerFeedbackGrievance.monitoring.systemStrengtheningPlaceholder",
						)}
						rows={3}
						value={
							data.system_strengthening
								? data.system_strengthening.description
								: ""
						}
					/>
				</div>
			</Flex>
			<PrevTextDataComponent
				context={context}
				data={[
					{
						remediations: data.list_of_text_fields?.remediations || [],
						system_strengthenings:
							data.list_of_text_fields?.system_strengthenings || [],
					},
				]}
				is_notes={false}
				text_header_1={context.t(
					"workerFeedbackGrievance.monitoring.remediationHeader",
				)}
				text_header_2={context.t(
					"workerFeedbackGrievance.monitoring.systemStrengtheningHeader",
				)}
			/>
		</Box>
	);
};

export default MonitoringAndCommunication;
