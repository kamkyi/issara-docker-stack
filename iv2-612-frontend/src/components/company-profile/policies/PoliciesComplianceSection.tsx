import {
	CheckCircledIcon,
	FileTextIcon,
	Pencil1Icon,
	PlusIcon,
} from "@radix-ui/react-icons";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
	type StrategicPartnerWorkplanPolicyFile,
	useCreatePolicy,
	useCreateWorkplanFile,
	useDeletePolicy,
	useDeleteWorkplanFile,
	usePoliciesByOwner,
	useStrategicPartnerWorkplanPolicyFiles,
	useUpdatePolicy,
	useUpdateWorkplanFile,
} from "$src/hooks/usePolicies";
import { useTranslation } from "$src/hooks/useTranslation";
import { useLksgRiskSettings } from "$src/queries/useLksgRiskSettings";
import {
	type LksgRiskValues,
	useLksgRiskStore,
} from "$src/store/lksgRiskStore";

import type {
	Policy,
	PolicyCategorySlug,
	PolicyOwner,
} from "$src/types/policies";
import {
	POLICY_CATEGORY_LABEL,
	POLICY_TEXT_MAX_LENGTH,
} from "$src/types/policies";
import { useMockData } from "$src/utils/config";
import CascadeButton from "../../button/button";
import { CoverageTracker } from "./CoverageTracker";
import { LksgRiskFieldsConfig } from "./LksgRiskFieldsConfig";
import { PolicyEditor } from "./PolicyEditor";
import { PolicyView } from "./PolicyView";
import { emptyDraft, type PolicyDraft, policyToDraft } from "./types";

/** LkSG fields this section owns; the rest live in Basic Information. */
const POLICIES_LKSG_FIELDS: (keyof LksgRiskValues)[] = [
	"workerVoiceMechanism",
	"remediationSupport",
	"seniorManagementReportingConfirmed",
	"seniorManagementReportingDate",
];

interface PoliciesComplianceSectionProps {
	owner: PolicyOwner;
	onPoliciesChanged?: (changes: PolicyNotificationChange[]) => void;
}

export interface PolicyNotificationChange {
	field: string;
	label: string;
	oldValue?: string;
	newValue: string;
}

const normalizeIdentityUrl = (value: string | null | undefined): string =>
	(value ?? "").trim().toLowerCase();

const getUrlPath = (value: string | null | undefined): string => {
	const normalized = normalizeIdentityUrl(value);
	if (!normalized) return "";
	try {
		const parsed = new URL(normalized, "http://localhost");
		return parsed.pathname.toLowerCase();
	} catch {
		return normalized.split("?")[0].split("#")[0];
	}
};

const getFileNameIdentity = (value: string | null | undefined): string => {
	const normalized = normalizeIdentityUrl(value);
	if (!normalized) return "";
	return normalized.split("?")[0].split("#")[0].split("/").pop() ?? normalized;
};

interface FileIdentities {
	strong: string[];
	fallback: string[];
}

const getFileIdentities = (
	fileId: number | null | undefined,
	sourceFileId: number | null | undefined,
	fileUrl: string | null | undefined,
	fileName: string | null | undefined,
): FileIdentities => {
	const strong = new Set<string>();
	const fallback = new Set<string>();

	if (fileId) strong.add(`id:${fileId}`);
	if (sourceFileId) strong.add(`id:${sourceFileId}`);

	const fullUrl = normalizeIdentityUrl(fileUrl);
	if (fullUrl) strong.add(`url:${fullUrl}`);

	const urlPath = getUrlPath(fileUrl);
	if (urlPath) strong.add(`path:${urlPath}`);

	const normalizedFileName =
		getFileNameIdentity(fileName) || getFileNameIdentity(fileUrl);
	if (normalizedFileName) fallback.add(`name:${normalizedFileName}`);

	return {
		strong: [...strong],
		fallback: [...fallback],
	};
};

const hasIdentityOverlap = (left: FileIdentities, right: FileIdentities) => {
	if (left.strong.some((identity) => right.strong.includes(identity))) {
		return true;
	}
	if (left.strong.length > 0 && right.strong.length > 0) {
		return false;
	}
	return left.fallback.some((identity) => right.fallback.includes(identity));
};

