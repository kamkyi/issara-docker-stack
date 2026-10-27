import { Box, Button, Flex } from "@radix-ui/themes";
import {
	FolderCheck,
	Info,
	MessageSquare,
	Save,
	Search,
	Send,
	Shield,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import CascadeDatePicker from "$src/components/inputs/CascadeDatePicker";
import { showToast } from "$src/components/toast/toastUtil";
import {
	ATTACHMENT_VISIBILITY,
	type AttachmentVisibility,
	fetchSupplierKpiGrievance,
	type PendingGrievanceAttachment,
	saveSupplierKpiGrievance,
	uploadSupplierKpiGrievanceAttachments,
} from "$src/services/supplierKpiGrievanceService";
import type { ServerAttachment } from "$src/services/workerFeedbackGrievanceService";
import { useGrievanceDraftStore } from "$src/store/grievanceDraftStore";
import PreviewAllFieldsModal from "../modals/PreviewAllFieldsModal";
import GrievanceAccordionSection from "./GrievanceAccordionSection";
import type { GrievanceData, GrievanceNoteEntry } from "./GrievanceForm";
import GrievanceHistoryWidget from "./GrievanceHistoryWidget";
import CommunicatingWithTheWorkers from "./Tabs/SupplierKpi/CommunicatingWithTheWorkers";
import EnsuringAnEthicalInvestigation from "./Tabs/SupplierKpi/EnsuringAnEthicalInvestigation";
import InformationCollection from "./Tabs/SupplierKpi/InformationCollection";
import InvestigationNotesAndAttachments from "./Tabs/SupplierKpi/InvestigationNotesAndAttachments";
import MonitoringAndCommunication from "./Tabs/SupplierKpi/MonitoringAndCommunication";
import SafeguardingAffectedWorkers from "./Tabs/SupplierKpi/SafeguardingAffectedWorkers";

interface SupplierKpiGrievanceFormProps {
	context: { t: (key: string, options?: Record<string, unknown>) => string };
	supplierKpiId: number;
	disableUnmountPrompt?: boolean;
	summary?: {
		caseId: number;
		dateReceived: string;
		issueCategories: string;
		affectedWorkers: string;
		currentStatus: string;
		issueDescription: string;
		assignedStaff?: string[];
		deadline?: string;
		nextSteps?: string;
		closedAt?: string;
	};
	onSaved?: (data: GrievanceData) => void;
}

const defaultGrievanceData: GrievanceData = {
	id: null,
	issara_context: "",
	check_with_hr: "",
	repeat_issue: "",
	information_collection_notes: { value: "" },
	zero_tolerance: "",
	reviewed_individual: "",
	involved_in_grievance: "",
	received_the_training: "",
	has_trained_impartial: { value: "", description: "" },
	safeguarding_notes: { value: "" },
	ethical_reviewed: { value: "", description: "" },
	professional_ensured: { value: "", description: "" },
	impartial_ensured: { value: "", description: "" },
	inclusive_and_accessible: { value: "", description: "" },
	timely_and_effective: { value: "", description: "" },
	ethical_investigation_notes: { value: "" },
	investigation_their_wellbeing: { value: "", description: "" },
	need_help_with_complex_consequences: null,
	communication_notes: { value: "" },
	remediation: { description: "" },
	system_strengthening: { description: "" },
	trainings: [],
	list_of_text_fields: { remediations: [] },
};

const getTextValue = (value: unknown) => {
	if (typeof value === "string") return value;
	if (typeof value === "boolean") return value ? "true" : "false";
	if (
		value &&
		typeof value === "object" &&
		"value" in value &&
		typeof value.value === "string"
	) {
		return value.value;
	}
	return "";
};

const getDescriptionValue = (value: unknown) => {
	if (
		value &&
		typeof value === "object" &&
		"description" in value &&
		typeof value.description === "string"
	) {
		return value.description;
	}
	return "";
};

const normalizeYesNoValue = (value: unknown): string => {
	if (value && typeof value === "object" && "value" in value) {
		return normalizeYesNoValue(value.value);
	}
	if (typeof value === "boolean") return value ? "yes" : "no";
	if (typeof value === "number")
		return value === 1 ? "yes" : value === 0 ? "no" : "";
	if (typeof value !== "string") return "";
	const normalized = value.trim().toLowerCase();
	if (["yes", "true", "1"].includes(normalized)) return "yes";
	if (["no", "false", "0"].includes(normalized)) return "no";
	return normalized;
};

/**
 * Text of the most recent saved entry for one of the "Additional Notes
 * (Internal Only)" fields. The grievance serializer returns each note list
 * newest-first (`order_by("-updated_at")`), but updated_at is compared anyway
 * so the choice does not depend on that ordering.
 */
const latestNoteValue = (entries?: GrievanceNoteEntry[]): string => {
	if (!Array.isArray(entries) || entries.length === 0) return "";
	const withText = entries.filter(
		(entry) => typeof entry?.value === "string" && entry.value.trim(),
	);
	if (withText.length === 0) return "";
	const latest = withText.reduce((newest, entry) => {
		const entryTime = new Date(entry.updated_at ?? 0).getTime();
		const newestTime = new Date(newest.updated_at ?? 0).getTime();
		return entryTime > newestTime ? entry : newest;
	}, withText[0]);
	return latest.value;
};

/**
 * Seed each notes textarea with the latest saved note so an editor opens on the
 * current text and edits it, instead of a blank box. `persist` drops a note from
 * the payload when it still equals what was seeded, so simply opening and saving
 * the form does not duplicate the entry.
 */
const normalizeGrievanceData = (
	data?: Partial<GrievanceData> | null,
): GrievanceData => ({
	...defaultGrievanceData,
	id: typeof data?.id === "number" ? data.id : null,
	issara_context: getTextValue(data?.issara_context),
	check_with_hr: normalizeYesNoValue(
		(data as { checked_with_hr?: unknown } | undefined)?.checked_with_hr ??
			data?.check_with_hr,
	),
	repeat_issue: getTextValue(data?.repeat_issue),
	information_collection_notes: {
		value:
			getTextValue(data?.information_collection_notes) ||
			latestNoteValue(
				data?.list_of_text_fields?.information_collection_notes,
			) ||
			latestNoteValue(data?.list_of_text_fields?.ethical_investigation_notes),
	},
	zero_tolerance: getTextValue(data?.zero_tolerance),
	reviewed_individual: getTextValue(data?.reviewed_individual),
	involved_in_grievance: getTextValue(data?.involved_in_grievance),
	received_the_training: getTextValue(data?.received_the_training),
	has_trained_impartial: {
		value: getTextValue(data?.has_trained_impartial),
		description: getDescriptionValue(data?.has_trained_impartial),
	},
	safeguarding_notes: {
		value:
			getTextValue(data?.safeguarding_notes) ||
			latestNoteValue(data?.list_of_text_fields?.safeguarding_notes),
	},
	ethical_reviewed: {
		value: getTextValue(data?.ethical_reviewed),
		description: getDescriptionValue(data?.ethical_reviewed),
	},
	professional_ensured: {
		value: getTextValue(data?.professional_ensured),
		description: getDescriptionValue(data?.professional_ensured),
	},
	impartial_ensured: {
		value: getTextValue(data?.impartial_ensured),
		description: getDescriptionValue(data?.impartial_ensured),
	},
	inclusive_and_accessible: {
		value: getTextValue(data?.inclusive_and_accessible),
		description: getDescriptionValue(data?.inclusive_and_accessible),
	},
	timely_and_effective: {
		value: getTextValue(data?.timely_and_effective),
		description: getDescriptionValue(data?.timely_and_effective),
	},
	ethical_investigation_notes: {
		value:
			getTextValue(data?.ethical_investigation_notes) ||
			latestNoteValue(data?.list_of_text_fields?.ethical_investigation_notes) ||
			latestNoteValue(data?.list_of_text_fields?.information_collection_notes),
	},
	investigation_their_wellbeing: {
		value: getTextValue(data?.investigation_their_wellbeing),
		description: getDescriptionValue(data?.investigation_their_wellbeing),
	},
	need_help_with_complex_consequences:
		typeof data?.need_help_with_complex_consequences === "boolean"
			? data.need_help_with_complex_consequences
			: null,
	communication_notes: {
		value:
			getTextValue(data?.communication_notes) ||
			latestNoteValue(data?.list_of_text_fields?.communication_notes),
	},
	// remediation / system_strengthening arrive from the API as { id, description }
	// (see grievance get_remediation / get_system_strengthening), so their text
	// lives under `description`, not `value`. Using getTextValue here read `.value`
	// and always yielded "" — the saved draft round-tripped as empty, which looked
	// like "not saving". Read the description explicitly.
	remediation: { description: getDescriptionValue(data?.remediation) },
	system_strengthening: {
		description: getDescriptionValue(data?.system_strengthening),
	},
	trainings: Array.isArray(data?.trainings) ? data.trainings : [],
	list_of_text_fields:
		data?.list_of_text_fields || defaultGrievanceData.list_of_text_fields,
});

/**
 * Notes textareas are seeded with the latest saved note (see
 * normalizeGrievanceData). The backend appends a new Note row for every
 * non-empty note it receives, so a form that is opened and saved without
 * touching the notes would otherwise duplicate them. Blank out any note whose
 * text is still exactly what was seeded — an edit sends, an untouched prefill
 * does not.
 */
const withoutUnchangedNotes = (data: GrievanceData) => {
	const notes = data.list_of_text_fields;
	const unchanged = (
		value: { value: string },
		...sources: (GrievanceNoteEntry[] | undefined)[]
	) =>
		sources.some((source) => {
			const latest = latestNoteValue(source);
			return latest !== "" && latest === value.value;
		})
			? { value: "" }
			: value;

	return {
		...data,
		safeguarding_notes: unchanged(
			data.safeguarding_notes,
			notes?.safeguarding_notes,
		),
		communication_notes: unchanged(
			data.communication_notes,
			notes?.communication_notes,
		),
		information_collection_notes: unchanged(
			data.information_collection_notes,
			notes?.information_collection_notes,
			notes?.ethical_investigation_notes,
		),
		ethical_investigation_notes: unchanged(
			data.ethical_investigation_notes,
			notes?.ethical_investigation_notes,
			notes?.information_collection_notes,
		),
	};
};

/**
 * Every question in "1. Safeguarding" except Additional Notes (Internal Only).
 * The form cannot be submitted until all of them are answered; Save Draft is
 * deliberately left unvalidated so a partially filled section can still be kept.
 */
const SAFEGUARDING_REQUIRED_FIELDS = [
	"zero_tolerance",
	"reviewed_individual",
	"involved_in_grievance",
	"received_the_training",
	"has_trained_impartial",
] as const;

const validateSafeguarding = (data: GrievanceData): Record<string, string> => {
	const errors: Record<string, string> = {};
	for (const field of SAFEGUARDING_REQUIRED_FIELDS) {
		const value = getTextValue(
			(data as unknown as Record<string, unknown>)[field],
		);
		if (!value.trim() || value === "undefined" || value === "null") {
			errors[field] = "Please answer this question before submitting.";
		}
	}
	// The follow-up textarea only exists for this answer, so it is required only
	// when it is actually on screen.
	if (
		getTextValue(data.has_trained_impartial) === "not_necessary" &&
		!getDescriptionValue(data.has_trained_impartial).trim()
	) {
		errors.has_trained_impartial_description =
			"Please describe why before submitting.";
	}
	return errors;
};

const buildPayload = (data: GrievanceData) => ({
	...withoutUnchangedNotes(data),
	checked_with_hr: normalizeYesNoValue(data.check_with_hr),
	check_with_hr: undefined,
	need_help_with_complex_consequences:
		data.need_help_with_complex_consequences ?? false,
	// Send every remediation update as an array so multiple drafts persist. The
	// backend keys drafts by id, creates new rows for id-less entries, and leaves
	// already-submitted (is_submitted) rows untouched.
	remediations: (data.list_of_text_fields?.remediations ?? []).map((entry) => ({
		id: entry.id,
		description: entry.description,
		is_submitted: entry.is_submitted,
	})),
});

/**
 * Parse the `YYYY-MM-DD` prefix of an API date into a *local* Date. `new
 * Date("2024-05-06")` is parsed as UTC midnight, which renders as the 5th for
 * anyone west of Greenwich — a calendar must not show a different day than the
 * table row it was opened from.
 */
const parseIsoDate = (value?: string | null): Date | null => {
	const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!match) return null;
	const [, year, month, day] = match;
	const date = new Date(Number(year), Number(month) - 1, Number(day));
	return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Format a local Date as `YYYY-MM-DD` for the API's DateField. Uses local
 * calendar parts (not toISOString, which would shift the day west of GMT) so it
 * round-trips exactly with parseIsoDate.
 */
const formatDateForApi = (date: Date | null): string | null => {
	if (!date || Number.isNaN(date.getTime())) return null;
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

export default function SupplierKpiGrievanceForm({
	context,
	supplierKpiId,
	disableUnmountPrompt = false,
	summary,
	onSaved,
}: SupplierKpiGrievanceFormProps) {
	const [openSection, setOpenSection] = useState(0);
	// Internal Date Closed. Seeded from the KPI's own closure date and kept in
	// local state only — closure still runs through the authorized KPI workflow,
	// so there is no field on the grievance payload to persist a choice into.
	const [closedAt, setClosedAt] = useState<Date | null>(() =>
		parseIsoDate(summary?.closedAt),
	);
	const [showIntro, setShowIntro] = useState(false);
	const [showPreview, setShowPreview] = useState(false);
	const [showUnmount, setShowUnmount] = useState(false);
	const [grievanceData, setGrievanceData] = useState(defaultGrievanceData);
	const [existingAttachments, setExistingAttachments] = useState<
		ServerAttachment[]
	>([]);
	const [newAttachments, setNewAttachments] = useState<
		PendingGrievanceAttachment[]
	>([]);
	const [removedAttachmentIds, setRemovedAttachmentIds] = useState<number[]>(
		[],
	);
	const [visibilityUpdates, setVisibilityUpdates] = useState<
		Record<number, AttachmentVisibility>
	>({});
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [loadError, setLoadError] = useState(false);
	const [saveState, setSaveState] = useState<"idle" | "saved" | "error">(
		"idle",
	);
	// Populated only once a submit has been blocked, so the section does not open
	// covered in red before the user has had a chance to fill it in.
	const [safeguardingErrors, setSafeguardingErrors] = useState<
		Record<string, string>
	>({});
	const formRef = useRef<HTMLDivElement | null>(null);
	const dirtyRef = useRef(false);
	const submittingRef = useRef(false);
	const setRemediationsDraft = useGrievanceDraftStore(
		(state) => state.setRemediations,
	);

	const applyResponse = (response: unknown, resetPendingAttachments = true) => {
		const normalized = normalizeGrievanceData(
			response as Partial<GrievanceData>,
		);
		setGrievanceData(normalized);
		const attachments = (
			response as { information_collection_attachments?: unknown }
		)?.information_collection_attachments;
		setExistingAttachments(
			Array.isArray(attachments) ? (attachments as ServerAttachment[]) : [],
		);
		if (resetPendingAttachments) {
			setNewAttachments([]);
			setRemovedAttachmentIds([]);
			setVisibilityUpdates({});
		}
		dirtyRef.current = false;
		return normalized;
	};

	const loadGrievance = () => {
		setIsLoading(true);
		setLoadError(false);
		fetchSupplierKpiGrievance(supplierKpiId)
			.then((response) => {
				applyResponse(response);
				// Prefer the grievance's own saved internal closure date; fall back to
				// the KPI's closure date (summary) when the grievance has none yet.
				const savedClosedAt = (
					response as { internal_closed_at?: string | null } | null
				)?.internal_closed_at;
				setClosedAt(
					parseIsoDate(savedClosedAt) ?? parseIsoDate(summary?.closedAt),
				);
				// Restore any in-progress remediation draft the supplier typed
				// earlier this session (kept in the front-end store, not the
				// backend) so collapsing and re-expanding the row doesn't discard
				// unsaved text. Only override when the draft actually has entries.
				const draft =
					useGrievanceDraftStore.getState().remediationsByKpi[supplierKpiId];
				if (Array.isArray(draft) && draft.length > 0) {
					setGrievanceData((current) => ({
						...current,
						list_of_text_fields: {
							...current.list_of_text_fields,
							remediations: draft,
						},
					}));
					dirtyRef.current = true;
				}
			})
			.catch(() => setLoadError(true))
			.finally(() => setIsLoading(false));
	};

	useEffect(loadGrievance, [supplierKpiId]);

	// Re-seed when the underlying KPI closes (or another row reuses this form).
	useEffect(() => {
		setClosedAt(parseIsoDate(summary?.closedAt));
	}, [summary?.closedAt]);

	useEffect(() => {
		const beforeUnload = (event: BeforeUnloadEvent) => {
			if (!dirtyRef.current) return;
			event.preventDefault();
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", beforeUnload);
		return () => window.removeEventListener("beforeunload", beforeUnload);
	}, []);

	useEffect(() => {
		if (disableUnmountPrompt) return;
		const outsideClick = (event: MouseEvent) => {
			if (
				dirtyRef.current &&
				formRef.current &&
				!formRef.current.contains(event.target as Node) &&
				!showPreview
			) {
				setShowUnmount(true);
			}
		};
		document.addEventListener("mousedown", outsideClick);
		return () => document.removeEventListener("mousedown", outsideClick);
	}, [disableUnmountPrompt, showPreview]);

	const changeData = (update: Partial<GrievanceData>) => {
		dirtyRef.current = true;
		setSaveState("idle");
		setGrievanceData((current) => ({ ...current, ...update }));
	};

	// Once a submit has been blocked, re-check the required Safeguarding answers
	// as they are filled in so each flagged question clears as it is answered.
	useEffect(() => {
		setSafeguardingErrors((errors) =>
			Object.keys(errors).length === 0
				? errors
				: validateSafeguarding(grievanceData),
		);
	}, [grievanceData]);

	const addFiles = (files: File[]) => {
		dirtyRef.current = true;
		setSaveState("idle");
		setNewAttachments((current) => [
			...current,
			...files.map((file) => ({
				file,
				permission: ATTACHMENT_VISIBILITY.INTERNAL_ONLY,
			})),
		]);
	};

	const syncAttachments = async (grievanceId: number) => {
		if (
			newAttachments.length === 0 &&
			removedAttachmentIds.length === 0 &&
			Object.keys(visibilityUpdates).length === 0
		) {
			return null;
		}
		return uploadSupplierKpiGrievanceAttachments({
			supplierKpiId,
			grievanceId,
			newFiles: newAttachments,
			removedIds: removedAttachmentIds,
			visibilityUpdates,
		});
	};

	const persist = async (isDraft: boolean, sendEmail = false) => {
		setIsSaving(true);
		setSaveState("idle");
		try {
			const response = await saveSupplierKpiGrievance({
				supplierKpiId,
				grievanceId: grievanceData.id,
				payload: {
					...buildPayload(grievanceData),
					internal_closed_at: formatDateForApi(closedAt),
				},
				isDraft,
				sendEmail,
			});
			let savedResponse: unknown = response;
			const grievanceId = (response as { id?: number })?.id;
			// Sync attachments on every save — drafts included — so uploaded files
			// persist immediately instead of only on submit. applyResponse then
			// resets the pending-attachment state since it has been committed.
			if (grievanceId) {
				const attachmentResponse = await syncAttachments(grievanceId);
				if (attachmentResponse) savedResponse = attachmentResponse;
			}
			const normalized = applyResponse(savedResponse, true);
			setSaveState("saved");
			onSaved?.(normalized);
			return normalized;
		} catch {
			setSaveState("error");
			showToast.error(
				context.t(
					isDraft
						? "Unable to save supplier KPI grievance draft."
						: "Unable to submit supplier KPI grievance.",
				),
			);
			return null;
		} finally {
			setIsSaving(false);
		}
	};

	// Mirror the remediation entries into the front-end draft store on every
	// change so the KPI-detail panel's "Action from the supplier" block reflects
	// what the supplier is typing instantly — no backend round-trip. Persistence
	// still happens only on an explicit Save Draft / Submit (see persist()); this
	// replaced the old debounced auto-save.
	useEffect(() => {
		// Wait until the initial load (and draft hydration in loadGrievance) has
		// settled — otherwise the default-empty state on mount would overwrite a
		// draft the supplier typed earlier this session before we get a chance to
		// restore it.
		if (isLoading) return;
		setRemediationsDraft(
			supplierKpiId,
			grievanceData.list_of_text_fields?.remediations ?? [],
		);
	}, [
		grievanceData.list_of_text_fields?.remediations,
		supplierKpiId,
		setRemediationsDraft,
		isLoading,
	]);

	/**
	 * Gate into Preview & Submit: "1. Safeguarding" must be complete. On failure
	 * the section is opened with the offending questions flagged instead of the
	 * preview modal appearing.
	 */
	const openPreview = () => {
		const errors = validateSafeguarding(grievanceData);
		setSafeguardingErrors(errors);
		if (Object.keys(errors).length > 0) {
			setOpenSection(0);
			formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
			showToast.error(
				context.t(
					"Please complete every question in 1. Safeguarding before submitting.",
				),
			);
			return;
		}
		setShowPreview(true);
	};

	const submit = async () => {
		if (submittingRef.current) return;
		submittingRef.current = true;
		try {
			const saved = await persist(false);
			if (saved) {
				setShowPreview(false);
				setOpenSection(0);
				formRef.current?.scrollIntoView({ behavior: "smooth" });
				showToast.success(
					context.t("Supplier grievance submitted successfully."),
				);
			}
		} finally {
			submittingRef.current = false;
		}
	};

	if (isLoading) {
		return (
			<div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
				Loading Internal Grievance Management form…
			</div>
		);
	}

	if (loadError) {
		return (
			<div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
				<p className="text-sm text-rose-700">
					Unable to load the grievance record.
				</p>
				<button
					className="mt-3 rounded-md border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700"
					onClick={loadGrievance}
					type="button"
				>
					Retry
				</button>
			</div>
		);
	}

	return (
		<Box className="w-full" ref={formRef}>
			<div className="mb-4 flex items-start gap-2">
				<h3 className="text-sm font-semibold leading-6 text-gray-800">
					Provide the case update using CASCADE Internal Grievance Management
					tool.
				</h3>
				{/* Copy mirrors the revamp reference (revamp/src/App.tsx InfoTooltip),
				    which opens on hover as well as click. */}
				<div className="relative">
					<button
						aria-label="What is IGM?"
						className="text-gray-400 hover:text-[#148696]"
						onClick={() => setShowIntro((value) => !value)}
						onMouseEnter={() => setShowIntro(true)}
						onMouseLeave={() => setShowIntro(false)}
						type="button"
					>
						<Info size={14} />
					</button>
					{showIntro && (
						<div className="absolute left-5 top-0 z-40 w-[min(22rem,75vw)] rounded-lg border border-gray-200 bg-white p-4 text-xs leading-5 text-gray-600 shadow-xl">
							<p className="font-semibold text-gray-800">
								CASCADE Internal Grievance Management (IGM)
							</p>
							<p className="mt-1.5">
								The ILM interactive grievance management tool allows you to
								receive and review ongoing worker feedback and worker-reported
								issues at your site, and respond in a timely and ethical manner.
								Functioning ethical grievance mechanisms must always have two
								things: (1) Safeguarded workers, and (2) Responsive, respectful
								employers and recruiters. To review more on the 8 components of
								Ethical Grievance Mechanisms, please download the one-page
								primer{" "}
								<a className="font-medium text-[#148696] underline" href="#">
									here PDF
								</a>
								.
							</p>
							<p className="mt-2 font-semibold text-gray-800">
								Reminder! The 8 components of Ethical Grievance Mechanisms:
							</p>
							<ol className="mt-1 list-inside list-decimal space-y-0.5">
								<li>Ethical</li>
								<li>Professional</li>
								<li>Inclusive</li>
								<li>Accessible</li>
								<li>Safe</li>
								<li>Impartial</li>
								<li>Timely action</li>
								<li>Effective</li>
							</ol>
						</div>
					)}
				</div>
			</div>

			<div className="space-y-3">
				<GrievanceAccordionSection
					badge="Required"
					icon={<Shield size={16} />}
					isOpen={openSection === 0}
					onToggle={() => setOpenSection((current) => (current === 0 ? -1 : 0))}
					subtitle="Immediate protective actions for workers involved"
					title="1. Safeguarding"
				>
					<SafeguardingAffectedWorkers
						context={context}
						data={grievanceData}
						errors={safeguardingErrors}
						handleOnClick={() => setOpenSection(1)}
						hideActions
						onDataChange={changeData}
					/>
				</GrievanceAccordionSection>

				<GrievanceAccordionSection
					icon={<Search size={16} />}
					isOpen={openSection === 1}
					onToggle={() => setOpenSection((current) => (current === 1 ? -1 : 1))}
					subtitle="Root cause analysis and evidence gathering"
					title="2. Investigation"
				>
					<div className="space-y-8">
						<InformationCollection
							context={context}
							data={grievanceData}
							onDataChange={changeData}
						/>
						<EnsuringAnEthicalInvestigation
							context={context}
							data={grievanceData}
							onDataChange={changeData}
						/>
						<div className="border-t border-gray-100 pt-6">
							<InvestigationNotesAndAttachments
								context={context}
								data={grievanceData}
								existingAttachments={existingAttachments}
								newAttachments={newAttachments}
								onAddFiles={addFiles}
								onChangeExistingAttachmentPermission={(id, permission) => {
									dirtyRef.current = true;
									setSaveState("idle");
									setExistingAttachments((attachments) =>
										attachments.map((attachment) =>
											attachment.id === id
												? { ...attachment, permission }
												: attachment,
										),
									);
									setVisibilityUpdates((updates) => ({
										...updates,
										[id]: permission,
									}));
								}}
								onChangeNewAttachmentPermission={(index, permission) => {
									dirtyRef.current = true;
									setSaveState("idle");
									setNewAttachments((attachments) =>
										attachments.map((attachment, attachmentIndex) =>
											attachmentIndex === index
												? { ...attachment, permission }
												: attachment,
										),
									);
								}}
								onDataChange={changeData}
								onRemoveExistingAttachment={(id) => {
									dirtyRef.current = true;
									setSaveState("idle");
									setVisibilityUpdates((updates) => {
										const next = { ...updates };
										delete next[id];
										return next;
									});
									setRemovedAttachmentIds((ids) =>
										ids.includes(id)
											? ids.filter((value) => value !== id)
											: [...ids, id],
									);
								}}
								onRemoveNewAttachment={(index) => {
									dirtyRef.current = true;
									setSaveState("idle");
									setNewAttachments((attachments) =>
										attachments.filter((_, itemIndex) => itemIndex !== index),
									);
								}}
								removedAttachmentIds={removedAttachmentIds}
							/>
						</div>
					</div>
				</GrievanceAccordionSection>

				<GrievanceAccordionSection
					icon={<MessageSquare size={16} />}
					isOpen={openSection === 2}
					onToggle={() => setOpenSection((current) => (current === 2 ? -1 : 2))}
					subtitle="Communicating with workers, Issara and buyers"
					title="3. Communications"
				>
					<div className="space-y-8">
						<CommunicatingWithTheWorkers
							context={context}
							data={grievanceData}
							handleOnClick={() => setOpenSection(3)}
							hideActions
							onDataChange={changeData}
						/>
						<div className="border-t border-gray-100 pt-6">
							<p className="mb-3 px-4 text-xs font-bold text-gray-700 md:px-8">
								Communicating with Issara &amp; Buyers
							</p>
							<div className="mb-3 mx-4 rounded-md border border-[#A6DFDD]/60 bg-[#A6DFDD]/20 p-3 text-xs leading-5 text-[#0f6b78] md:mx-8">
								Case updates entered here are time-stamped and viewable by your
								team, Issara, and your customers.
							</div>
							<MonitoringAndCommunication
								context={context}
								data={grievanceData}
								handleOnClick={() => undefined}
								handlePreview={openPreview}
								hideActions
								mode="remediation"
								onDataChange={changeData}
							/>
						</div>
					</div>
				</GrievanceAccordionSection>

				<GrievanceAccordionSection
					icon={<FolderCheck size={16} />}
					isOpen={openSection === 3}
					onToggle={() => setOpenSection((current) => (current === 3 ? -1 : 3))}
					subtitle="Systems strengthening and closure"
					title="4. Case Update / Closure"
				>
					<MonitoringAndCommunication
						context={context}
						data={grievanceData}
						handleOnClick={() => undefined}
						handlePreview={openPreview}
						hideActions
						mode="system-strengthening"
						onDataChange={changeData}
					/>
					<div className="mt-6 px-4 md:px-8">
						<label
							className="mb-1 block text-xs font-semibold text-gray-600"
							htmlFor={`closed-at-${supplierKpiId}`}
						>
							Internal Date Closed
						</label>
						<CascadeDatePicker
							aria-label="Internal Date Closed"
							id={`closed-at-${supplierKpiId}`}
							onChange={setClosedAt}
							placeholderText="Select the internal closure date"
							selected={closedAt}
						/>
						<p className="mt-1 text-[11px] text-gray-400">
							Saved with the grievance record when you Save Draft or submit. The
							case's actual closure still runs through the existing authorized
							KPI closing workflow.
						</p>
					</div>
				</GrievanceAccordionSection>
			</div>

			<div className="mt-5 border-t border-gray-100 pt-4">
				<div className="mb-3 flex items-center justify-between">
					<p
						className={`text-xs ${saveState === "error" ? "text-rose-600" : "text-gray-400"}`}
					>
						{isSaving
							? "Saving…"
							: saveState === "saved"
								? "Draft saved"
								: saveState === "error"
									? "Save failed. Your unsaved changes remain in this form."
									: "Changes are saved when you select Save Draft or submit."}
					</p>
					{/* Mock-only for now (see GrievanceHistoryWidget) — takes no case props. */}
					<GrievanceHistoryWidget />
				</div>
				<Flex gap="3" justify="end">
					<Button
						disabled={isSaving}
						onClick={() => void persist(true)}
						variant="outline"
					>
						<Save size={13} />
						{isSaving ? "Saving…" : "Save Draft"}
					</Button>
					<Button
						disabled={isSaving}
						onClick={openPreview}
						style={{ backgroundColor: "#148696", color: "white" }}
					>
						<Send size={13} />
						Preview &amp; Submit
					</Button>
				</Flex>
			</div>

			<PreviewAllFieldsModal
				data={grievanceData}
				existingAttachments={existingAttachments}
				isOpen={showPreview}
				isSubmitting={isSaving}
				newAttachments={newAttachments.map((attachment) => attachment.file)}
				onClose={() => setShowPreview(false)}
				onSubmit={() => void submit()}
				removedAttachmentIds={removedAttachmentIds}
				summary={summary}
			/>

			{showUnmount && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
					<div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
						<h2 className="mb-4 font-bold">
							Would you like to save this grievance as a draft before leaving?
						</h2>
						<div className="flex justify-end gap-3">
							<button
								className="rounded bg-[#148696] px-4 py-2 text-white"
								onClick={() => {
									setShowUnmount(false);
									void persist(true);
								}}
								type="button"
							>
								Save Draft
							</button>
							<button
								className="rounded bg-gray-500 px-4 py-2 text-white"
								onClick={() => setShowUnmount(false)}
								type="button"
							>
								Keep editing
							</button>
						</div>
					</div>
				</div>
			)}
		</Box>
	);
}
