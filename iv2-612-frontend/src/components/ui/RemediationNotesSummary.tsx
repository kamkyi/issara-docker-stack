interface RemediationNotesSummaryProps {
	title?: string;
	issues?: string | null;
	issaraAction?: string | null;
	supplierAction?: string | null;
	action?: string | null;
	workerValidation?: string | null;
	result?: string | null;
	spRecommendations?: string[];
	labelClassName?: string;
	/** "card" (default) wraps sections in a bordered/divided box. "plain" stacks
	 * them as flat narrative blocks, matching the compact KPI-details meta bar. */
	variant?: "card" | "plain";
}

interface SectionContentProps {
	content: string[];
}

const defaultLabelClassName = "text-sm font-semibold text-[#674EA7]";
const paragraphClassName =
	"mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700";

function normalizeText(value?: string | null): string | null {
	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function SectionContent({ content }: SectionContentProps) {
	return (
		<div className="space-y-2">
			{content.map((text, index) => (
				<p className={paragraphClassName} key={`${text.slice(0, 24)}-${index}`}>
					{text}
				</p>
			))}
		</div>
	);
}

export default function RemediationNotesSummary({
	title = "Remediation Notes (Summary):",
	issues,
	// issaraAction,
	supplierAction,
	action,
	workerValidation,
	result,
	spRecommendations = [],
	labelClassName = defaultLabelClassName,
	variant = "card",
}: RemediationNotesSummaryProps) {
	const sections = [
		{
			label: "Issue summary reported by workers:",
			content: normalizeText(issues),
		},
		// {
		// 	label: "Action from Issara:",
		// 	content: normalizeText(issaraAction),
		// },
		{
			label: "Action from the supplier:",
			content: normalizeText(supplierAction),
		},
		{
			label:
				"Actions that have been taken by the employer regarding this issue:",
			content: normalizeText(action),
		},
		{
			label: "Updates from workers regarding this issue:",
			content: normalizeText(workerValidation),
		},
		{
			label: "Result or outcome of the issue:",
			content: normalizeText(result),
		},
		{
			label:
				"Recommendations and notices for Strategic Partners regarding this case:",
			content: spRecommendations
				.map((recommendation) => normalizeText(recommendation))
				.filter(
					(recommendation): recommendation is string => recommendation !== null,
				),
		},
	].filter((section) => {
		if (Array.isArray(section.content)) {
			return section.content.length > 0;
		}

		return section.content !== null;
	});

	if (sections.length === 0) {
		return null;
	}

	if (variant === "plain") {
		return (
			<div className="space-y-2.5">
				{sections.map((section) => (
					<div key={section.label}>
						<p className={labelClassName}>{section.label}</p>
						{Array.isArray(section.content) ? (
							<SectionContent content={section.content} />
						) : (
							<section className={paragraphClassName}>
								{section.content}
							</section>
						)}
					</div>
				))}
			</div>
		);
	}

	return (
		<div className="mt-4 text-sm">
			<strong>{title}</strong>
			<div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50/80 divide-y divide-gray-200">
				{sections.map((section) => (
					<div className="px-4 py-3" key={section.label}>
						<p className={labelClassName}>{section.label}</p>
						{Array.isArray(section.content) ? (
							<SectionContent content={section.content} />
						) : (
							<section className={paragraphClassName}>
								{section.content}
							</section>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