const getPolicyFileIdentities = (policy: Policy): FileIdentities | null =>
	policy.type === "file" || policy.source_shared_file_id
		? getFileIdentities(
				policy.file_id,
				policy.source_shared_file_id,
				policy.file_url,
				policy.file_name,
			)
		: null;

const getWorkplanFileIdentities = (
	file: StrategicPartnerWorkplanPolicyFile,
): FileIdentities =>
	getFileIdentities(file.shared_file_id, null, file.file_path, file.name);

const getWorkplanFileTitle = (
	file: StrategicPartnerWorkplanPolicyFile,
): string =>
	file.document_name ||
	file.document_type_display ||
	file.name ||
	"Work Plan file";

const workplanFileToDraft = (
	file: StrategicPartnerWorkplanPolicyFile,
): PolicyDraft => {
	return {
		id: -(1_000_000 + file.id),
		title: getWorkplanFileTitle(file),
		type: "file",
		text_value: null,
		link_url: null,
		audience: file.audience,
		category_slugs: [...(file.category_slugs ?? [])],
		file: null,
		file_id: file.shared_file_id,
		file_url: file.file_path,
		shared_file_id: file.shared_file_id,
		source_shared_file_id: file.shared_file_id,
		existing_file_name: file.name || file.document_name || "Work Plan file",
		source: "workplan",
		workplan_doc_id: file.id,
		document_type: file.document_type || "others",
	};
};

const draftToPreviewPolicy = (draft: PolicyDraft): Policy => ({
	id: draft.id ?? 0,
	title: draft.title,
	type: draft.type,
	text_value: draft.type === "text" ? draft.text_value : null,
	link_url: draft.type === "link" ? draft.link_url : null,
	audience: draft.audience,
	category_slugs: draft.category_slugs,
	file_id: draft.type === "file" ? draft.file_id : null,
	source_shared_file_id: draft.source_shared_file_id,
	is_source_hidden: false,
	file_url: draft.type === "file" ? draft.file_url : null,
	file_name: draft.type === "file" ? draft.existing_file_name : null,
	created_at: "",
	updated_at: "",
});

const normalizeDisplayValue = (value: unknown): string => {
	if (value === null || value === undefined) return "";
	if (Array.isArray(value)) return value.join(", ");
	return String(value).trim();
};

const formatCategoryCoverageValue = (
	policyTitle: string,
	categorySlugs: PolicyCategorySlug[],
): string => {
	const title = policyTitle.trim() || "Policy";
	if (categorySlugs.length === 0) {
		return `${title} covers no policy categories`;
	}

	return `${title} covers ${categorySlugs
		.map((slug) => POLICY_CATEGORY_LABEL[slug] ?? slug)
		.join(", ")}`;
};

const policyValueForDraft = (draft: PolicyDraft): string => {
	if (draft.type === "text") return draft.text_value?.trim() || "Not provided";
	if (draft.type === "link") return draft.link_url?.trim() || "Not provided";
	return (
		draft.file?.name ||
		draft.existing_file_name ||
		draft.file_url ||
		"Uploaded file"
	);
};

const addChange = (
	changes: PolicyNotificationChange[],
	change: Omit<PolicyNotificationChange, "oldValue" | "newValue"> & {
		oldValue?: unknown;
		newValue: unknown;
	},
) => {
	const oldValue = normalizeDisplayValue(change.oldValue);
	const newValue = normalizeDisplayValue(change.newValue);
	if (oldValue && oldValue === newValue) return;
	changes.push({
		...change,
		oldValue: oldValue || "Not provided",
		newValue: newValue || "Not provided",
	});
};

