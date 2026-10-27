import { Box } from "@radix-ui/themes";
import type React from "react";
import "../tabStyles.css";

interface IntroductionProps {
	context: { t: (key: string, options?: Record<string, unknown>) => string };
}

const Introduction: React.FC<IntroductionProps> = ({ context }) => {
	const ethical_grievance_mechanisms_components = [
		context.t("workerReportedIssues.grievanceIntro.components.ethical"),
		context.t("workerReportedIssues.grievanceIntro.components.professional"),
		context.t("workerReportedIssues.grievanceIntro.components.inclusive"),
		context.t("workerReportedIssues.grievanceIntro.components.accessible"),
		context.t("workerReportedIssues.grievanceIntro.components.safe"),
		context.t("workerReportedIssues.grievanceIntro.components.impartial"),
		context.t("workerReportedIssues.grievanceIntro.components.timelyAction"),
		context.t("workerReportedIssues.grievanceIntro.components.effective"),
	];

	const downloadLink =
		"https://www.issarainstitute.org/_files/ugd/5bf36e_7c51ccbcf3fe4519885d7e98c6402a98.pdf";

	return (
		<Box className="space-y-6 px-4 pt-1 md:px-8 md:pt-3">
			<p className="intro_text">
				{context.t("workerReportedIssues.grievanceIntro.descriptionBeforeLink")}{" "}
				<a href={downloadLink} rel="noopener noreferrer" target="_blank">
					{context.t("workerReportedIssues.grievanceIntro.pdfLabel")}
				</a>
				{context.t("workerReportedIssues.grievanceIntro.descriptionAfterLink")}
			</p>
			<p className="intro_text">
				{context.t("workerReportedIssues.grievanceIntro.reminder")}
			</p>
			<ol className="list-decimal pl-6 space-y-1 marker:font-bold">
				{ethical_grievance_mechanisms_components.map((component) => (
					<li className="intro_text" key={component}>
						{component}
					</li>
				))}
			</ol>
		</Box>
	);
};

export default Introduction;
