import {
	ChevronLeftIcon,
	ChevronRightIcon,
	FileTextIcon,
} from "@radix-ui/react-icons";
import { Box, Button, Flex, Tabs } from "@radix-ui/themes";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
	createOrUpdateWorkerFeedbackGrievance,
	fetchWorkerFeedbackGrievance,
	type ServerAttachment,
	type WorkerFeedbackGrievanceApiData,
} from "$src/services/workerFeedbackGrievanceService";
import PreviewAllFieldsModal from "../modals/PreviewAllFieldsModal";
import CommunicatingWithTheWorkers from "./Tabs/WorkerFeedback/CommunicatingWithTheWorkers";
import EnsuringAnEthicalInvestigation from "./Tabs/WorkerFeedback/EnsuringAnEthicalInvestigation";
import InformationCollection from "./Tabs/WorkerFeedback/InformationCollection";
import Introduction from "./Tabs/WorkerFeedback/Introduction";
import MonitoringAndCommunication from "./Tabs/WorkerFeedback/MonitoringAndCommunication";
import SafeguardingAffectedWorkers from "./Tabs/WorkerFeedback/SafeguardingAffectedWorkers";
import Trainings from "./Tabs/WorkerFeedback/Trainings";

interface GrievanceFormProps {
	context: {
		t: (key: string, options?: Record<string, unknown>) => string;
	};
	workerFeedbackId?: number;
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
	};
}

export type IssaraContextValue =
	| ""
	| "no need"
	| "wantMoreInfo"
	| "alreadyReachedOut";

export interface GrievanceData {
	id: number | null;
	issara_context: IssaraContextValue | string;
	check_with_hr: string;
	repeat_issue: string;
	information_collection_notes: { value: string };
	zero_tolerance: string;
	reviewed_individual: string;
	involved_in_grievance: string;
	received_the_training: string;
	has_trained_impartial: { value: string; description: string };
	safeguarding_notes: { value: string };
	ethical_reviewed: { value: string; description: string };
	professional_ensured: { value: string; description: string };
	impartial_ensured: { value: string; description: string };
	inclusive_and_accessible: { value: string; description: string };
	timely_and_effective: { value: string; description: string };
	ethical_investigation_notes: { value: string };
	investigation_their_wellbeing: { value: string; description: string };
	need_help_with_complex_consequences: boolean | null;
	communication_notes: { value: string };
	remediation: { description: string };
	system_strengthening: { description: string };
	trainings: string[];
	list_of_text_fields?: {
		remediations?: Array<{
			id?: number;
			description: string;
			created_at?: string;
			updated_at?: string;
			author_email?: string | null;
			is_submitted?: boolean;
		}>;
		system_strengthenings?: Array<{
			id?: number;
			description: string;
			created_at?: string;
			updated_at?: string;
			author_email?: string | null;
		}>;
		information_collection_notes?: GrievanceNoteEntry[];
		safeguarding_notes?: GrievanceNoteEntry[];
		ethical_investigation_notes?: GrievanceNoteEntry[];
		communication_notes?: GrievanceNoteEntry[];
	};
}

/**
 * One saved "Additional Notes (Internal Only)" entry. The API returns these
 * newest-first (grievance serializer orders by `-updated_at`) and already
 * carries the author, so "who wrote this note" needs no extra plumbing.
 */
export interface GrievanceNoteEntry {
	id?: number;
	value: string;
	created_at?: string;
	updated_at?: string;
	author?: number | null;
	author_email?: string | null;
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
	if (typeof value === "string") {
		return value;
	}

	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}

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