const buildPolicyNotificationChanges = ({
	deletedPolicies,
	deletedWorkplans,
	validDrafts,
	policies,
	workplanDrafts,
}: {
	deletedPolicies: Policy[];
	deletedWorkplans: PolicyDraft[];
	validDrafts: PolicyDraft[];
	policies: Policy[];
	workplanDrafts: PolicyDraft[];
}): PolicyNotificationChange[] => {
	const changes: PolicyNotificationChange[] = [];
	const existingPoliciesById = new Map(
		policies.map((policy) => [policy.id, policy]),
	);
	const existingWorkplansById = new Map(
		workplanDrafts
			.filter((draft) => draft.workplan_doc_id != null)
			.map((draft) => [draft.workplan_doc_id as number, draft]),
	);

	for (const policy of deletedPolicies) {
		addChange(changes, {
			field: `policy_${policy.id}`,
			label: "Policy",
			oldValue: policy.title,
			newValue: `removed ${policy.title}`,
		});
	}

	for (const draft of deletedWorkplans) {
		addChange(changes, {
			field: `workplan_policy_${draft.workplan_doc_id}`,
			label: "Policy document",
			oldValue: draft.title,
			newValue: `removed ${draft.title}`,
		});
	}

	for (const draft of validDrafts) {
		if (draft.source === "policy") {
			const existing =
				draft.id != null && draft.id > 0
					? existingPoliciesById.get(draft.id)
					: null;

			if (!existing) {
				addChange(changes, {
					field: `policy_${draft.id ?? "new"}`,
					label: "Policy",
					newValue: `added ${draft.title.trim()} (${policyValueForDraft(draft)})`,
				});
				continue;
			}

			addChange(changes, {
				field: `policy_${existing.id}_title`,
				label: "Policy name",
				oldValue: existing.title,
				newValue: draft.title.trim(),
			});
			addChange(changes, {
				field: `policy_${existing.id}_type`,
				label: "Policy format",
				oldValue: existing.type,
				newValue: draft.type,
			});
			addChange(changes, {
				field: `policy_${existing.id}_audience`,
				label: "Policy visibility",
				oldValue: existing.audience,
				newValue: draft.audience,
			});
			addChange(changes, {
				field: `policy_${existing.id}_categories`,
				label: "Policy category coverage",
				oldValue: formatCategoryCoverageValue(
					existing.title,
					existing.category_slugs,
				),
				newValue: formatCategoryCoverageValue(
					draft.title.trim(),
					draft.category_slugs,
				),
			});
			if (existing.type === draft.type && draft.type === "text") {
				addChange(changes, {
					field: `policy_${existing.id}_text`,
					label: "Policy text",
					oldValue: existing.text_value,
					newValue: draft.text_value,
				});
			}
			if (existing.type === draft.type && draft.type === "link") {
				addChange(changes, {
					field: `policy_${existing.id}_link`,
					label: "Policy link",
					oldValue: existing.link_url,
					newValue: draft.link_url,
				});
			}
			if (draft.file) {
				addChange(changes, {
					field: `policy_${existing.id}_file`,
					label: "Policy file",
					oldValue: existing.file_name || existing.file_url,
					newValue: draft.file.name,
				});
			}
			continue;
		}

		const existing =
			draft.workplan_doc_id != null
				? existingWorkplansById.get(draft.workplan_doc_id)
				: null;

		if (!existing) {
			addChange(changes, {
				field: `workplan_policy_${draft.workplan_doc_id ?? draft.id ?? "new"}`,
				label: "Policy document",
				newValue: `added ${draft.title.trim()} (${policyValueForDraft(draft)})`,
			});
			continue;
		}

		addChange(changes, {
			field: `workplan_policy_${draft.workplan_doc_id}_title`,
			label: "Policy document name",
			oldValue: existing.title,
			newValue: draft.title.trim(),
		});
		addChange(changes, {
			field: `workplan_policy_${draft.workplan_doc_id}_categories`,
			label: "Policy category coverage",
			oldValue: formatCategoryCoverageValue(
				existing.title,
				existing.category_slugs,
			),
			newValue: formatCategoryCoverageValue(
				draft.title.trim(),
				draft.category_slugs,
			),
		});
		if (draft.file) {
			addChange(changes, {
				field: `workplan_policy_${draft.workplan_doc_id}_file`,
				label: "Policy document file",
				oldValue: existing.existing_file_name || existing.file_url,
				newValue: draft.file.name,
			});
		}
	}

	return changes;
};

// Stable empty array fallback to prevent creating a new array reference on every
// render when useQuery returns undefined data before the first fetch completes.
const EMPTY_WORKPLAN_FILES: StrategicPartnerWorkplanPolicyFile[] = [];

// Admin section with a read-only view as the default, and an edit mode
// reached via the Edit button. Save/Cancel both return to view mode.
export const PoliciesComplianceSection: React.FC<
	PoliciesComplianceSectionProps
