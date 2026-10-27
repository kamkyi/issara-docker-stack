import { DownloadIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { Badge, Text } from "@radix-ui/themes";
import { useMemo } from "react";
import CollapsibleDataTable, {
	type CollapsibleColumn,
	type CollapsibleRowData,
} from "$src/components/tables/CollapsibleDataTable";
import {
	type MarketplaceActivity,
	type MarketplaceActivityAction,
	useMarketplaceDataList,
} from "$src/queries/marketplaceDataList";
import {
	NACE_LEVEL,
	naceTitleCase,
	useNaceCodes,
} from "$src/queries/naceCodes";

/**
 * Table of incoming marketplace user activity (registrations, submissions,
 * etc.) reviewed by the internal Issara team. Backed by cascade-api
 * `/marketplace-data-list`.
 */

const TYPE_LABELS: Record<string, string> = {
	registration: "Registration",
	submission: "Submission",
	notification: "Notification",
};

const ACTION_LABELS: Record<string, string> = {
	quote_request: "Quote Request",
	wage_quote_request: "Quote Request — Wages",
	schedule: "Schedule a Call",
	self_certification: "Self-Certification",
	agency_disclosure: "Agency Disclosure",
	policy_document: "Policy Documents",
	contract_document: "Contract Documents",
	training_registration: "Training Registration",
	notify_suppliers: "Notify Suppliers",
};

/**
 * Detail keys listed in the same order as the fields of the
 * /cascade-marketplace modal that submits them, so an expanded row reads the
 * way the form was filled in. Listed keys always render (missing ones as "—");
 * anything the API sends that isn't listed is appended in API order.
 */
const FIELD_ORDER: Partial<Record<MarketplaceActivityAction, string[]>> = {
	// RequestQuoteModal
	quote_request: [
		"full_name",
		"email",
		"company",
		"worker_nationalities",
		"languages_spoken",
		"total_workers",
		"notes",
	],
	// RequestWageQuoteModal
	wage_quote_request: [
		"full_name",
		"email",
		"company",
		"preferred_date",
		"notes",
		"nace_section_code",
		"nace_division_code",
		"nace_group_code",
		"nace_class_code",
		"operating_locations_count",
		"suppliers_count",
		"wage_input_mode",
		"locations",
		"wage_file_name",
		"wage_file_url",
		"certifications",
		"total_workers",
		"languages_spoken",
	],
	// ScheduleModal
	schedule: [
		"full_name",
		"email",
		"company",
		"preferred_date",
		"preferred_time",
	],
	// SelfCertifyModal
	self_certification: [
		"completion_date",
		"score_type",
		"score_value",
		"key_learnings",
		"signatory_name",
		"signatory_title",
		"certified",
	],
	// AgencyDisclosureModal
	agency_disclosure: ["agencies"],
	// UploadPolicyDocumentsModal
	policy_document: ["policies"],
	// UploadContractDocumentsModal
	contract_document: ["documents"],
	// IssaraAcademyModalContent (PlanView)
	training_registration: [
		"language_training",
		"first_name",
		"last_name",
		"email",
		"country",
		"organization",
		"position",
		"attended_before",
	],
};

/**
 * Labels that `humanizeKey` would get wrong (acronyms) or state less clearly
 * than the form the value was typed into.
 */
const DETAIL_LABELS: Record<string, string> = {
	nace_section_code: "NACE Section",
	nace_division_code: "NACE Division",
	nace_group_code: "NACE Group",
	nace_class_code: "NACE Class",
	operating_locations_count: "Operating Countries / Locations",
	suppliers_count: "Number of Suppliers",
	wage_input_mode: "Wage Data Provided As",
	wage_file_name: "Wage File",
	wage_file_url: "Wage File Link",
};

/** Free-text answers given the whole grid row, so a paragraph reads as one. */
const FULL_WIDTH_DETAIL_KEYS = new Set(["notes"]);

/** Stored as bare codes ("A", "01.21"); shown with the label they stand for. */
const NACE_DETAIL_KEYS = new Set([
	"nace_section_code",
	"nace_division_code",
	"nace_group_code",
	"nace_class_code",
]);

const normalizeKey = (key: string) => key.replace(/_/g, "").toLowerCase();

/**
 * The key an ordered field actually arrives under: the API isn't consistent
 * about underscores (a quote request's full name comes back as `fullname`,
 * not the `full_name` it was submitted as), so fall back to an
 * underscore/case-insensitive match before treating the field as missing.
 */
function findDetailKey(
	details: Record<string, unknown>,
	key: string,
): string | null {
	if (key in details) return key;
	const normalized = normalizeKey(key);
	return (
		Object.keys(details).find((k) => normalizeKey(k) === normalized) ?? null
	);
}

function orderedDetailEntries(
	activity: MarketplaceActivity,
): [string, unknown][] {
	const details = activity.details ?? {};
	const order = FIELD_ORDER[activity.action] ?? [];
	const matched = new Set<string>();

	const ordered = order.map((key) => {
		const detailKey = findDetailKey(details, key);
		if (detailKey) matched.add(detailKey);
		return [key, detailKey ? details[detailKey] : undefined] as [
			string,
			unknown,
		];
	});

	return [
		...ordered,
		...Object.entries(details).filter(([key]) => !matched.has(key)),
	];
}

function formatDetailValue(value: unknown): React.ReactNode {
	if (value === null || value === undefined || value === "") return "—";
	if (typeof value === "boolean") return value ? "Yes" : "No";

	// Array-valued fields (nationalities, languages, …) arrive either as arrays
	// or as JSON strings, the same as the documents/policies/agencies fields.
	const raw =
		typeof value === "string" && value.trim().startsWith("[")
			? (safeJsonParse(value) ?? value)
			: value;

	if (Array.isArray(raw)) {
		if (raw.length === 0) return "—";
		return raw
			.map((entry) =>
				typeof entry === "object" && entry !== null
					? JSON.stringify(entry)
					: String(entry),
			)
			.join(", ");
	}
	if (typeof raw === "object") return JSON.stringify(raw);

	const text = String(raw);
	if (/^https?:\/\//.test(text)) {
		return (
			<a
				className="inline-flex w-fit max-w-full items-center gap-1.5 font-semibold"
				href={text}
				rel="noopener noreferrer"
				style={{ color: "#148696" }}
				target="_blank"
				title={text}
			>
				<span className="overflow-hidden text-ellipsis whitespace-nowrap">
					{text}
				</span>
				<ExternalLinkIcon className="shrink-0" />
			</a>
		);
	}
	return text;
}

function formatDate(value: string): string {
	try {
		return new Date(value).toLocaleString();
	} catch {
		return value;
	}
}

function humanizeKey(key: string): string {
	return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

interface DocumentItem {
	file_name?: string;
	file_url?: string;
	link_url?: string;
	document_name?: string;
}

function parseJsonArray<T>(value: unknown): T[] {
	const raw = typeof value === "string" ? safeJsonParse(value) : value;
	return Array.isArray(raw) ? (raw as T[]) : [];
}

function safeJsonParse(value: string): unknown {
	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}

function DetailField({
	fullWidth = false,
	label,
	value,
}: {
	fullWidth?: boolean;
	label: string;
	value: React.ReactNode;
}) {
	return (
		<div className={`min-w-0${fullWidth ? " col-span-full" : ""}`}>
			<Text
				as="div"
				size="1"
				style={{
					color: "var(--color-caption)",
					textTransform: "uppercase",
					letterSpacing: "0.06em",
					fontFamily: '"DM Mono", monospace',
					marginBottom: 2,
				}}
			>
				{label}
			</Text>
			<Text
				as="div"
				className="break-words whitespace-pre-wrap"
				size="2"
				style={{ color: "var(--text-primary)" }}
			>
				{value ?? "—"}
			</Text>
		</div>
	);
}

function DocumentsField({ documents }: { documents: DocumentItem[] }) {
	return (
		<div className="col-span-full min-w-0">
			<Text
				as="div"
				size="1"
				style={{
					color: "var(--color-caption)",
					textTransform: "uppercase",
					letterSpacing: "0.06em",
					fontFamily: '"DM Mono", monospace',
					marginBottom: 2,
				}}
			>
				Documents
			</Text>
			{documents.length === 0 ? (
				<Text as="div" size="2" style={{ color: "var(--text-primary)" }}>
					—
				</Text>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full border-collapse text-left text-sm">
						<thead>
							<tr>
								<th className="border-b border-[#ddd] py-2 pr-4">
									Document Name
								</th>
								<th className="border-b border-[#ddd] py-2 pr-4">File</th>
							</tr>
						</thead>
						<tbody>
							{documents.map((doc, index) => {
								const fileUrl = doc.file_url ?? doc.link_url;
								const fileName =
									doc.file_name ?? fileUrl ?? `Document ${index + 1}`;
								return (
									<tr key={fileUrl ?? fileName ?? index}>
										<td className="border-b border-[#eee] py-2 pr-4">
											{doc.document_name ?? "—"}
										</td>
										<td className="border-b border-[#eee] py-2 pr-4">
											<a
												className="inline-flex w-fit max-w-full items-center gap-1.5 font-semibold"
												download
												href={fileUrl}
												rel="noopener noreferrer"
												style={{ color: "#148696" }}
												target="_blank"
												title={fileName}
											>
												<span className="overflow-hidden text-ellipsis whitespace-nowrap">
													{fileName}
												</span>
												<DownloadIcon className="shrink-0" />
											</a>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

/** Mirrors cascade-api's `PolicyDocumentEntry` (policy_document submissions). */
interface PolicyItem {
	policy_name?: string;
	input_mode?: "FILE" | "LINK";
	link_url?: string | null;
	file_url?: string | null;
	file_name?: string | null;
	categories?: string[];
}

function PoliciesField({ policies }: { policies: PolicyItem[] }) {
	return (
		<div className="col-span-full min-w-0">
			<Text
				as="div"
				size="1"
				style={{
					color: "var(--color-caption)",
					textTransform: "uppercase",
					letterSpacing: "0.06em",
					fontFamily: '"DM Mono", monospace',
					marginBottom: 2,
				}}
			>
				Policies
			</Text>
			{policies.length === 0 ? (
				<Text as="div" size="2" style={{ color: "var(--text-primary)" }}>
					—
				</Text>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full border-collapse text-left text-sm">
						<thead>
							<tr>
								<th className="border-b border-[#ddd] py-2 pr-4">
									Policy Name
								</th>
								<th className="border-b border-[#ddd] py-2 pr-4">Document</th>
								<th className="border-b border-[#ddd] py-2 pr-4">Categories</th>
							</tr>
						</thead>
						<tbody>
							{policies.map((policy, index) => {
								const isLink = policy.input_mode === "LINK";
								const url = isLink ? policy.link_url : policy.file_url;
								const label = isLink
									? (policy.link_url ?? "")
									: (policy.file_name ?? policy.file_url ?? "");
								return (
									<tr key={policy.policy_name ?? url ?? index}>
										<td className="border-b border-[#eee] py-2 pr-4">
											{policy.policy_name ?? "—"}
										</td>
										<td className="border-b border-[#eee] py-2 pr-4">
											{url ? (
												<a
													className="inline-flex w-fit max-w-full items-center gap-1.5 font-semibold"
													href={url}
													rel="noopener noreferrer"
													style={{ color: "#148696" }}
													target="_blank"
													title={label}
													{...(isLink ? {} : { download: true })}
												>
													<span className="overflow-hidden text-ellipsis whitespace-nowrap">
														{label || url}
													</span>
													{isLink ? (
														<ExternalLinkIcon className="shrink-0" />
													) : (
														<DownloadIcon className="shrink-0" />
													)}
												</a>
											) : (
												"—"
											)}
										</td>
										<td className="border-b border-[#eee] py-2 pr-4">
											{policy.categories?.length ? (
												<span className="flex flex-wrap gap-1">
													{policy.categories.map((category) => (
														<Badge key={category} variant="soft">
															{category}
														</Badge>
													))}
												</span>
											) : (
												"—"
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

/** One row of a wage quote request's Operating Countries & Wages block. */
interface LocationItem {
	country?: string;
	currency?: string;
	living_wage?: string | null;
	minimum_wage?: string | null;
}

function LocationsField({ locations }: { locations: LocationItem[] }) {
	return (
		<div className="col-span-full min-w-0">
			<Text
				as="div"
				size="1"
				style={{
					color: "var(--color-caption)",
					textTransform: "uppercase",
					letterSpacing: "0.06em",
					fontFamily: '"DM Mono", monospace',
					marginBottom: 2,
				}}
			>
				Operating Countries &amp; Wages
			</Text>
			{locations.length === 0 ? (
				<Text as="div" size="2" style={{ color: "var(--text-primary)" }}>
					—
				</Text>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full border-collapse text-left text-sm">
						<thead>
							<tr>
								<th className="border-b border-[#ddd] py-2 pr-4">
									Country / Location
								</th>
								<th className="border-b border-[#ddd] py-2 pr-4">Currency</th>
								<th className="border-b border-[#ddd] py-2 pr-4">
									Living Wage
								</th>
								<th className="border-b border-[#ddd] py-2 pr-4">
									Minimum Wage
								</th>
							</tr>
						</thead>
						<tbody>
							{locations.map((location, index) => (
								<tr key={location.country ?? index}>
									<td className="border-b border-[#eee] py-2 pr-4">
										{location.country || "—"}
									</td>
									<td className="border-b border-[#eee] py-2 pr-4">
										{location.currency || "—"}
									</td>
									<td className="border-b border-[#eee] py-2 pr-4">
										{location.living_wage || "—"}
									</td>
									<td className="border-b border-[#eee] py-2 pr-4">
										{location.minimum_wage || "—"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

interface AgencyItem {
	agency_name?: string;
	destination_countries?: string;
	origin_country?: string;
}

function AgenciesList({ agencies }: { agencies: AgencyItem[] }) {
	if (agencies.length === 0) {
		return (
			<Text as="div" size="2" style={{ color: "var(--text-primary)" }}>
				—
			</Text>
		);
	}

	return (
		<div className="col-span-full overflow-x-auto">
			<table className="w-full border-collapse text-left text-sm">
				<thead>
					<tr>
						<th className="border-b border-[#ddd] py-2 pr-4">Agency Name</th>
						<th className="border-b border-[#ddd] py-2 pr-4">Origin Country</th>
						<th className="border-b border-[#ddd] py-2 pr-4">
							Destination Country
						</th>
					</tr>
				</thead>
				<tbody>
					{agencies.map((a, index) => (
						<tr key={a.agency_name ?? index}>
							<td className="border-b border-[#eee] py-2 pr-4">
								{a.agency_name ?? "—"}
							</td>
							<td className="border-b border-[#eee] py-2 pr-4">
								{a.origin_country ?? "—"}
							</td>
							<td className="border-b border-[#eee] py-2 pr-4">
								{a.destination_countries ?? "—"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

/**
 * A stored NACE code resolved against the reference table, so a reviewer reads
 * "01.21 — Growing of grapes" rather than a bare number. The classification is
 * fetched once per session and cached, so this costs nothing per row.
 */
function NaceCodeField({ code, label }: { code: string; label: string }) {
	const { data } = useNaceCodes();
	const match = useMemo(
		() => (data ?? []).find((entry) => entry.code === code),
		[data, code],
	);

	if (!match) {
		return <DetailField label={label} value={code || "—"} />;
	}

	const text =
		match.level === NACE_LEVEL.SECTION
			? naceTitleCase(match.label)
			: match.label;

	return <DetailField label={label} value={`${code} — ${text}`} />;
}

/**
 * The four levels are one answer read from coarse to fine, so they are kept
 * together on a row of their own instead of flowing through the details grid
 * and wrapping wherever they happen to land.
 */
function NaceCodesRow({ entries }: { entries: [string, unknown][] }) {
	return (
		<div className="col-span-full grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
			{entries.map(([key, value]) => (
				<NaceCodeField
					code={typeof value === "string" ? value : ""}
					key={key}
					label={DETAIL_LABELS[key.toLowerCase()] ?? humanizeKey(key)}
				/>
			))}
		</div>
	);
}

function renderActivityDetails(row: CollapsibleRowData) {
	const activity = row.activity as MarketplaceActivity;
	const hasDetails = Object.keys(activity.details ?? {}).length > 0;
	const detailEntries = hasDetails ? orderedDetailEntries(activity) : [];
	const naceEntries = detailEntries.filter(([key]) =>
		NACE_DETAIL_KEYS.has(key.toLowerCase()),
	);

	return (
		<div>
			<div className="mb-3 flex flex-wrap items-center gap-2">
				<Badge variant="soft">
					{TYPE_LABELS[activity.type] ?? activity.type}
				</Badge>
				{activity.action && (
					<Badge color="teal" variant="soft">
						{ACTION_LABELS[activity.action] ?? humanizeKey(activity.action)}
					</Badge>
				)}
			</div>
			<div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 md:grid-cols-4">
				{detailEntries.length === 0 && (
					<Text size="2" style={{ color: "var(--color-body)" }}>
						No additional details submitted.
					</Text>
				)}
				{detailEntries.map(([key, value]) => {
					const normalizedKey = key.toLowerCase();
					if (normalizedKey === "documents") {
						return (
							<DocumentsField
								documents={parseJsonArray<DocumentItem>(value)}
								key={key}
							/>
						);
					}
					if (normalizedKey === "agencies") {
						return (
							<AgenciesList
								agencies={parseJsonArray<AgencyItem>(value)}
								key={key}
							/>
						);
					}
					if (normalizedKey === "policies") {
						return (
							<PoliciesField
								key={key}
								policies={parseJsonArray<PolicyItem>(value)}
							/>
						);
					}
					if (normalizedKey === "locations") {
						return (
							<LocationsField
								key={key}
								locations={parseJsonArray<LocationItem>(value)}
							/>
						);
					}
					if (NACE_DETAIL_KEYS.has(normalizedKey)) {
						// Rendered once, as a group, at the first level's position.
						return key === naceEntries[0]?.[0] ? (
							<NaceCodesRow entries={naceEntries} key={key} />
						) : null;
					}

					const fieldLabel = DETAIL_LABELS[normalizedKey] ?? humanizeKey(key);

					return (
						<DetailField
							fullWidth={FULL_WIDTH_DETAIL_KEYS.has(normalizedKey)}
							key={key}
							label={fieldLabel}
							value={formatDetailValue(value)}
						/>
					);
				})}
			</div>
		</div>
	);
}

export default function MarketplaceManagementPanel() {
	const { data, isLoading, isError } = useMarketplaceDataList();
	const activities = data ?? [];

	const columns = useMemo<CollapsibleColumn[]>(
		() => [
			{ id: "user_name", label: "User Name", minWidth: 160, sortable: true },
			{ id: "email", label: "Email", minWidth: 200, sortable: true },
			{
				id: "supplier_name",
				label: "Supplier Name",
				minWidth: 160,
				sortable: true,
			},
			{
				id: "solution_name",
				label: "Solution Name",
				minWidth: 160,
				sortable: true,
			},
			{
				id: "created_at",
				label: "Date",
				minWidth: 160,
				sortable: true,
				format: (value) => formatDate(String(value)),
			},
		],
		[],
	);

	const rows = useMemo<CollapsibleRowData[]>(
		() =>
			activities.map((activity) => ({
				id: activity.id,
				user_name: activity.user_name,
				email: activity.email,
				supplier_name: activity.supplier_name,
				solution_name: activity.solution_name,
				created_at: activity.created_at,
				activity,
			})),
		[activities],
	);

	if (isError) {
		return (
			<Text color="red" size="2">
				Failed to load marketplace activity.
			</Text>
		);
	}

	return (
		<div className="mt-4">
			<CollapsibleDataTable
				columns={columns}
				isLoading={isLoading}
				renderExpandedContent={renderActivityDetails}
				rows={rows}
				title="Marketplace Activity"
			/>
		</div>
	);
}