const getPayloadStringValue = (value: unknown) => {
	if (typeof value === "string") {
		return value;
	}

	if (typeof value === "boolean") {
		return value ? "true" : "false";
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

const normalizeGrievanceData = (
	data?:
		| Partial<WorkerFeedbackGrievanceApiData>
		| Partial<GrievanceData>
		| null,
): GrievanceData => ({
	...defaultGrievanceData,
	id: typeof data?.id === "number" ? data.id : null,
	issara_context: getTextValue(data?.issara_context),
	check_with_hr: getTextValue(data?.check_with_hr),
	repeat_issue: getTextValue(data?.repeat_issue),
	information_collection_notes: {
		value: getTextValue(data?.information_collection_notes),
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
		value: getTextValue(data?.safeguarding_notes),
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
		value: getTextValue(data?.ethical_investigation_notes),
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
		value: getTextValue(data?.communication_notes),
	},
	remediation: {
		description: getTextValue(data?.remediation),
	},
	system_strengthening: {
		description: getTextValue(data?.system_strengthening),
	},
	trainings: Array.isArray(data?.trainings) ? data.trainings : [],
	list_of_text_fields:
		(data as GrievanceData | undefined)?.list_of_text_fields ||
		defaultGrievanceData.list_of_text_fields,
});

const buildGrievancePayload = (
	workerFeedbackId: number,
	data: GrievanceData,
) => ({
	worker_feedback_id: workerFeedbackId,
	issara_context: getPayloadStringValue(data.issara_context),
	check_with_hr: getPayloadStringValue(data.check_with_hr),
	repeat_issue: getPayloadStringValue(data.repeat_issue),
	information_collection_notes: data.information_collection_notes.value,
	zero_tolerance: getPayloadStringValue(data.zero_tolerance),
	reviewed_individual: getPayloadStringValue(data.reviewed_individual),
	involved_in_grievance: getPayloadStringValue(data.involved_in_grievance),
	safeguarding_notes: data.safeguarding_notes.value,
	ethical_reviewed: getPayloadStringValue(data.ethical_reviewed.value),
	professional_ensured: getPayloadStringValue(data.professional_ensured.value),
	impartial_ensured: getPayloadStringValue(data.impartial_ensured.value),
	inclusive_and_accessible: getPayloadStringValue(
		data.inclusive_and_accessible.value,
	),
	timely_and_effective: getPayloadStringValue(data.timely_and_effective.value),
	ethical_investigation_notes: data.ethical_investigation_notes.value,
	investigation_their_wellbeing: getPayloadStringValue(
		data.investigation_their_wellbeing.value,
	),
	need_help_with_complex_consequences:
		data.need_help_with_complex_consequences ?? false,
	communication_notes: data.communication_notes.value,
	remediation: data.remediation.description,
	system_strengthening: data.system_strengthening.description,
	trainings: data.trainings,
	received_the_training: getPayloadStringValue(data.received_the_training),
	has_trained_impartial: getPayloadStringValue(
		data.has_trained_impartial.value,
	),
});

const GrievanceForm: React.FC<GrievanceFormProps> = ({
	context,
	workerFeedbackId,
	disableUnmountPrompt = false,
	summary,
}) => {
	const totalTabs = 7;

	const issara_trainings = [
		"Ethical Recruitment 101 Introductory modules",
		"Ethical Recruitment Advanced training 201",
		"Business and Human Rights & HRDD: Going Beyond Audit",
		"Ethical Grievance Mechanism 101",
		"Ethical Grievance Mechanism 201",
		"Line Supervisors Training",
		"Interpreters Training",
	];

	const [currentTab, setCurrentTab] = useState(0);
	const [showDialog, setShowDialog] = useState(false);
	const [showMessage, setShowMessage] = useState(false);
	const [showUnmount, setShowUnmount] = useState(false);
	const [showPreviewAllFields, setShowPreviewAllFields] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [grievanceData, setGrievanceData] =
		useState<GrievanceData>(defaultGrievanceData);
	const [existingAttachments, setExistingAttachments] = useState<
		ServerAttachment[]
	>([]);
	const [newAttachments, setNewAttachments] = useState<File[]>([]);
	const [removedAttachmentIds, setRemovedAttachmentIds] = useState<number[]>(
		[],
	);

	const handleAddFiles = (files: File[]) => {
		setNewAttachments((prev) => [...prev, ...files]);
	};

	const handleRemoveExistingAttachment = (id: number) => {
		setRemovedAttachmentIds((prev) =>
			prev.includes(id)
				? prev.filter((existing) => existing !== id)
				: [...prev, id],
		);
	};

	const handleRemoveNewAttachment = (index: number) => {
		setNewAttachments((prev) => prev.filter((_, i) => i !== index));
	};

	const tabsRef = useRef<HTMLDivElement | null>(null);
	const tabTriggersRef = useRef<HTMLDivElement | null>(null);
	const prevData = useRef<GrievanceData | undefined>(undefined);
	const firstMount = useRef(true);
	const isDataChanged = useRef(true);
	const suppressOutsideClickRef = useRef(false);
	const isSubmittingRef = useRef(false);

	const [showLeftScroll, setShowLeftScroll] = useState(false);
	const [showRightScroll, setShowRightScroll] = useState(false);
	const tabListScrollRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!workerFeedbackId) {
			prevData.current = defaultGrievanceData;
			return;
		}

		fetchWorkerFeedbackGrievance(workerFeedbackId)
			.then((response) => {
				const normalized = normalizeGrievanceData(response);
				setGrievanceData(normalized);
				prevData.current = normalized;
				setExistingAttachments(
					Array.isArray(response?.information_collection_attachments)
						? (response?.information_collection_attachments as ServerAttachment[])
						: [],
				);
				setNewAttachments([]);
				setRemovedAttachmentIds([]);
			})
			.catch(() => {
				prevData.current = defaultGrievanceData;
			});
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		document.addEventListener("mousedown", handleUnmount);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
			document.removeEventListener("mousedown", handleUnmount);
		};
	}, [workerFeedbackId]);

	useEffect(() => {
		if (firstMount.current) {
			firstMount.current = false;
			return;
		}
		isDataChanged.current = prevData.current !== grievanceData;
	}, [grievanceData]);

	useEffect(() => {
		const checkForScrollbar = () => {
			if (tabListScrollRef.current) {
				const { scrollWidth, clientWidth, scrollLeft } =
					tabListScrollRef.current;
				setShowRightScroll(
					scrollWidth > clientWidth &&
						scrollWidth - clientWidth - scrollLeft > 10,
				);
				setShowLeftScroll(scrollLeft > 10);
			}
		};
		checkForScrollbar();
		window.addEventListener("resize", checkForScrollbar);
		const tabList = tabListScrollRef.current;
		if (tabList) {
			tabList.addEventListener("scroll", checkForScrollbar);
		}
		return () => {
			window.removeEventListener("resize", checkForScrollbar);
			if (tabList) {
				tabList.removeEventListener("scroll", checkForScrollbar);
			}
		};
	}, []);

	useEffect(() => {
		suppressOutsideClickRef.current = showPreviewAllFields;
	}, [showPreviewAllFields]);

	const handleUnmount = (event: MouseEvent) => {
		if (disableUnmountPrompt) {
			return;
		}

		if (suppressOutsideClickRef.current) {
			return;
		}

		if (
			tabsRef.current &&
			!(tabsRef.current as HTMLDivElement).contains(event.target as Node)
		) {
			if (!isDataChanged.current) {
				setShowUnmount(true);
			}
		}
	};

	const persistGrievance = async (successMessage: string) => {
		if (!workerFeedbackId) {
			throw new Error("Grievance target is missing");
		}

		// Ref-based re-entry guard. React state updates aren't synchronous,
		// so two clicks within the same render cycle could both observe
		// isSaving=false and fire parallel submissions (manifesting as
		// duplicate attachment uploads).
		if (isSubmittingRef.current) {
			return null;
		}
		isSubmittingRef.current = true;
		setIsSaving(true);

		try {
			const response = await createOrUpdateWorkerFeedbackGrievance({
				payload: buildGrievancePayload(workerFeedbackId, grievanceData),
				newFiles: newAttachments,
				removedIds: removedAttachmentIds,
			});

			if (!response) {
				throw new Error("Failed to save grievance");
			}

			const normalized = normalizeGrievanceData(response);
			setGrievanceData(normalized);
			prevData.current = normalized;
			setExistingAttachments(
				Array.isArray(response.information_collection_attachments)
					? response.information_collection_attachments
					: [],
			);
			setNewAttachments([]);
			setRemovedAttachmentIds([]);
			localStorage.removeItem(`grievance_draft_${workerFeedbackId}`);
			setShowDialog(false);
			setShowPreviewAllFields(false);
			alert(successMessage);
			return normalized;
		} finally {
			setIsSaving(false);
			isSubmittingRef.current = false;
		}
	};

	const handleSubmit = (isSubmit: boolean, _send_email?: boolean) => {
		if (isSubmit) {
			void persistGrievance(
				context
					.t("workerFeedbackGrievance.messages.submitted")
					.replace("{{caseId}}", String(workerFeedbackId)),
			).then(() => {
				setCurrentTab(0);
				tabsRef.current?.scrollIntoView({ behavior: "smooth" });
			});
			return;
		}
		setShowDialog(true);
	};

	const handleSave = () => {
		void persistGrievance(
			context
				.t("workerFeedbackGrievance.messages.saved")
				.replace("{{caseId}}", String(workerFeedbackId)),
		);
	};

	const handleDataChange = (updatedData: Partial<GrievanceData>) => {
		setGrievanceData((prevData) => ({ ...prevData, ...updatedData }));
	};

	const handleOnClick = (next = true) => {
		if (!workerFeedbackId) {
			return;
		}

		if (!next) {
			localStorage.setItem(
				`grievance_draft_${workerFeedbackId}`,
				JSON.stringify(grievanceData),
			);
			setShowMessage(true);
			setShowUnmount(false);
			setTimeout(() => {
				setShowMessage(false);
			}, 5000);
			return;
		}

		if (currentTab !== 0) {
			localStorage.setItem(
				`grievance_draft_${workerFeedbackId}`,
				JSON.stringify(grievanceData),
			);
			setShowMessage(true);
			nextTab();
			setTimeout(() => {
				setShowMessage(false);
			}, 5000);
			return;
		}
		nextTab();
	};

	const getRemediationTabSize = () => {
		const remediations = grievanceData.list_of_text_fields?.remediations;
		if (Array.isArray(remediations) && remediations.length > 0) return 6;
		return 7;
	};

	const scrollActiveTabIntoView = (tabIdx: number) => {
		if (!tabTriggersRef.current) return;
		const triggers = tabTriggersRef.current.querySelectorAll("[data-state]");
		const activeTrigger = triggers[tabIdx] as HTMLElement | undefined;
		if (activeTrigger && typeof activeTrigger.scrollIntoView === "function") {
			activeTrigger.scrollIntoView({
				behavior: "smooth",
				inline: "center",
				block: "nearest",
			});
		}
	};

	const nextTab = () => {
		const tab_size = getRemediationTabSize();
		setCurrentTab((prevIndex) => {
			const nextIdx = (prevIndex + 1) % tab_size;
			setTimeout(() => scrollActiveTabIntoView(nextIdx), 0);
			return nextIdx;
		});
		if (tabsRef.current) {
			tabsRef.current.scrollIntoView({ behavior: "smooth" });
		}
	};

	const handlePreview = () => {
		handleOnClick();
		setShowPreviewAllFields(true);
	};

	const handlePreviewSubmit = () => {
		handleSubmit(true);
	};

	const scrollTabs = (direction: "left" | "right") => {
		if (tabListScrollRef.current) {
			const scrollAmount = direction === "left" ? -200 : 200;
			tabListScrollRef.current.scrollBy({
				left: scrollAmount,
				behavior: "smooth",
			});
		}
	};

	const tabList = [
		{
			label: context.t("workerFeedbackGrievance.tabs.introduction"),
			content: <Introduction context={context} summary={summary} />,
		},
		{
			label: context.t("workerFeedbackGrievance.tabs.informationCollection"),
			content: (
				<InformationCollection
					attachmentsDisabled={!workerFeedbackId}
					context={context}
					data={grievanceData}
					existingAttachments={existingAttachments}
					newAttachments={newAttachments}
					onAddFiles={handleAddFiles}
					onDataChange={handleDataChange}
					onRemoveExistingAttachment={handleRemoveExistingAttachment}
					onRemoveNewAttachment={handleRemoveNewAttachment}
					removedAttachmentIds={removedAttachmentIds}
				/>
			),
		},
		{
			label: context.t("workerFeedbackGrievance.tabs.safeguardingWorkers"),
			content: (
				<SafeguardingAffectedWorkers
					context={context}
					data={grievanceData}
					handleOnClick={handleOnClick}
					onDataChange={handleDataChange}
				/>
			),
		},
		{
			label: context.t("workerFeedbackGrievance.tabs.ethicalInvestigation"),
			content: (
				<EnsuringAnEthicalInvestigation
					context={context}
					data={grievanceData}
					handleOnClick={handleOnClick}
					onDataChange={handleDataChange}
				/>
			),
		},
		{
			label: context.t("workerFeedbackGrievance.tabs.workerCommunication"),
			content: (
				<CommunicatingWithTheWorkers
					context={context}
					data={grievanceData}
					handleOnClick={handleOnClick}
					onDataChange={handleDataChange}
				/>
			),
		},
		{
			label: context.t(
				"workerFeedbackGrievance.tabs.monitoringAndCommunication",
			),
			content: (
				<MonitoringAndCommunication
					context={context}
					data={grievanceData}
					handleOnClick={handleOnClick}
					handlePreview={handlePreview}
					onDataChange={handleDataChange}
				/>
			),
		},
		{
			label: context.t("workerFeedbackGrievance.tabs.training"),
			content: (
				<Trainings
					context={context}
					data={grievanceData}
					handlePreview={handlePreview}
					issara_trainings={issara_trainings}
					onDataChange={handleDataChange}
					summary={{
						assignedStaff: summary?.assignedStaff,
						deadline: summary?.deadline,
						nextSteps: summary?.nextSteps,
					}}
				/>
			),
		},
	];

	return (
		<Box
			className="w-full rounded-2xl border border-gray-200 bg-[#fbfbfc] px-6 py-5 shadow-sm"
			ref={tabsRef}
		>
			<Tabs.Root
				onValueChange={(v) => {
					setCurrentTab(Number(v));
					setTimeout(() => scrollActiveTabIntoView(Number(v)), 0);
				}}
				value={String(currentTab)}
			>
				<div style={{ position: "relative" }}>
					{showLeftScroll && (
						<div
							className="scroll-indicator left"
							onClick={() => scrollTabs("left")}
							style={{
								position: "absolute",
								left: 0,
								top: 0,
								bottom: 0,
								width: "2rem",
								display: "flex",
								alignItems: "center",
								zIndex: 10,
								cursor: "pointer",
								background:
									"linear-gradient(to right, rgba(255,255,255,0.9) 30%, rgba(255,255,255,0) 100%)",
							}}
						>
							<div
								className="scroll-indicator-icon"
								style={{
									backgroundColor: "white",
									borderRadius: "50%",
									width: 24,
									height: 24,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									boxShadow:
										"0 2px 4px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.12),0 0 1px rgba(0,0,0,0.05)",
									color: "#BF1291",
								}}
							>
								<ChevronLeftIcon height={16} width={16} />
							</div>
						</div>
					)}
					<Tabs.List
						className="mb-6 border-b border-gray-200"
						onScroll={() => {
							if (tabListScrollRef.current) {
								const { scrollWidth, clientWidth, scrollLeft } =
									tabListScrollRef.current;
								setShowRightScroll(
									scrollWidth > clientWidth &&
										scrollWidth - clientWidth - scrollLeft > 0.625,
								);
								setShowLeftScroll(scrollLeft > 0.625);
							}
						}}
						ref={(el) => {
							tabTriggersRef.current = el;
							tabListScrollRef.current = el;
						}}
						style={{ overflowX: "auto", whiteSpace: "nowrap" }}
					>
						{tabList.slice(0, getRemediationTabSize()).map((tab, idx) => (
							<Tabs.Trigger
								className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors duration-200 ${currentTab === idx ? "border-[#3f51d6] text-[#3f51d6]" : "border-transparent text-gray-500 hover:text-gray-500"}`}
								key={tab.label}
								// style={{color: "#3f405c"}}
								value={String(idx)}
							>
								{tab.label}
							</Tabs.Trigger>
						))}
					</Tabs.List>
					{showRightScroll && (
						<div
							className="scroll-indicator right"
							onClick={() => scrollTabs("right")}
							style={{
								position: "absolute",
								right: 0,
								top: 0,
								bottom: 0,
								width: "2rem",
								display: "flex",
								alignItems: "center",
								zIndex: 10,
								cursor: "pointer",
								background:
									"linear-gradient(to left, rgba(255,255,255,0.9) 30%, rgba(255,255,255,0) 100%)",
							}}
						>
							<div
								className="scroll-indicator-icon"
								style={{
									backgroundColor: "white",
									borderRadius: "50%",
									width: 24,
									height: 24,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									boxShadow:
										"0 2px 4px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.12),0 0 1px rgba(0,0,0,0.05)",
									color: "#BF1291",
								}}
							>
								<ChevronRightIcon height={16} width={16} />
							</div>
						</div>
					)}
				</div>
				{tabList.slice(0, getRemediationTabSize()).map((tab, idx) => (
					<Tabs.Content key={tab.label} value={String(idx)}>
						<Box className="flex min-h-[420px] flex-col py-4">
							{tab.content}
							<Flex align="center" className="mt-auto pt-10" justify="between">
								<div>
									<Button
										className="min-w-[124px] rounded-lg px-5 py-2.5 text-sm font-medium"
										disabled={idx === 0}
										onClick={() => {
											if (idx === 0) return;
											setCurrentTab(idx - 1);
											setTimeout(() => scrollActiveTabIntoView(idx - 1), 0);
										}}
										style={{
											backgroundColor: idx === 0 ? "#f3f4f6" : "transparent",
											border: "1px solid #d1d5db",
											color: idx === 0 ? "#9ca3af" : "#6b7280",
											boxShadow: "none",
										}}
										variant="outline"
									>
										<ChevronLeftIcon />
										PREVIOUS
									</Button>
								</div>
								<p className="text-sm text-gray-500">
									{idx + 1} of {totalTabs}
								</p>
								<Flex gap="3" justify="end">
									{idx < getRemediationTabSize() - 1 && (
										<Button
											className="min-w-[108px] rounded-lg px-5 py-2.5 text-sm font-medium"
											onClick={() => {
												setCurrentTab(idx + 1);
												setTimeout(() => scrollActiveTabIntoView(idx + 1), 0);
											}}
											style={{
												backgroundColor: "transparent",
												border: "1px solid #4c5bd4",
												color: "#4c5bd4",
												boxShadow: "none",
											}}
											variant="outline"
										>
											NEXT
											<ChevronRightIcon />
										</Button>
									)}
									<Button
										className="min-w-[148px] rounded-md px-5 py-2.5 text-sm font-medium"
										onClick={handlePreview}
										style={{
											backgroundColor: "transparent",
											border: "1px solid #4c5bd4",
											color: "#4c5bd4",
											boxShadow: "none",
										}}
										variant="outline"
									>
										VIEW DETAILS
									</Button>
									<Button
										className="min-w-[100px] rounded-lg px-5 py-2.5 text-sm font-medium"
										disabled={isSaving}
										onClick={handleSave}
										style={{
											backgroundColor: "#67b95a",
											border: "1px solid #67b95a",
											color: "#ffffff",
											boxShadow: "0 2px 6px rgba(0, 0, 0, 0.12)",
										}}
										variant="solid"
									>
										<FileTextIcon />
										{isSaving ? "SAVING..." : "SAVE"}
									</Button>
								</Flex>
							</Flex>
						</Box>
					</Tabs.Content>
				))}
			</Tabs.Root>
			<PreviewAllFieldsModal
				data={grievanceData}
				existingAttachments={existingAttachments}
				isOpen={showPreviewAllFields}
				isSubmitting={isSaving}
				newAttachments={newAttachments}
				onClose={() => setShowPreviewAllFields(false)}
				onSubmit={handlePreviewSubmit}
				removedAttachmentIds={removedAttachmentIds}
				summary={summary}
			/>
			{showDialog && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
					<div className="bg-white rounded shadow-lg p-6 max-w-md w-full">
						<h2 className="font-bold mb-4">
							{context.t(
								"Would you like assistance from Issara Institute to follow up on ethical grievance processes?",
							)}
						</h2>
						<div className="flex gap-4 justify-end">
							<button
								className="bg-rose-500 text-white px-4 py-2 rounded"
								disabled={isSaving}
								onClick={() => handleSubmit(true, true)}
							>
								{isSaving ? "Saving..." : "Yes"}
							</button>
							<button
								className="bg-gray-500 text-white px-4 py-2 rounded"
								disabled={isSaving}
								onClick={() => handleSubmit(true, false)}
							>
								{isSaving ? "Saving..." : "No"}
							</button>
						</div>
					</div>
				</div>
			)}
			{showUnmount && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
					<div className="bg-white rounded shadow-lg p-6 max-w-md w-full">
						<h2 className="font-bold mb-4">
							{context.t(
								"Would you like to save the grievance form as a draft before leaving?",
							)}
						</h2>
						<div className="flex gap-4 justify-end">
							<button
								className="bg-rose-500 text-white px-4 py-2 rounded"
								onClick={() => handleOnClick(false)}
							>
								Yes
							</button>
							<button
								className="bg-gray-500 text-white px-4 py-2 rounded"
								onClick={() => setShowUnmount(false)}
							>
								No
							</button>
						</div>
					</div>
				</div>
			)}
			{showMessage && (
				<div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow">
					Draft saved successfully.
				</div>
			)}
		</Box>
	);
};

export default GrievanceForm;
