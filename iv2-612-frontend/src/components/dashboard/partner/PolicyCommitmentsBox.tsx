import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
	usePoliciesByOwner,
	useStrategicPartnerWorkplanPolicyFiles,
} from "$src/hooks/usePolicies";
import { useViewModeStore } from "$src/store/viewModeStore";
import {
	POLICY_CATEGORIES,
	type Policy,
	type PolicyOwner,
} from "$src/types/policies";
import { useMockData } from "$src/utils/config";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";

/**
 * HRDD Component 1 — read-only summary of which policy categories the company
 * has a shared policy for. For Strategic Partner users the data comes from TWO
 * sources, mirroring PoliciesComplianceSection in Company Profile:
 *   1. `/cascade/strategic-partners/{id}/policies/` — saved Policy rows
 *   2. `/cascade/strategic-partners/{id}/workplan-files/` — legacy Work Plan
 *      files (these are often the only source when Policy rows are absent)
 * Both sets are merged and de-duped by `shared_file_id` before building
 * `coveredRows`. Editing lives in the Company Profile; this box is read-only.
 */

// Resolve a link for a policy, or null for plain text.
const policyLink = (policy: Policy): string | null =>
	policy.link_url?.trim() || policy.file_url?.trim() || null;

const PILL_BASE =
	"inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[12px] font-medium transition-all duration-150";

const PolicyCommitmentsBox = () => {
	const { t } = useTranslation();
	const ids = getUserIdentifiers();
	const viewMode = useViewModeStore((state) => state.viewMode);
	const useMock = useMockData();

	// Mirror the Company Profile owner resolution so the two screens agree.
	const isSupplierContext = ids.isSupplier || viewMode === "supplier-view";
	const owner: PolicyOwner = isSupplierContext
		? { kind: "supplier", id: ids.supplierId }
		: { kind: "strategic-partner", id: ids.partnerId };

	const { data: policies, isLoading: isPoliciesLoading } =
		usePoliciesByOwner(owner);

	// For SP users, also fetch workplan files — these carry category_slugs and
	// may be the only populated data source when /policies/ returns empty.
	// In mock mode, skip entirely so cached live data cannot bleed in.
	const spId = !isSupplierContext && !useMock ? ids.partnerId : null;
	const { data: workplanFiles, isLoading: isWorkplanLoading } =
		useStrategicPartnerWorkplanPolicyFiles(spId);

	const isLoading = isPoliciesLoading || isWorkplanLoading;

	// Build a unified list of Policy-shaped objects from both sources.
	// De-dupe workplan entries against saved policy rows by shared_file_id so a
	// file that was already saved as a Policy row is not counted twice.
	const mergedPolicies = useMemo<Policy[]>(() => {
		const saved = policies ?? [];

		// Build a set of shared_file_ids already represented in saved policies.
		const savedSharedFileIds = new Set<number>(
			saved
				.map((p) => p.source_shared_file_id ?? p.file_id)
				.filter((id): id is number => id != null),
		);

		// Convert workplan files to Policy-shaped objects for the same logic.
		const workplanAsPolicies: Policy[] = (workplanFiles ?? [])
			.filter((f) => !savedSharedFileIds.has(f.shared_file_id))
			.map((f) => ({
				id: -(1_000_000 + f.id), // negative id keeps the namespace separate
				title: f.document_name || f.document_type_display || f.name,
				type: "file" as const,
				text_value: null,
				link_url: null,
				audience: "members" as const,
				category_slugs: f.category_slugs,
				file_id: f.shared_file_id,
				source_shared_file_id: f.shared_file_id,
				is_source_hidden: false,
				file_url: f.file_path,
				file_name: f.name,
				created_at: "",
				updated_at: "",
			}));

		return [...saved, ...workplanAsPolicies];
	}, [policies, workplanFiles]);

	// Only categories that have at least one shared policy, in canonical order.
	const coveredRows = useMemo(() => {
		return POLICY_CATEGORIES.map((cat) => ({
			category: cat,
			policies: mergedPolicies.filter((p) =>
				p.category_slugs.includes(cat.slug),
			),
		})).filter((row) => row.policies.length > 0);
	}, [mergedPolicies]);

	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
			<div className="bg-[#E5E7EB] px-6 py-4">
				<h3 className="heading-display">
					{t("companyDashboard.policyCommitments.title", {
						defaultValue: "Policy Commitments",
					})}
				</h3>
			</div>
			<div className="p-6">
				{isLoading ? (
					<p className="text-[13px] text-gray-400">
						{t("companyDashboard.policyCommitments.loading", {
							defaultValue: "Loading policies…",
						})}
					</p>
				) : coveredRows.length === 0 ? (
					<p className="text-[13px] text-gray-500">
						{t("companyDashboard.policyCommitments.empty", {
							defaultValue:
								"No company policies have been shared yet. Add them from your Company Profile → Policies & Compliance.",
						})}
					</p>
				) : (
					<table className="w-full text-left">
						<thead>
							<tr className="border-b border-gray-200">
								<th className="pb-2 pr-6 text-[17px] font-bold text-[#148696] w-1/2">
									{t("companyDashboard.policyCommitments.colPolicyCategory", {
										defaultValue: "Policy Category",
									})}
								</th>
								<th className="pb-2 text-[17px] font-bold text-[#148696]">
									{t("companyDashboard.policyCommitments.colPolicyShared", {
										defaultValue: "Company Policy Shared",
									})}
								</th>
							</tr>
						</thead>
						<tbody>
							{coveredRows.map((row) => (
								<tr
									className="border-b border-gray-100 last:border-b-0"
									key={row.category.slug}
								>
									{/* Category label */}
									<td className="py-3 pr-6 align-middle w-1/2">
										<span className="text-[13px] font-medium text-gray-800">
											{row.category.label}
										</span>
									</td>

									{/* Pills column — one pill per policy covering this category */}
									<td className="py-3 align-middle">
										<div className="flex flex-wrap gap-2">
											{row.policies.map((policy, idx) => {
												const url = policyLink(policy);
												const label =
													policy.title ||
													t("companyDashboard.policyCommitments.shared", {
														defaultValue: "Shared",
													});
												const showIndex = row.policies.length > 1;

												return url ? (
													<a
														className={`${PILL_BASE} border-[#148696] text-[#148696] bg-[rgba(20,134,150,0.06)] hover:bg-[rgba(20,134,150,0.14)] hover:shadow-sm`}
														href={url}
														key={policy.id}
														rel="noopener noreferrer"
														target="_blank"
													>
														{showIndex && (
															<span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#148696] text-white text-[9px] font-bold shrink-0">
																{idx + 1}
															</span>
														)}
														{label}
													</a>
												) : (
													<span
														className={`${PILL_BASE} border-[#5BC236] text-[#5BC236] bg-[rgba(91,194,54,0.06)]`}
														key={policy.id}
													>
														{showIndex && (
															<span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#5BC236] text-white text-[9px] font-bold shrink-0">
																{idx + 1}
															</span>
														)}
														{label}
													</span>
												);
											})}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
};

export default PolicyCommitmentsBox;
