import { Cross2Icon } from "@radix-ui/react-icons";
import { Box, Flex, IconButton, Text } from "@radix-ui/themes";
import type { WorkerFeedbackRecord } from "$src/services/workerFeedbackService";

interface WorkerFeedbackDetailsPanelProps {
	record: WorkerFeedbackRecord;
	onClose: () => void;
	issueCategoryNames: string;
	issueDescriptions: string;
	channelName: string;
	contactReasonName: string;
	caseStatusName: string;
	daysActive: number;
	level: string;
	nationalityName: string;
	genderName: string;
	assignedUsers: string;
}

const fieldTextStyle = {
	fontSize: "0.875rem",
	lineHeight: 1.6,
	color: "#4b5563",
} as const;

const labelTextStyle = {
	fontSize: "0.875rem",
	fontWeight: 700,
	color: "#5b5b5b",
	lineHeight: 1.35,
	whiteSpace: "normal",
} as const;

const sectionTitleStyle = {
	fontSize: "0.95rem",
	fontWeight: 600,
	color: "#3f3f46",
	paddingBottom: "0.5rem",
	borderBottom: "1px solid #e0e0e0",
	marginBottom: "1rem",
	textTransform: "uppercase",
} as const;

const normalizeDisplayValue = (value: unknown) => {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : "-";
	}

	if (typeof value === "number") {
		return String(value);
	}

	if (value && typeof value === "object") {
		const candidate = ["full_name", "name", "label", "title", "value"].find(
			(key) => {
				const entry = (value as Record<string, unknown>)[key];
				return typeof entry === "string" && entry.trim().length > 0;
			},
		);

		if (candidate) {
			return String((value as Record<string, unknown>)[candidate]);
		}
	}

	return "-";
};

const getDisplayName = (user?: {
	full_name?: string;
	first_name?: string;
	last_name?: string;
	username?: string;
	email?: string;
}) => {
	const fullName = user?.full_name?.trim();
	if (fullName) {
		return fullName;
	}

	const name = [user?.first_name, user?.last_name]
		.filter(Boolean)
		.join(" ")
		.trim();
	if (name) {
		return name;
	}

	return user?.username || user?.email || "-";
};

const formatAttachmentSize = (size?: string) => {
	if (!size) {
		return "-";
	}

	const numericSize = Number(size);
	if (Number.isNaN(numericSize)) {
		return size;
	}

	if (numericSize < 1024) {
		return `${numericSize} B`;
	}

	if (numericSize < 1024 * 1024) {
		return `${(numericSize / 1024).toFixed(1)} KB`;
	}

	return `${(numericSize / (1024 * 1024)).toFixed(1)} MB`;
};

const DetailField = ({ label, value }: { label: string; value: unknown }) => (
	<div
		style={{
			display: "grid",
			gridTemplateColumns: "minmax(120px, 140px) minmax(0, 1fr)",
			columnGap: "1.5rem",
			rowGap: "0.25rem",
			marginBottom: "0.7rem",
		}}
	>
		<Text style={labelTextStyle}>{label}:</Text>
		<Text style={fieldTextStyle}>{normalizeDisplayValue(value)}</Text>
	</div>
);

