import { ChevronDownIcon } from "@radix-ui/react-icons";
import moment from "moment";
import type React from "react";
import "./tabStyles.css";

interface PrevTextDataComponentProps {
	context: { t: (x: string) => string };
	data: {
		remediations: { description: string }[] | undefined;
		system_strengthenings: any[];
	}[];
	text_header_1: string;
	text_header_2: string;
	is_notes: boolean;
	entryLabel?: string;
	primaryField?: "remediations" | "system_strengthenings";
}

/**
 * Who wrote a saved note / update. The grievance serializer already returns
 * `author_email` on every note and remediation entry (NoteSerializer), so this
 * is live data wherever the case itself is live.
 */
const authorLabel = (
	entry: unknown,
	context: { t: (x: string) => string },
): string => {
	const email = (entry as { author_email?: string | null })?.author_email;
	if (typeof email === "string" && email.trim()) return email;
	return context.t("Unknown author");
};

const PrevTextDataComponent: React.FC<PrevTextDataComponentProps> = ({
	context,
	data,
	text_header_1,
	text_header_2,
	is_notes,
	entryLabel,
	primaryField = "remediations",
}) => {
	const prev_data = is_notes ? data : data[0]?.[primaryField];
	if (prev_data && prev_data.length > 0) {
		return (
			<div className="prev_data mt-3 space-y-2">
				{prev_data.map((notes: unknown, index: number) => (
					<details
						className="group overflow-hidden rounded-lg border border-gray-200 bg-white"
						key={(notes as { id: string }).id}
					>
						<summary className="flex cursor-pointer list-none items-center gap-2 border-b border-transparent bg-gray-50 px-3 py-2 text-xs group-open:border-gray-200">
							<ChevronDownIcon className="shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
							<span className="font-semibold text-gray-700">
								{entryLabel || context.t("Note")} {index + 1}
							</span>
							{/* The API returns notes newest-first, so entry 1 is the one the
							    textarea above is pre-filled with. */}
							{index === 0 && (
								<span className="shrink-0 rounded-full bg-[#A6DFDD]/30 px-2 py-0.5 text-[#004A60]">
									{context.t("Latest")}
								</span>
							)}
							<span className="truncate text-[#56666C]">
								{authorLabel(notes, context)}
							</span>
							{(notes as { updated_at?: string }).updated_at ? (
								<span className="ml-auto shrink-0 text-gray-400">
									{moment(
										(notes as { updated_at: string }).updated_at,
									).fromNow()}
								</span>
							) : null}
						</summary>
						<div className="px-4 py-3 text-sm text-gray-700">
							<div className="mb-1.5 text-xs text-[#8A979C]">
								{authorLabel(notes, context)}
								{(notes as { updated_at?: string }).updated_at
									? ` · ${context.t("Updated At ")}${moment(
											(notes as { updated_at: string }).updated_at,
										).format("DD MMM, YYYY HH:mm")}`
									: ` · ${context.t("Submitted update")}`}
							</div>
							<div className="whitespace-pre-wrap">
								<span className="text_headers">{text_header_1} </span>
								{is_notes
									? (notes as { value: string }).value
									: (notes as { description: string }).description}
							</div>
							{!is_notes &&
							primaryField === "remediations" &&
							data[0].system_strengthenings &&
							data[0].system_strengthenings[index] ? (
								<div className="mt-1.5 whitespace-pre-wrap">
									<span className="text_headers">{text_header_2}</span>
									{
										(
											data[0].system_strengthenings[index] as {
												description: string;
											}
										).description
									}
								</div>
							) : null}
						</div>
					</details>
				))}
			</div>
		);
	} else {
		return <div />;
	}
};

export default PrevTextDataComponent;
