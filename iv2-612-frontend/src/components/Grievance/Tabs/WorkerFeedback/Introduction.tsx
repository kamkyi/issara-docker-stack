import { Box, Flex } from "@radix-ui/themes";
import type React from "react";
import "../tabStyles.css";

interface IntroductionSummary {
	caseId: number;
	dateReceived: string;
	issueCategories: string;
	affectedWorkers: string;
	currentStatus: string;
	issueDescription: string;
}

interface IntroductionProps {
	context: { t: (key: string, options?: Record<string, unknown>) => string };
	summary?: IntroductionSummary;
}

const Introduction: React.FC<IntroductionProps> = ({ context, summary }) => {
	return (
		<Box className="space-y-8 px-4 pt-1 md:px-8 md:pt-3">
			<h3
				style={{
					color: "#3f51d6",
					fontSize: "1.15rem",
					fontWeight: 500,
					letterSpacing: "0.01em",
					margin: 0,
				}}
			>
				{context.t("workerFeedbackGrievance.intro.title")}
			</h3>
			<p className="intro_text">
				{context.t("workerFeedbackGrievance.intro.description")}
			</p>

			{summary && (
				<Box className="space-y-6 pt-8 md:pt-12">
					<h4
						style={{
							fontSize: "0.95rem",
							fontWeight: 700,
							color: "#1f2937",
							margin: 0,
						}}
					>
						{context.t("workerFeedbackGrievance.intro.overviewTitle")}
					</h4>
					<Flex gap="9" justify="between" wrap="wrap">
						<Box
							className="space-y-5"
							style={{ flex: "1 1 460px", maxWidth: "760px" }}
						>
							<p className="intro_text">
								<b>{context.t("workerFeedbackGrievance.intro.caseId")}:</b>{" "}
								{summary.caseId}
							</p>
							<p className="intro_text">
								<b>
									{context.t("workerFeedbackGrievance.intro.issueCategories")}:
								</b>{" "}
								{summary.issueCategories || "-"}
							</p>
							<p className="intro_text">
								<b>
									{context.t("workerFeedbackGrievance.intro.affectedWorkers")}:
								</b>{" "}
								{summary.affectedWorkers || "-"}
							</p>
							<p className="intro_text">
								<b>
									{context.t("workerFeedbackGrievance.intro.issueDescription")}:
								</b>{" "}
								{summary.issueDescription || "-"}
							</p>
						</Box>
						<Box
							className="space-y-5"
							style={{ flex: "0 1 320px", minWidth: "260px" }}
						>
							<p className="intro_text">
								<b>
									{context.t("workerFeedbackGrievance.intro.dateReceived")}:
								</b>{" "}
								{summary.dateReceived || "-"}
							</p>
							<p className="intro_text">
								<b>
									{context.t("workerFeedbackGrievance.intro.currentStatus")}:
								</b>{" "}
								{summary.currentStatus || "-"}
							</p>
						</Box>
					</Flex>
				</Box>
			)}
		</Box>
	);
};

export default Introduction;