const DetailSection = ({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) => (
	<Box mb="5">
		<Text as="div" style={sectionTitleStyle}>
			{title}
		</Text>
		{children}
	</Box>
);

export default function WorkerFeedbackDetailsPanel({
	record,
	onClose,
	issueCategoryNames,
	issueDescriptions,
	channelName,
	contactReasonName,
	caseStatusName,
	daysActive,
	level,
	nationalityName,
	genderName,
	assignedUsers,
}: WorkerFeedbackDetailsPanelProps) {
	return (
		<>
			<div
				onClick={onClose}
				style={{
					position: "fixed",
					inset: 0,
					background: "rgba(15, 23, 42, 0.28)",
					zIndex: 120,
				}}
			/>
			<div
				style={{
					position: "fixed",
					top: 0,
					right: 0,
					width: "min(92vw, 760px)",
					height: "100vh",
					overflowY: "auto",
					background: "white",
					zIndex: 130,
					boxShadow: "0 18px 48px rgba(15, 23, 42, 0.18)",
					padding: "1.5rem 1.25rem 1.75rem",
					borderLeft: "1px solid #e4e4e7",
				}}
			>
				<Flex align="center" justify="between" mb="5">
					<Text size="6" style={{ color: "#3f3f46" }} weight="bold">
						Worker Feedback Details
					</Text>
					<IconButton
						onClick={onClose}
						style={{
							background: "white",
							boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
							borderRadius: 12,
						}}
						variant="soft"
					>
						<Cross2Icon />
					</IconButton>
				</Flex>

				<DetailSection title="Basic Information">
					<DetailField label="ID" value={record.id} />
					<DetailField
						label="Employee Name"
						value={record.client_name || "-"}
					/>
					<DetailField
						label="Department"
						value={record.employee_department || "-"}
					/>
					<DetailField
						label="Date"
						value={record.interaction_date || record.created_at || "-"}
					/>
					<DetailField label="Contact Reason" value={contactReasonName} />
					<DetailField
						label="HR Staff"
						value={getDisplayName(record.hr_staff || undefined)}
					/>
					<DetailField label="Status" value={caseStatusName} />
					<DetailField label="Days Active" value={daysActive} />
				</DetailSection>

				<DetailSection title="Issue Details">
					<DetailField label="Issue Categories" value={issueCategoryNames} />
					<DetailField label="Received Via" value={channelName} />
					<DetailField label="Summary" value={record.summary || "-"} />
					<DetailField label="KPIs" value={issueDescriptions} />
					<DetailField label="Level" value={level} />
				</DetailSection>

				<DetailSection title="Worker Information">
					<DetailField
						label="Employee Name"
						value={record.client_name || "-"}
					/>
					<DetailField label="Employee ID" value={record.employee_id || "-"} />
					<DetailField label="Phone" value={record.phone_number || "-"} />
					<DetailField label="Nationality" value={nationalityName} />
					<DetailField label="Gender" value={genderName} />
					<DetailField
						label="Department"
						value={record.employee_department || "-"}
					/>
				</DetailSection>

				<DetailSection title="Contact Information">
					<DetailField
						label="Phone Number"
						value={record.phone_number || "-"}
					/>
					<DetailField label="LINE ID" value={record.line_id || "-"} />
					<DetailField label="WhatsApp" value={record.whatsapp || "-"} />
					<DetailField label="Zalo" value={record.zalo || "-"} />
					<DetailField label="Received Via" value={channelName} />
				</DetailSection>

				<DetailSection title="Feedback Details">
					<DetailField
						label="Feedback Description"
						value={record.feedback_description || "-"}
					/>
					<DetailField
						label="Workers Affected"
						value={record.workers_affected ?? "-"}
					/>
					<DetailField
						label="Workers Affected Description"
						value={record.workers_affected_description || "-"}
					/>
					<DetailField
						label="Situation Improving"
						value={record.situation_improving || "-"}
					/>
					<DetailField
						label="Situation Improving Description"
						value={record.situation_improving_description || "-"}
					/>
					<DetailField
						label="Urgent Needs"
						value={record.urgent_needs_of_employee || "-"}
					/>
				</DetailSection>

				<DetailSection title="Resolution & Follow-up">
					<DetailField label="Assigned Users" value={assignedUsers} />
					<DetailField label="Next Steps" value={record.next_steps || "-"} />
					<DetailField label="Deadline" value={record.deadline || "-"} />
				</DetailSection>

				<DetailSection title="Additional Notes">
					<DetailField
						label="Final Remarks"
						value={record.final_remarks || "-"}
					/>
					<DetailField
						label="Safeguards Remarks"
						value={record.safeguards_remarks || "-"}
					/>
					<DetailField
						label="Additional Attachments"
						value={
							record.additional_attachments?.length
								? record.additional_attachments
										.map((attachment) => {
											const name = attachment.name || "Attachment";
											const size = formatAttachmentSize(attachment.size);
											return size === "-" ? name : `${name} (${size})`;
										})
										.join(", ")
								: "-"
						}
					/>
					<DetailField label="Created At" value={record.created_at || "-"} />
					<DetailField label="Updated At" value={record.updated_at || "-"} />
				</DetailSection>
			</div>
		</>
	);
}