> = ({ owner, onPoliciesChanged }) => {
	const { t } = useTranslation();

	const { data: policies, isLoading } = usePoliciesByOwner(owner);
	const useMock = useMockData();
	const spId = owner.kind === "strategic-partner" && !useMock ? owner.id : null;
	const {
		data: workplanFiles = EMPTY_WORKPLAN_FILES,
		isLoading: isLoadingWorkplanFiles,
	} = useStrategicPartnerWorkplanPolicyFiles(spId);
	const createPolicy = useCreatePolicy(owner);
	const updatePolicy = useUpdatePolicy(owner);
	const deletePolicy = useDeletePolicy(owner);
	const createWorkplanFile = useCreateWorkplanFile(spId ?? 0);
	const updateWorkplanFile = useUpdateWorkplanFile(spId ?? 0);
	const deleteWorkplanFile = useDeleteWorkplanFile(spId ?? 0);

	const [isEditing, setIsEditing] = useState(false);
	const [drafts, setDrafts] = useState<PolicyDraft[]>([]);
	const [serverError, setServerError] = useState<string | null>(null);
	const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

	const workplanDrafts = useMemo(() => {
		const existingPolicyFiles = (policies ?? [])
			.map(getPolicyFileIdentities)
			.filter((identities): identities is FileIdentities =>
				Boolean(identities),
			);

		return workplanFiles
			.filter((file) => {
				const identities = getWorkplanFileIdentities(file);
				return !existingPolicyFiles.some((existing) =>
					hasIdentityOverlap(identities, existing),
				);
			})
			.map(workplanFileToDraft);
	}, [policies, workplanFiles]);

	const policyDrafts = useMemo(
		() => (policies ?? []).map(policyToDraft),
		[policies],
	);

	const hydratedDrafts = useMemo(
		() => [...policyDrafts, ...workplanDrafts],
		[policyDrafts, workplanDrafts],
	);

	// Sync drafts when server data arrives or changes, but never while editing.
	// Depend on policyDrafts and workplanDrafts (both stable useMemos keyed on
	// the server data) rather than hydratedDrafts whose spread always produces
	// a new array reference — which would cause an infinite loop.
	useEffect(() => {
		if (!policies || isEditing) return;
		setDrafts([...policyDrafts, ...workplanDrafts]);
	}, [policyDrafts, workplanDrafts, isEditing, policies]);

	const updateDraft = (key: number, patch: Partial<PolicyDraft>) => {
		setDrafts((prev) =>
			prev.map((d) => (d.id === key ? { ...d, ...patch } : d)),
		);
	};

	const removeDraft = (key: number) => {
		setDrafts((prev) => prev.filter((d) => d.id !== key));
	};

	const addDraft = () => setDrafts((prev) => [...prev, emptyDraft()]);

	const categoriesRequired = (d: PolicyDraft): boolean =>
		d.source === "policy" && (d.id == null || d.id < 0);

	const isValid = (d: PolicyDraft): boolean => {
		if (!d.title.trim()) return false;
		// Require at least 1 category slug for newly added policies (id < 0 or null)
		const isNewPolicy = d.source === "policy" && (d.id == null || d.id < 0);
		if (isNewPolicy && d.category_slugs.length === 0) return false;

		if (d.type === "text") {
			const v = (d.text_value ?? "").trim();
			return v.length > 0 && v.length <= POLICY_TEXT_MAX_LENGTH;
		}
		if (d.type === "link") return Boolean(d.link_url?.trim());
		if (d.type === "file")
			return Boolean(d.file) || Boolean(d.existing_file_name);
		return false;
	};

	const partnerId = owner.kind === "strategic-partner" ? owner.id : null;
	const { updateSettings: updateLksgRiskApi } = useLksgRiskSettings(partnerId);

	const {
		saved: savedLksgRisk,
		commitFields: commitLksgRiskFields,
		resetFields: resetLksgRiskFields,
		workerVoiceMechanism,
		remediationSupport,
		seniorManagementReportingConfirmed,
		seniorManagementReportingDate,
	} = useLksgRiskStore();

	const isLksgRiskDirty =
		workerVoiceMechanism !== savedLksgRisk.workerVoiceMechanism ||
		remediationSupport !== savedLksgRisk.remediationSupport ||
		seniorManagementReportingConfirmed !==
			savedLksgRisk.seniorManagementReportingConfirmed ||
		seniorManagementReportingDate !==
			savedLksgRisk.seniorManagementReportingDate;

	const dirty = useMemo(() => {
		if (isLksgRiskDirty) return true;
		const existingPoliciesById = new Map(policies?.map((p) => [p.id, p]) ?? []);
		const existingWorkplansById = new Map(
			workplanDrafts
				.filter((d) => d.workplan_doc_id != null)
				.map((d) => [d.workplan_doc_id as number, d]),
		);
		if (
			(policies?.length ?? 0) !==
			drafts.filter((d) => d.source === "policy" && (d.id ?? 0) > 0).length
		)
			return true;
		if (
			workplanDrafts.length !==
			drafts.filter((d) => d.source === "workplan" && d.workplan_doc_id).length
		)
			return true;
		for (const d of drafts) {
			if (d.source === "policy" && (d.id == null || d.id < 0)) {
				return true;
			}
			if (d.source === "policy") {
				const existing = existingPoliciesById.get(d.id as number);
				if (!existing) return true;
				if (
					existing.title !== d.title ||
					existing.type !== d.type ||
					(existing.text_value ?? "") !== (d.text_value ?? "") ||
					(existing.link_url ?? "") !== (d.link_url ?? "") ||
					existing.audience !== d.audience ||
					existing.category_slugs.length !== d.category_slugs.length ||
					existing.category_slugs.some((s) => !d.category_slugs.includes(s))
				) {
					return true;
				}
			} else if (d.workplan_doc_id) {
				const existing = existingWorkplansById.get(d.workplan_doc_id);
				if (!existing) return true;
				if (
					existing.type !== d.type ||
					existing.title !== d.title ||
					existing.audience !== d.audience ||
					existing.category_slugs.length !== d.category_slugs.length ||
					existing.category_slugs.some((s) => !d.category_slugs.includes(s))
				) {
					return true;
				}
			}
			if (d.file) return true;
		}
		return false;
	}, [drafts, policies, workplanDrafts, isLksgRiskDirty]);

	const handleSave = async () => {
		setServerError(null);
		const validDrafts = drafts.filter(isValid);
		const existingIds = new Set(policies?.map((p) => p.id) ?? []);
		const keptIds = new Set(
			validDrafts
				.filter((d) => d.source === "policy" && (d.id ?? 0) > 0)
				.map((d) => d.id as number),
		);
		const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
		const deletedPolicies =
			policies?.filter((policy) => toDelete.includes(policy.id)) ?? [];
		const existingWorkplanIds = new Set(
			workplanDrafts
				.map((draft) => draft.workplan_doc_id)
				.filter((id): id is number => id != null),
		);
		const keptWorkplanIds = new Set(
			validDrafts
				.filter((d) => d.source === "workplan" && d.workplan_doc_id)
				.map((d) => d.workplan_doc_id as number),
		);
		const workplanIdsToDelete = [...existingWorkplanIds].filter(
			(id) => !keptWorkplanIds.has(id),
		);
		const deletedWorkplans = workplanDrafts.filter(
			(draft) =>
				draft.workplan_doc_id != null &&
				workplanIdsToDelete.includes(draft.workplan_doc_id),
		);
		const notificationChanges = buildPolicyNotificationChanges({
			deletedPolicies,
			deletedWorkplans,
			validDrafts,
			policies: policies ?? [],
			workplanDrafts,
		});
		const newSaved = new Set<number>();

		try {
			// --- Delete removed policies ---
			for (const id of toDelete) {
				await deletePolicy.mutateAsync(id);
			}
			for (const id of workplanIdsToDelete) {
				await deleteWorkplanFile.mutateAsync(id);
			}

			// --- Policies ---
			for (const d of validDrafts.filter(
				(draft) => draft.source === "policy",
			)) {
				const payload = {
					title: d.title.trim(),
					type: d.type,
					audience: d.audience,
					category_slugs: d.category_slugs,
					text_value: d.type === "text" ? (d.text_value ?? "") : null,
					link_url: d.type === "link" ? (d.link_url ?? "") : null,
					file: d.type === "file" ? (d.file ?? undefined) : undefined,
				};
				if (d.id != null && d.id > 0) {
					const saved = await updatePolicy.mutateAsync({
						policyId: d.id,
						payload,
					});
					newSaved.add(saved.id);
				} else {
					const saved = await createPolicy.mutateAsync(payload);
					newSaved.add(saved.id);
				}
			}

			for (const d of validDrafts.filter(
				(draft) => draft.source === "workplan",
			)) {
				const original = d.workplan_doc_id
					? workplanDrafts.find(
							(draft) => draft.workplan_doc_id === d.workplan_doc_id,
						)
					: null;
				if (d.type !== "file") {
					const saved = await createPolicy.mutateAsync({
						title: d.title.trim(),
						type: d.type,
						audience: d.audience,
						category_slugs: d.category_slugs,
						text_value: d.type === "text" ? (d.text_value ?? "") : null,
						link_url: d.type === "link" ? (d.link_url ?? "") : null,
						source_shared_file_id: d.source_shared_file_id,
					});
					newSaved.add(saved.id);
					continue;
				}
				const changed =
					!original ||
					original.title !== d.title ||
					original.audience !== d.audience ||
					original.category_slugs.length !== d.category_slugs.length ||
					original.category_slugs.some(
						(slug) => !d.category_slugs.includes(slug),
					) ||
					Boolean(d.file);
				if (!changed) continue;

				const payload = {
					document_type: d.document_type ?? "others",
					document_name: d.title.trim(),
					category_slugs: d.category_slugs,
					audience: d.audience,
					file: d.file ?? null,
				};
				if (d.workplan_doc_id) {
					await updateWorkplanFile.mutateAsync({
						fileId: d.workplan_doc_id,
						payload,
					});
				} else {
					await createWorkplanFile.mutateAsync({
						document_type: payload.document_type,
						document_name: payload.document_name,
						category_slugs: payload.category_slugs,
						audience: payload.audience,
						file: d.file ?? undefined,
					});
				}
			}

			setSavedIds(newSaved);
			if (partnerId) {
				await updateLksgRiskApi({
					worker_voice_mechanism: workerVoiceMechanism,
					remediation_support: remediationSupport,
					senior_management_reporting_confirmed:
						seniorManagementReportingConfirmed,
					senior_management_reporting_date:
						seniorManagementReportingConfirmed && seniorManagementReportingDate
							? seniorManagementReportingDate
							: null,
				});
			}
			commitLksgRiskFields([...POLICIES_LKSG_FIELDS]);
			setIsEditing(false);
			onPoliciesChanged?.(notificationChanges);
		} catch (err: unknown) {
			const typed = err as {
				response?: { data?: { message?: string } };
				message?: string;
			};
			const message =
				typed?.response?.data?.message ??
				typed?.message ??
				"Save failed. Please try again.";
			setServerError(String(message));
		}
	};

	const handleCancel = () => {
		setDrafts(hydratedDrafts);
		resetLksgRiskFields([...POLICIES_LKSG_FIELDS]);
		setServerError(null);
		setIsEditing(false);
	};

	const handleStartEdit = () => {
		setDrafts(hydratedDrafts);
		setServerError(null);
		setIsEditing(true);
	};

	const isSaving =
		createPolicy.isPending ||
		updatePolicy.isPending ||
		deletePolicy.isPending ||
		createWorkplanFile.isPending ||
		updateWorkplanFile.isPending ||
		deleteWorkplanFile.isPending;

	const someInvalid = drafts.some((d) => !isValid(d));

	const savedPolicies = useMemo(
		() => [...(policies ?? []), ...workplanDrafts.map(draftToPreviewPolicy)],
		[policies, workplanDrafts],
	);
	const categorySlugsForEdit = useMemo(
		() => drafts.map((d) => d.category_slugs),
		[drafts],
	);
	const categorySlugsForView = useMemo(
		() => savedPolicies.map((p) => p.category_slugs),
		[savedPolicies],
	);
	const loading = isLoading || isLoadingWorkplanFiles;

	return (
		<div className="bg-white rounded-md border border-gray-100 shadow-sm p-6 mb-5">
			<div className="flex flex-wrap items-center justify-between gap-3 mb-2">
				<h3 className="flex items-center gap-2 heading-display">
					<CheckCircledIcon className="text-[#148696] w-5 h-5" />
					{t("companyProfilePage.tabs.policiesCompliance")}
				</h3>
				<div className="flex gap-2">
					{isEditing ? (
						<>
							<button
								className="text-sm font-semibold text-gray-500 border border-gray-200 rounded-lg px-3 py-1 hover:bg-gray-100 transition-colors"
								disabled={isSaving}
								onClick={handleCancel}
								type="button"
							>
								{t("common.cancel")}
							</button>
							<CascadeButton
								buttonText={isSaving ? t("Saving...") : t("common.save")}
								className="!text-white"
								disabled={isSaving || !dirty || someInvalid}
								handleOnClick={handleSave}
								size="2"
							/>
						</>
					) : (
						<button
							className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#148696] border border-[#148696] rounded-lg px-3 py-1.5 hover:bg-[#e5f6f9] transition-colors"
							onClick={handleStartEdit}
							type="button"
						>
							<Pencil1Icon className="w-3.5 h-3.5" />
							{t("common.edit")}
						</button>
					)}
				</div>
			</div>
			{owner.kind === "strategic-partner" && (
				<LksgRiskFieldsConfig isEditing={isEditing} />
			)}
			<p className="text-sm text-gray-500 max-w-full mb-4 leading-relaxed">
				{isEditing
					? t("companyProfilePage.policies.coverageHelp")
					: t("companyProfilePage.policies.viewHelp")}
			</p>

			<CoverageTracker
				categorySlugsByPolicy={
					isEditing ? categorySlugsForEdit : categorySlugsForView
				}
			/>

			{serverError && (
				<div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
					{serverError}
				</div>
			)}

			{loading ? (
				<div className="text-sm text-gray-400">{t("Loading...")}</div>
			) : isEditing ? (
				drafts.length === 0 ? (
					<div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-500">
						<div className="w-12 h-12 rounded-xl bg-gray-100 grid place-items-center mx-auto mb-3">
							<FileTextIcon className="w-5 h-5 text-gray-400" />
						</div>
						<h4 className="font-semibold text-gray-700 text-base mb-1">
							{t("companyProfilePage.policies.noPolicies")}
						</h4>
						<p className="text-sm">
							{t("companyProfilePage.policies.addFirst")}
						</p>
					</div>
				) : (
					<div className="grid gap-3">
						{drafts.map((d, i) => (
							<PolicyEditor
								categoriesRequired={categoriesRequired(d)}
								draft={d}
								index={i + 1}
								key={d.id ?? `new-${i}`}
								onChange={(patch) => updateDraft(d.id as number, patch)}
								onRemove={() => removeDraft(d.id as number)}
							/>
						))}
					</div>
				)
			) : savedPolicies.length === 0 ? (
				<div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-500">
					<div className="w-12 h-12 rounded-xl bg-gray-100 grid place-items-center mx-auto mb-3">
						<FileTextIcon className="w-5 h-5 text-gray-400" />
					</div>
					<h4 className="font-semibold text-gray-700 text-base mb-1">
						{t("companyProfilePage.policies.noPoliciesShared")}
					</h4>
					<p className="text-sm">
						{t("companyProfilePage.policies.addFirstSwitchToEdit")}
					</p>
				</div>
			) : (
				<div className="grid gap-3.5">
					{savedPolicies.map((p) => (
						<PolicyView key={p.id} policy={p} />
					))}
				</div>
			)}

			{isEditing && (
				<button
					className="w-full border-2 border-dashed border-[#A6DFDD] bg-[#e4f4f3] text-[#004A60] rounded-xl px-4 py-4 text-sm font-bold flex items-center justify-center gap-2 mt-4 hover:bg-[#d3eeed] hover:border-[#148696] transition-colors"
					onClick={addDraft}
					type="button"
				>
					<PlusIcon className="w-4 h-4" />
					{t("companyProfilePage.policies.addPolicy")}
				</button>
			)}

			{savedIds.size > 0 && !dirty && !isEditing && (
				<p className="text-xs text-emerald-600 mt-3">
					{t("companyProfilePage.policies.savedPlural", {
						count: savedIds.size,
					})}
				</p>
			)}
		</div>
	);
};

export default PoliciesComplianceSection;
