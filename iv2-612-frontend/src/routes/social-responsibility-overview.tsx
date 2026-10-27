import type { GridColDef } from "@mui/x-data-grid";
import { BarChartIcon, ChatBubbleIcon } from "@radix-ui/react-icons";
import { Box } from "@radix-ui/themes";
import { createFileRoute } from "@tanstack/react-router";
import ReactECharts from "echarts-for-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
/* The import for the CSS module is above */
import { useViewMode } from "$src/components/button/testerFloatingButton";
import IssueTreemapSection from "$src/components/dashboard/IssueTreemapSection";
import TopRisks from "$src/components/dashboard/TopRisks";
import {
	SupplierKPITimelineChart,
	WorkerVoiceOverview,
} from "$src/components/indicators";
import DataTable from "$src/components/tables/DataTable";
import LoadingSpinner from "$src/components/ui/LoadingSpinner";
import { MultiSelect } from "$src/components/ui/MultiSelect";
import { useCascadeCountries } from "$src/hooks/useCommonData";
import { useIndustries } from "$src/hooks/useIndustries";
import { useDetailedKpiUpdates } from "$src/hooks/useSocialResponsibility";
import { useSupplyChains } from "$src/hooks/useSupplyChain";
import useTranslation from "$src/hooks/useTranslation";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { useCascadeIndex } from "$src/queries/useCascadeIndex";
import { useSocialScores } from "$src/queries/useSocialScores";
import { useSupplierFilterCatalog } from "$src/queries/useSupplierFilterCatalog";
import { useWorkplaceStats } from "$src/queries/useWorkplaceStats";
import useMemberdirectory from "$src/store/store.memberdirectory";
import { requireRecruiterSupplierAuth } from "$src/utils/auth";
import { useMockData } from "$src/utils/config";
import { DEFAULT_FROM_DATE, getDefaultToDate } from "$src/utils/dateDefaults";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";
import landingPageImage from "../assets/img/our_workspace_landing_page.jpg";
import { statusColorPalette } from "../assets/mock/common-data";
import companyDashboardMock from "../assets/mock/company-dashboard.json";
import chartData from "../assets/mock/our-workplace.json";
import HumanRightsOverview, {
	InfoTooltip,
} from "../components/indicators/HumanRightsOverview";
import WorkerIssuesPanel, {
	type WorkerIssueItem,
} from "../components/social-responsibility/WorkerIssuesPanel";
import styles from "./our-workplace.module.css";

const buildEngagementColumns = (t: (key: string) => string): GridColDef[] => [
	{
		field: "supplierName",
		headerName: t("socialResponsibility.engagementTable.columns.supplierName"),
		flex: 1.5,
		minWidth: 180,
	},
	{
		field: "activityType",
		headerName: t("socialResponsibility.engagementTable.columns.activityType"),
		flex: 1.2,
		minWidth: 160,
	},
	{
		field: "date",
		headerName: t("socialResponsibility.engagementTable.columns.date"),
		flex: 0.8,
		minWidth: 110,
	},
	{
		field: "location",
		headerName: t("socialResponsibility.engagementTable.columns.location"),
		flex: 1,
		minWidth: 140,
	},
];

const SUPPLY_CHAIN_ENGAGEMENT_ROWS = [
	{
		id: 1,
		supplierName: "Sunrise Garment Co.",
		supplierId: "supplier-003",
		activityType: "Worker Survey",
		date: "2025-03-15",
		location: "Phnom Penh, Cambodia",
		countryCode: "KH",
		industry: "Manufacturing",
	},
	{
		id: 2,
		supplierName: "Delta Seafood Ltd.",
		supplierId: "supplier-001",
		activityType: "Factory Audit",
		date: "2025-02-28",
		location: "Samut Prakan, Thailand",
		countryCode: "TH",
		industry: "Seafood",
	},
	{
		id: 3,
		supplierName: "Green Fields Agriculture",
		supplierId: "supplier-002",
		activityType: "Grievance Follow-up",
		date: "2025-03-04",
		location: "Chiang Rai, Thailand",
		countryCode: "TH",
		industry: "Food and Beverage",
	},
	{
		id: 4,
		supplierName: "Pacific Fisheries Inc.",
		supplierId: "supplier-001",
		activityType: "Remediation Visit",
		date: "2025-01-22",
		location: "Songkhla, Thailand",
		countryCode: "TH",
		industry: "Seafood",
	},
	{
		id: 5,
		supplierName: "Metro Textiles Group",
		supplierId: "supplier-003",
		activityType: "Training Session",
		date: "2025-03-10",
		location: "Dhaka, Bangladesh",
		countryCode: "BD",
		industry: "Manufacturing",
	},
	{
		id: 6,
		supplierName: "Coastal Shrimp Processing",
		supplierId: "supplier-001",
		activityType: "Worker Survey",
		date: "2025-03-01",
		location: "Surat Thani, Thailand",
		countryCode: "TH",
		industry: "Seafood",
	},
];

interface SupplierCatalogItem {
	value: string;
	label: string;
	countryNames: string[];
	industries: string[];
}

/**
 * Whether the catalog carries any value at all for a dimension — country names
 * or industries.
 *
 * A safety net for incomplete data. When no supplier in scope records a value
 * for a dimension, every one of them fails a selection on it, and cross-filtering
 * would empty the other dropdowns instead of narrowing them. Skipping the
 * dimension keeps the other filters usable; the API still filters on
 * `country` / `industry` server-side.
 */
const catalogCarries = (
	catalog: SupplierCatalogItem[],
	pick: (item: SupplierCatalogItem) => string[],
) => catalog.some((item) => pick(item).length > 0);

const MOCK_SUPPLIER_CATALOG: SupplierCatalogItem[] = [
	{
		value: "supplier-001",
		label: "Supplier A",
		countryNames: ["Thailand", "Myanmar", "Vietnam", "Cambodia"],
		industries: ["Seafood", "Manufacturing"],
	},
	{
		value: "supplier-002",
		label: "Supplier B",
		countryNames: ["Thailand", "Vietnam"],
		industries: ["Food and Beverage"],
	},
	{
		value: "supplier-003",
		label: "Supplier C",
		countryNames: ["Cambodia", "Myanmar"],
		industries: ["Manufacturing"],
	},
];

// Debounce hook — delays updating the returned value until the input
// hasn't changed for `delay` ms. Prevents a new API request on every
// individual checkbox click when the user is building a multi-selection.
function useDebounce<T>(value: T, delay = 800): T {
	const [debounced, setDebounced] = useState<T>(value);
	useEffect(() => {
		const id = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(id);
	}, [value, delay]);
	return debounced;
}

/**
 * ISO2 codes for the mock demographics fixture only.
 *
 * `our-workplace.json` keys `demographicsData.mockBreakdown.country` by ISO2
 * code, while the country filter now carries ids from /cascade/countries (which
 * serves `{ id, name }` and no code). This maps the resolved country name back
 * to the fixture's key. Nothing outside the mock path uses it.
 */
const MOCK_COUNTRY_CODE_BY_NAME = new Map<string, string>([
	["Thailand", "TH"],
	["Myanmar", "MM"],
	["Cambodia", "KH"],
	["Vietnam", "VN"],
	["Philippines", "PH"],
	["Bangladesh", "BD"],
	["Nepal", "NP"],
	["India", "IN"],
	["Malaysia", "MY"],
	["Indonesia", "ID"],
]);

// Large palette for demographics — ensures each named category always gets
// the same color regardless of its position in the data array.
// Absolute per-supplier mock values — each dimension sums to the base total
const MOCK_SUPPLIER_DATA: Record<
	string,
	Record<string, { name: string; value: number }[]>
> = {
	"supplier-001": {
		gender: [
			{ name: "Male", value: 2800 },
			{ name: "Female", value: 1200 },
			{ name: "Non-binary", value: 200 },
		],
		nationality: [
			{ name: "Burmese", value: 3200 },
			{ name: "Thai", value: 700 },
			{ name: "Other", value: 300 },
		],
		country: [
			{ name: "Thailand", value: 900 },
			{ name: "Myanmar", value: 1500 },
			{ name: "Vietnam", value: 900 },
			{ name: "Cambodia", value: 780 },
		],
	},
	"supplier-002": {
		gender: [
			{ name: "Male", value: 2000 },
			{ name: "Female", value: 1600 },
			{ name: "Non-binary", value: 75 },
		],
		nationality: [
			{ name: "Burmese", value: 2000 },
			{ name: "Thai", value: 1300 },
			{ name: "Other", value: 375 },
		],
		country: [
			{ name: "Thailand", value: 1100 },
			{ name: "Myanmar", value: 900 },
			{ name: "Vietnam", value: 1100 },
			{ name: "Cambodia", value: 470 },
		],
	},
	"supplier-003": {
		gender: [
			{ name: "Male", value: 2000 },
			{ name: "Female", value: 600 },
			{ name: "Non-binary", value: 25 },
		],
		nationality: [
			{ name: "Burmese", value: 1800 },
			{ name: "Thai", value: 500 },
			{ name: "Other", value: 325 },
		],
		country: [
			{ name: "Thailand", value: 500 },
			{ name: "Myanmar", value: 600 },
			{ name: "Vietnam", value: 600 },
			{ name: "Cambodia", value: 850 },
		],
	},
};

// Colors are ordered so that adjacent indices are maximally visually distinct —
// each new entry is as far as possible from the previous one on the color wheel.
const DEMOGRAPHICS_PALETTE = [
	"#148696", // teal
	"#ef4444", // red
	"#10b981", // emerald
	"#6366f1", // indigo
	"#f59e0b", // amber
	"#8b5cf6", // violet
	"#f97316", // orange
	"#06b6d4", // cyan
	"#ec4899", // pink
	"#84cc16", // lime
	"#e11d48", // rose
	"#1d4ed8", // blue
	"#d97706", // dark amber
	"#14b8a6", // teal-green
	"#a855f7", // purple
	"#059669", // dark emerald
	"#0ea5e9", // sky
	"#7c3aed", // dark violet
	"#22c55e", // bright green
	"#dc2626", // dark red
];

type DemographicEntry = {
	name: string;
	value: number;
};

const UNASSIGNED_NAMES = new Set(["undefined", "not defined", "null", ""]);

const normalizeDemographics = (raw: any[]): DemographicEntry[] => {
	const entries = (raw ?? []).map((entry: any) => {
		const rawName: string = entry.name ?? entry.label ?? entry.gender ?? "";
		const name = UNASSIGNED_NAMES.has(rawName.toLowerCase())
			? "Unassigned"
			: rawName || "Unassigned";
		return { name, value: Number(entry.value ?? entry.count ?? 0) || 0 };
	});
	return entries.filter((entry) => entry.value > 0);
};

const applyWeightsToEntries = (
	entries: DemographicEntry[],
	weights: Record<string, number>,
) =>
	entries.map((entry) => ({
		...entry,
		value: Math.max(
			0,
			Math.round(entry.value * (Number(weights[entry.name]) || 1)),
		),
	}));

const rebalanceDemographicTotals = (
	entries: DemographicEntry[],
	targetTotal: number,
): DemographicEntry[] => {
	if (entries.length === 0) return [];

	const safeTargetTotal = Math.max(0, Math.round(targetTotal));
	const currentTotal = entries.reduce((sum, entry) => sum + entry.value, 0);
	if (safeTargetTotal === 0 || currentTotal <= 0) {
		return entries.map((entry) => ({ ...entry, value: 0 }));
	}

	if (currentTotal === safeTargetTotal) return entries;

	const scaled = entries.map((entry) => {
		const exactValue = (entry.value / currentTotal) * safeTargetTotal;
		const roundedValue = Math.floor(exactValue);
		return {
			...entry,
			value: roundedValue,
			fraction: exactValue - roundedValue,
		};
	});

	let delta =
		safeTargetTotal - scaled.reduce((sum, entry) => sum + entry.value, 0);
	const rankedEntries = [...scaled].sort((left, right) => {
		if (delta > 0) return right.fraction - left.fraction;
		return left.fraction - right.fraction;
	});

	for (const entry of rankedEntries) {
		if (delta === 0) break;
		if (delta < 0 && entry.value === 0) continue;
		entry.value += delta > 0 ? 1 : -1;
		delta += delta > 0 ? -1 : 1;
	}

	return scaled.map(({ fraction: _fraction, ...entry }) => entry);
};

// (Removed custom external labels — using legend/tooltips instead)

const TOP_N = 8;

const isUnassigned = (name: string) => name.toLowerCase() === "unassigned";

const sortWithUnassignedLast = (
	data: DemographicEntry[],
): DemographicEntry[] => {
	const normal = data
		.filter((e) => !isUnassigned(e.name))
		.sort((a, b) => b.value - a.value);
	const unassigned = data.filter((e) => isUnassigned(e.name));
	return [...normal, ...unassigned];
};

const collapseToTopN = (
	rawData: DemographicEntry[],
): { collapsed: DemographicEntry[]; othersBreakdown: DemographicEntry[] } => {
	const sorted = sortWithUnassignedLast(rawData);
	if (sorted.length <= TOP_N) return { collapsed: sorted, othersBreakdown: [] };
	const top = sorted.slice(0, TOP_N);
	const rest = sorted.slice(TOP_N);
	const othersValue = rest.reduce((s, e) => s + e.value, 0);
	if (othersValue > 0) top.push({ name: "Others", value: othersValue });
	return { collapsed: top, othersBreakdown: rest };
};

const buildEChartsPieOption = (
	rawData: DemographicEntry[],
	colorFor: (name: string) => string,
	title?: string,
	legendPos: "bottom" | "right" = "bottom",
) => {
	const { collapsed: data, othersBreakdown } = collapseToTopN(rawData);
	const manyEntries = data.length > 5;

	const legendConfig: any = manyEntries
		? {
				orient: "vertical",
				right: 0,
				top: "middle",
				textStyle: { fontSize: 11 },
				itemGap: 6,
				itemWidth: 10,
				itemHeight: 10,
			}
		: legendPos === "right"
			? {
					orient: "vertical",
					right: 8,
					top: "center",
					textStyle: { fontSize: 12 },
					itemGap: 8,
				}
			: {
					orient: "horizontal",
					bottom: 0,
					textStyle: { fontSize: 12 },
					itemGap: 12,
					padding: [12, 0, 6, 0],
				};

	const center = manyEntries
		? ["38%", "50%"]
		: legendPos === "right"
			? ["40%", "50%"]
			: ["50%", "44%"];

	return {
		title: { text: title || "", left: "center", top: 8 },
		tooltip: {
			trigger: "item",
			formatter: (params: any) => {
				const value = params?.value ?? 0;
				const total = rawData.reduce((s, e) => s + e.value, 0);
				const pct = total ? ((value / total) * 100).toFixed(1) : "0.0";
				if (params.name === "Others" && othersBreakdown.length > 0) {
					const lines = othersBreakdown
						.map((e) => `&nbsp;&nbsp;• ${e.name}: ${e.value.toLocaleString()}`)
						.join("<br/>");
					return `<b>Others</b>: ${value.toLocaleString()} (${pct}%)<br/>${lines}`;
				}
				return `${params.name}: ${value.toLocaleString()} (${pct}%)`;
			},
		},
		legend: legendConfig,
		series: [
			{
				name: title || "",
				type: "pie",
				radius: "60%",
				center,
				avoidLabelOverlap: true,
				label: { show: false },
				labelLine: { show: false },
				data: data.map((d) => ({
					name: d.name,
					value: d.value,
					itemStyle: d.name === "Others" ? { color: "#d1d5db" } : undefined,
				})),
				itemStyle: {
					color: (params: any) =>
						params.data?.itemStyle?.color ?? colorFor(params.name),
				},
			},
		],
	};
};

export const Route = createFileRoute("/social-responsibility-overview")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireRecruiterSupplierAuth({
			isAuthenticated,
			role,
		});
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();
	const scrollRef = useRef<HTMLDivElement>(null);
	const { viewMode } = useViewMode();
	const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
	const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
	const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
	const defaultEnd = getDefaultToDate();
	const defaultStart = DEFAULT_FROM_DATE;
	const [startDate, setStartDate] = useState(defaultStart);
	const [endDate, setEndDate] = useState(defaultEnd);
	const countryFilterId = useId();
	const industryFilterId = useId();
	const supplierFilterId = useId();
	const startDateFilterId = useId();
	const endDateFilterId = useId();
	const { updateBannerImg } = useMemberdirectory();

	useEffect(() => {
		updateBannerImg(landingPageImage);
	}, [updateBannerImg]);

	// Get user identifiers based on role (must come before shouldUseMockData)
	const { supplierId, partnerId, isSupplier, isGlobalPartner, isTestUser } =
		getUserIdentifiers();

	// Check if we should use mock data — org-test-user always uses mock data
	const shouldUseMockData = useMockData() || isTestUser;
	const isSupplierContext =
		isSupplier || (viewMode as string) === "supplier-view";

	const handleWheel = (e: WheelEvent) => {
		e.preventDefault();
		if (scrollRef.current) {
			scrollRef.current.scrollBy({
				left: e.deltaY,
				behavior: "smooth",
			});
		}
	};

	useEffect(() => {
		const current = scrollRef.current;
		if (current) {
			current.addEventListener("wheel", handleWheel, { passive: false });
			return () => current.removeEventListener("wheel", handleWheel);
		}
	}, []);

	// Countries come from /cascade/countries, which serves `{ id, name }` — no
	// ISO code. The filter therefore carries country ids, which resolveCountryIds
	// on the backend accepts alongside codes.
	const { data: countryResponse } = useCascadeCountries();
	const countryList = useMemo(() => {
		const raw = (countryResponse as { results?: unknown } | undefined)?.results;
		if (!Array.isArray(raw)) return [] as Array<{ id: number; name: string }>;
		return raw.filter(
			(c): c is { id: number; name: string } =>
				!!c && typeof c === "object" && "id" in c && "name" in c,
		);
	}, [countryResponse]);

	const countryNameById = useMemo(
		() => new Map(countryList.map((c) => [String(c.id), c.name])),
		[countryList],
	);

	const countryOptions = useMemo(
		() => countryList.map((c) => ({ value: String(c.id), label: c.name })),
		[countryList],
	);

	// Canonical spelling for whatever the supply-chain payload calls a country,
	// so catalog rows and filter selections compare on the same string.
	const canonicalCountryName = useMemo(
		() => new Map(countryList.map((c) => [c.name.toLowerCase(), c.name])),
		[countryList],
	);

	const selectedCountryNames = useMemo(
		() => selectedCountries.map((id) => countryNameById.get(id) ?? id),
		[selectedCountries, countryNameById],
	);

	// Industries come from the API so the filter can send ids: every stats
	// endpoint expects `industry` as an industry id, not its display name.
	const { data: industryList = [] } = useIndustries();

	// `selectedIndustries` holds ids. Catalog rows, mock fixtures and fieldwork
	// records all carry industry *names*, so those comparisons resolve through
	// this map first.
	const industryNameById = useMemo(
		() => new Map(industryList.map((i) => [String(i.id), i.name])),
		[industryList],
	);

	const industryIdByName = useMemo(
		() =>
			new Map(
				industryList.map((i) => [i.name.trim().toLowerCase(), String(i.id)]),
			),
		[industryList],
	);

	const industryOptions = useMemo(
		() => industryList.map((i) => ({ value: String(i.id), label: i.name })),
		[industryList],
	);

	const selectedIndustryNames = useMemo(
		() => selectedIndustries.map((id) => industryNameById.get(id) ?? id),
		[selectedIndustries, industryNameById],
	);

	// Fetch supply chains to get supplier IDs for global partners
	const { data: supplyChains = [], isLoading: loadingSupplyChains } =
		useSupplyChains(
			isGlobalPartner ? { partnerId: partnerId || undefined } : undefined,
		);

	// Supplier -> country / industry map behind the filter dropdowns.
	//
	// Sourced from /cascade/suppliers rather than the supply chains above: that
	// payload carries neither country nor industry on its supplier rows, so
	// options built from it could never narrow one another. Fetched unfiltered
	// for the account scope and cross-filtered below, so changing a selection
	// re-derives the dropdowns without a request.
	const { data: supplierCatalog = [] } = useSupplierFilterCatalog(partnerId, {
		// Strategic partners are the only role with a multi-supplier dropdown, and
		// partner_id is what scopes the request to their own supply chain. Without
		// it /cascade/suppliers returns every supplier in the system, so never run
		// this unscoped.
		enabled: !shouldUseMockData && isGlobalPartner && !!partnerId,
	});

	const allSuppliersCatalog = useMemo<SupplierCatalogItem[]>(() => {
		if (shouldUseMockData) return MOCK_SUPPLIER_CATALOG;

		// Country names arrive from /cascade/countries and /cascade/suppliers
		// separately; canonicalise so catalog rows and selections compare equal.
		return supplierCatalog.map((item) => ({
			...item,
			countryNames: item.countryNames.map(
				(name) => canonicalCountryName.get(name.toLowerCase()) ?? name,
			),
		}));
	}, [supplierCatalog, shouldUseMockData, canonicalCountryName]);

	// Only cross-filter on a dimension the catalog actually holds data for.
	const catalogHasCountries = useMemo(
		() => catalogCarries(allSuppliersCatalog, (item) => item.countryNames),
		[allSuppliersCatalog],
	);
	const catalogHasIndustries = useMemo(
		() => catalogCarries(allSuppliersCatalog, (item) => item.industries),
		[allSuppliersCatalog],
	);

	// Filter supplier options based on active country and industry selections
	const filteredSupplierOptions = useMemo(() => {
		const filtered = allSuppliersCatalog.filter((supplier) => {
			if (
				catalogHasCountries &&
				selectedCountryNames.length > 0 &&
				!supplier.countryNames.some((c) => selectedCountryNames.includes(c))
			) {
				return false;
			}
			if (
				catalogHasIndustries &&
				selectedIndustryNames.length > 0 &&
				!supplier.industries.some((ind) => selectedIndustryNames.includes(ind))
			) {
				return false;
			}
			return true;
		});

		return [
			{ value: "", label: t("socialResponsibility.filters.allSuppliers") },
			...filtered.map((s) => ({ value: s.value, label: s.label })),
		];
	}, [
		allSuppliersCatalog,
		catalogHasCountries,
		catalogHasIndustries,
		selectedCountryNames,
		selectedIndustryNames,
		t,
	]);

	// Filter country options based on active supplier and industry selections
	const filteredCountryOptions = useMemo(() => {
		const validNames = new Set<string>();

		allSuppliersCatalog.forEach((supplier) => {
			if (
				selectedSuppliers.length > 0 &&
				!selectedSuppliers.includes(supplier.value)
			) {
				return;
			}
			if (
				catalogHasIndustries &&
				selectedIndustryNames.length > 0 &&
				!supplier.industries.some((ind) => selectedIndustryNames.includes(ind))
			) {
				return;
			}
			supplier.countryNames.forEach((c) => {
				validNames.add(c);
			});
		});

		// No country recorded against the suppliers in scope — offer the full list
		// rather than an empty dropdown; the backend filters on the id we send
		// either way.
		if (validNames.size === 0) return countryOptions;

		return countryOptions.filter((opt) => validNames.has(opt.label));
	}, [
		allSuppliersCatalog,
		catalogHasIndustries,
		selectedSuppliers,
		selectedIndustryNames,
		countryOptions,
	]);

	// Filter industry options based on active country and supplier selections.
	// The catalog stores industry *names*; options are keyed by id, so valid
	// names are mapped back through industryIdByName.
	const filteredIndustryOptions = useMemo(() => {
		const validIndustryIds = new Set<string>();

		allSuppliersCatalog.forEach((supplier) => {
			if (
				selectedSuppliers.length > 0 &&
				!selectedSuppliers.includes(supplier.value)
			) {
				return;
			}
			if (
				catalogHasCountries &&
				selectedCountryNames.length > 0 &&
				!supplier.countryNames.some((c) => selectedCountryNames.includes(c))
			) {
				return;
			}
			supplier.industries.forEach((name) => {
				const id = industryIdByName.get(name.trim().toLowerCase());
				if (id) validIndustryIds.add(id);
			});
		});

		// No industry recorded against the suppliers in scope — offer the full
		// list rather than an empty dropdown; the backend filters on the id we
		// send either way.
		if (validIndustryIds.size === 0) return industryOptions;

		return industryOptions.filter((opt) => validIndustryIds.has(opt.value));
	}, [
		allSuppliersCatalog,
		catalogHasCountries,
		selectedSuppliers,
		selectedCountryNames,
		industryOptions,
		industryIdByName,
	]);

	// Auto-prune selections when active filter options narrow
	useEffect(() => {
		if (selectedSuppliers.length > 0) {
			const validIds = new Set(filteredSupplierOptions.map((o) => o.value));
			const validSelections = selectedSuppliers.filter((id) =>
				validIds.has(id),
			);
			if (validSelections.length !== selectedSuppliers.length) {
				setSelectedSuppliers(validSelections);
			}
		}
	}, [filteredSupplierOptions, selectedSuppliers]);

	useEffect(() => {
		if (selectedCountries.length > 0) {
			const validCodes = new Set(filteredCountryOptions.map((o) => o.value));
			const validSelections = selectedCountries.filter((code) =>
				validCodes.has(code),
			);
			if (validSelections.length !== selectedCountries.length) {
				setSelectedCountries(validSelections);
			}
		}
	}, [filteredCountryOptions, selectedCountries]);

	useEffect(() => {
		if (selectedIndustries.length > 0) {
			const validInds = new Set(filteredIndustryOptions.map((o) => o.value));
			const validSelections = selectedIndustries.filter((ind) =>
				validInds.has(ind),
			);
			if (validSelections.length !== selectedIndustries.length) {
				setSelectedIndustries(validSelections);
			}
		}
	}, [filteredIndustryOptions, selectedIndustries]);

	// Debounce all filter values that drive API calls so users can make
	// multiple checkbox selections before a request fires.
	const debouncedSuppliers = useDebounce(selectedSuppliers);
	const debouncedCountries = useDebounce(selectedCountries);
	const debouncedIndustries = useDebounce(selectedIndustries);
	const debouncedStartDate = useDebounce(startDate);
	const debouncedEndDate = useDebounce(endDate);

	// Every supplier this account can reach, before any filter is applied.
	// The "no supplier data" guard further down keys off *this* list rather than
	// the filtered one: an account with suppliers still has a page to show, even
	// when the active filters match none of them.
	const accountSupplierIds = useMemo(() => {
		if (isSupplier && supplierId) {
			// Direct supplier user - use their supplier ID
			return [supplierId];
		}

		if (isGlobalPartner && partnerId && supplyChains.length > 0) {
			let suppliers: any[] = [];
			supplyChains.forEach((sc: any) => {
				if (sc.suppliers && Array.isArray(sc.suppliers)) {
					suppliers = suppliers.concat(sc.suppliers);
				}
			});

			const uniqueSupplierIds = new Set();
			const uniqueSuppliers = suppliers.filter((s: any) => {
				const id = s.id || s.supplier;
				if (!id || uniqueSupplierIds.has(id)) return false;
				uniqueSupplierIds.add(id);
				return true;
			});

			return uniqueSuppliers.map((s) => s.id || s.supplier);
		}

		if (shouldUseMockData) {
			return ["supplier-001", "supplier-002", "supplier-003"];
		}

		if (isTestUser) {
			return supplierId ? [supplierId] : [];
		}

		return [] as any[];
	}, [
		isSupplier,
		isGlobalPartner,
		shouldUseMockData,
		isTestUser,
		supplierId,
		partnerId,
		supplyChains,
	]);

	// The account's suppliers, narrowed only by an explicit supplier selection.
	//
	// Country and industry are deliberately *not* applied here. Every stats
	// endpoint receives `country` and `industry` as request params and filters
	// server-side, and the local catalog cannot do it reliably anyway — the
	// supply-chain payload carries neither field on its supplier rows, so
	// narrowing here removed every id and blanked the page.
	const supplierIds = useMemo(() => {
		if (debouncedSuppliers.length === 0) return accountSupplierIds;

		return accountSupplierIds.filter((id: any) =>
			debouncedSuppliers.includes(String(id)),
		);
	}, [accountSupplierIds, debouncedSuppliers]);

	// Filters are active and nothing survived them. Rendered inline so the
	// filter bar stays on screen and the selection can be undone.
	const noSuppliersMatchFilters =
		accountSupplierIds.length > 0 && supplierIds.length === 0;

	// Determine which parameters to pass to API calls — uses debounced values
	// so filter changes don't fire a request on every single selection.
	const queryParams = useMemo(
		() => ({
			supplierId: supplierIds.length > 0 ? supplierIds : null,
			// Don't pass partnerId when specific suppliers are selected — the backend
			// ignores supplierId when partnerId is present and re-expands to all
			// partner suppliers. With selectedSuppliers set we already have the
			// narrowed list in supplierIds, so partnerId is redundant and harmful.
			partnerId:
				isGlobalPartner && selectedSuppliers.length === 0
					? (partnerId ?? null)
					: undefined,
			country:
				debouncedCountries.length > 0
					? debouncedCountries.join(",")
					: undefined,
			industry:
				debouncedIndustries.length > 0
					? debouncedIndustries.join(",")
					: undefined,
			startDate: debouncedStartDate || null,
			endDate: debouncedEndDate || null,
			startTime: debouncedStartDate || null,
			endTime: debouncedEndDate || null,
		}),
		[
			supplierIds,
			partnerId,
			isGlobalPartner,
			debouncedCountries,
			debouncedIndustries,
			debouncedStartDate,
			debouncedEndDate,
		],
	) as any;

	const supplierTimelineFilters = useMemo(
		() => ({
			supplier: supplierIds.length > 0 ? supplierIds.map(String) : undefined,
			partner:
				isGlobalPartner && selectedSuppliers.length === 0 && partnerId != null
					? String(partnerId)
					: undefined,
			startTime: `${debouncedStartDate || defaultStart}T00:00:00Z`,
			endTime: `${debouncedEndDate || defaultEnd}T23:59:59Z`,
			country:
				debouncedCountries.length > 0
					? debouncedCountries.join(",")
					: undefined,
			industry:
				debouncedIndustries.length > 0
					? debouncedIndustries.join(",")
					: undefined,
		}),
		[
			supplierIds,
			isGlobalPartner,
			selectedSuppliers.length,
			partnerId,
			debouncedStartDate,
			debouncedEndDate,
			defaultStart,
			defaultEnd,
			debouncedCountries,
			debouncedIndustries,
		],
	);

	// Fetch live KPI/case data and workplace stats (mirror our-workplace)

	const { data, isLoading, isFetching, error } = useWorkplaceStats(queryParams);

	// Supplier-only stats for the 3 header cards (ignores country/industry/date filters)
	const supplierOnlyParams = useMemo(
		() => ({
			supplierId: supplierIds.length > 0 ? supplierIds : null,
			partnerId:
				isGlobalPartner && selectedSuppliers.length === 0
					? (partnerId ?? null)
					: undefined,
		}),
		[supplierIds, isGlobalPartner, selectedSuppliers.length, partnerId],
	) as any;
	const { data: headerData } = useWorkplaceStats(supplierOnlyParams);
	// isFetching is true on every filter-change re-fetch; isLoading only on first load

	const {
		data: socialScores,
		isLoading: loadingSocialScores,
		isFetching: isSocialFetching,
	} = useSocialScores(
		supplierIds.length > 0 ? supplierIds : null,
		isGlobalPartner ? partnerId : null,
		debouncedStartDate || null,
		debouncedEndDate || null,
		debouncedCountries.length > 0 ? debouncedCountries.join(",") : undefined,
		debouncedIndustries.length > 0 ? debouncedIndustries.join(",") : undefined,
	);

	// Fetch CASCADE Index (reuse marketplace logic)
	const {
		data: cascadeIndex,
		isLoading: loadingCascadeIndex,
		isFetching: isCascadeFetching,
	} = useCascadeIndex(
		// If a single supplier selected pass supplierId, otherwise use partner scope
		supplierIds.length === 1 ? Number(supplierIds[0]) : undefined,
		isGlobalPartner && selectedSuppliers.length === 0 ? partnerId : null,
		debouncedStartDate || null,
		debouncedEndDate || null,
		debouncedCountries.length > 0 ? debouncedCountries.join(",") : undefined,
		debouncedIndustries.length > 0 ? debouncedIndustries.join(",") : undefined,
	);

	const cascadeFinalScore =
		cascadeIndex?.finalScore ??
		Math.round(
			(cascadeIndex?.wvScore ?? 0) * 0.65 +
				(cascadeIndex?.ciScore ?? 50) * 0.35,
		);

	// Fetch detailed updates
	const {
		data: detailedUpdatesResponse,
		isLoading: loadingDetailedUpdates,
		isFetching: isDetailedFetching,
	} = useDetailedKpiUpdates(queryParams);

	// True whenever any page-owned query is fetching (initial or background).
	const isAnyFetching =
		!shouldUseMockData &&
		(isFetching || isSocialFetching || isCascadeFetching || isDetailedFetching);

	// We only want the "Updating…" overlay when the *filters* change — not on
	// initial load (covered by the full-page LoadingSpinner) nor on React
	// Query's window-focus refetch when returning to the tab. Track a signature
	// of the current filters and flag a change; clear it once fetching settles.
	const filterSignature = JSON.stringify({
		supplierIds,
		debouncedCountries,
		debouncedIndustries,
		debouncedStartDate,
		debouncedEndDate,
	});
	const prevFilterSignature = useRef(filterSignature);
	const [filterChanged, setFilterChanged] = useState(false);

	useEffect(() => {
		if (prevFilterSignature.current !== filterSignature) {
			prevFilterSignature.current = filterSignature;
			setFilterChanged(true);
		}
	}, [filterSignature]);

	useEffect(() => {
		if (filterChanged && !isAnyFetching) {
			setFilterChanged(false);
		}
	}, [filterChanged, isAnyFetching]);

	// Show the overlay only for a filter-driven refetch. On first mount the
	// signature matches its initial ref, so filterChanged stays false and the
	// initial load (handled by the full-page LoadingSpinner) is excluded.
	const isAnyRefetching = filterChanged && isAnyFetching;

	const isInitialPageLoading =
		!shouldUseMockData &&
		(loadingSupplyChains ||
			isLoading ||
			loadingSocialScores ||
			loadingCascadeIndex ||
			loadingDetailedUpdates);

	// Build cases by category from detailed updates filtered by supplierIds (falls back to API-shaped kpiCategoryData)
	// DEPRECATED: Now handled by SocialResponsibilityCasesByCategory component

	const timeToClosureData = useMemo(() => {
		const buckets = [
			{ name: "<1 day", value: 0 },
			{ name: "1-7 days", value: 0 },
			{ name: "8-30 days", value: 0 },
			{ name: "31-90 days", value: 0 },
			{ name: "91-150 days", value: 0 },
		];

		if (shouldUseMockData) {
			const mockValues = chartData.timeToClosureData ?? [];
			return buckets.map((bucket, index) => ({
				...bucket,
				value: mockValues[index]?.value ?? 0,
				avgSeverity: (mockValues[index] as any)?.avgSeverity ?? 0,
			}));
		}

		const supplierSet = new Set((supplierIds || []).map(String));
		const categorySet = new Set([1, 4, 5, 8, 9]);
		const detailed = (detailedUpdatesResponse?.data ?? []) as any[];

		if (detailed.length > 0 && supplierIds.length > 0) {
			const caseStatus = new Map<
				string,
				{ status: number; ts: number; days: number }
			>();

			const parseTs = (value: any) => {
				if (!value) return 0;
				const parsedNumber = Number(value);
				if (!Number.isNaN(parsedNumber) && parsedNumber > 0)
					return parsedNumber;
				const parsedDate = Date.parse(String(value));
				return Number.isNaN(parsedDate) ? 0 : parsedDate;
			};

			detailed.forEach((update: any) => {
				if (!categorySet.has(Number(update.kpi_category_id))) return;
				if (!supplierSet.has(String(update.supplier_id))) return;

				const kpiKey = String(update.supplier_kpi_id ?? update.id ?? "unknown");
				const timestamp =
					parseTs(update.updated_at) ||
					parseTs(update.closed_at) ||
					parseTs(update.opened_at) ||
					parseTs(update.created_at) ||
					0;
				const status = Number(update.status_id) || 0;

				let days = 0;
				if (update.days_to_close != null) {
					days = Number(update.days_to_close) || 0;
				} else if (update.closed_at && update.opened_at) {
					try {
						const closed = new Date(update.closed_at);
						const opened = new Date(update.opened_at);
						const diff = closed.getTime() - opened.getTime();
						days = Math.ceil(diff / (1000 * 60 * 60 * 24));
					} catch (_error) {
						days = 0;
					}
				}

				const previous = caseStatus.get(kpiKey);
				if (!previous || timestamp >= previous.ts) {
					caseStatus.set(kpiKey, {
						status,
						ts: timestamp,
						days: Math.max(0, days),
					});
				}
			});

			caseStatus.forEach(({ status, days }) => {
				if (status !== 3) return;
				if (days < 1) buckets[0].value += 1;
				else if (days <= 7) buckets[1].value += 1;
				else if (days <= 30) buckets[2].value += 1;
				else if (days <= 90) buckets[3].value += 1;
				else if (days <= 150) buckets[4].value += 1;
			});

			if (buckets.some((bucket) => bucket.value > 0)) return buckets;
		}

		const monthly = data?.time_to_case_closure?.monthly ?? [];
		monthly.forEach((item: any) => {
			const days = item.avg_closure_time;
			if (days < 1) buckets[0].value += item.closed_cases;
			else if (days <= 7) buckets[1].value += item.closed_cases;
			else if (days <= 30) buckets[2].value += item.closed_cases;
			else if (days <= 90) buckets[3].value += item.closed_cases;
			else if (days <= 150) buckets[4].value += item.closed_cases;
		});

		if (buckets.some((bucket) => bucket.value > 0)) return buckets;

		const mockData = chartData.timeToClosureData ?? [];
		return buckets.map((bucket, index) => ({
			...bucket,
			value: mockData[index]?.value ?? 0,
			avgSeverity: (mockData[index] as any)?.avgSeverity ?? 0,
		}));
	}, [shouldUseMockData, supplierIds, detailedUpdatesResponse, data]);

	// Compute average closure time: prefer API value, otherwise derive from detailed updates
	const computedAvgClosureTime = useMemo(() => {
		// If using mock data, return a mock average closure time
		if (shouldUseMockData) {
			// Calculate average from mock timeToClosureData or return a default value
			const totalCases = timeToClosureData.reduce(
				(sum, bucket) => sum + bucket.value,
				0,
			);
			if (totalCases === 0) return 45; // Default mock value

			// Estimate average based on bucket midpoints
			const bucketMidpoints: Record<string, number> = {
				"<1 day": 0.5,
				"1-7 days": 4,
				"8-30 days": 19,
				"31-90 days": 60,
				"91-150 days": 120.5,
			};

			const weightedSum = timeToClosureData.reduce((sum, bucket) => {
				const midpoint = bucketMidpoints[bucket.name] ?? 45;
				return sum + bucket.value * midpoint;
			}, 0);

			return weightedSum / totalCases;
		}

		const apiAvg = data?.time_to_case_closure?.average_closure_time;
		if (apiAvg != null && !Number.isNaN(Number(apiAvg))) return Number(apiAvg);

		const updates = (detailedUpdatesResponse?.data ?? []) as any[];
		if (!updates || updates.length === 0) return 0;

		const supplierSet = new Set((supplierIds || []).map(String));
		const categorySet = new Set([1, 4, 5, 8, 9]);

		const caseMeta = new Map<
			string,
			{ status: number; ts: number; days: number }
		>();
		const parseTs = (v: any) => {
			if (!v) return 0;
			const n = Number(v);
			if (!Number.isNaN(n) && n > 0) return n;
			const d = Date.parse(String(v));
			return Number.isNaN(d) ? 0 : d;
		};

		for (const u of updates) {
			if (!categorySet.has(Number(u.kpi_category_id))) continue;
			if (supplierIds.length > 0 && !supplierSet.has(String(u.supplier_id)))
				continue;

			const kpiKey = String(u.supplier_kpi_id ?? u.id ?? "unknown");
			const ts =
				parseTs(u.updated_at) ||
				parseTs(u.closed_at) ||
				parseTs(u.opened_at) ||
				parseTs(u.created_at) ||
				0;
			const status = Number(u.status_id) || 0;

			let days = 0;
			if (u.days_to_close != null) {
				days = Number(u.days_to_close) || 0;
			} else if (u.closed_at && u.opened_at) {
				const closed = new Date(u.closed_at);
				const opened = new Date(u.opened_at);
				const diff = closed.getTime() - opened.getTime();
				days = Math.ceil(diff / (1000 * 60 * 60 * 24));
			}

			const prev = caseMeta.get(kpiKey);
			if (!prev || ts >= prev.ts) {
				caseMeta.set(kpiKey, { status, ts, days: Math.max(0, days) });
			}
		}

		let sum = 0;
		let count = 0;
		for (const { status, days } of Array.from(caseMeta.values())) {
			if (status !== 3) continue; // ONLY CLOSED
			if (days > 150) continue; // SLICE AT 150
			sum += days;
			count += 1;
		}

		if (count === 0) return 0;
		return sum / count;
	}, [
		shouldUseMockData,
		timeToClosureData,
		data,
		detailedUpdatesResponse,
		supplierIds,
	]);
	// Helper to get latest Worker Voice Coverage from company-dashboard.json mock
	const getLatestWorkerVoiceCoverage = () => {
		const kpiByMonth = companyDashboardMock.kpiByMonth || [];
		if (!Array.isArray(kpiByMonth) || kpiByMonth.length === 0) return 0;
		// Find the latest by date
		const sorted = isSupplierContext
			? [{ workerVoiceCoverage: 1327 }]
			: [...kpiByMonth].sort(
					(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
				);

		return sorted[0]?.workerVoiceCoverage ?? 0;
	};

	const statsData = useMemo(() => {
		if (shouldUseMockData) {
			const countryLabel = selectedCountryNames[0] ?? "";
			const industryLabel = selectedIndustryNames[0] ?? "";

			let totalWorkers = chartData.main_stats?.worker_count ?? 10200;
			let totalCases = chartData.main_stats?.case_count ?? 48;
			let totalResponses = chartData.main_stats?.response_count ?? 1840;
			let baseCoverage = getLatestWorkerVoiceCoverage();

			if (selectedSuppliers[0] && MOCK_SUPPLIER_DATA[selectedSuppliers[0]]) {
				const supData = MOCK_SUPPLIER_DATA[selectedSuppliers[0]];
				const countryDataRaw = countryLabel
					? (supData.country ?? []).filter((e) => e.name === countryLabel)
					: (supData.country ?? []);
				totalWorkers = countryDataRaw.reduce((sum, e) => sum + e.value, 0);
				const ratio = totalWorkers / 10200;
				totalCases = Math.max(1, Math.round(48 * ratio));
				totalResponses = Math.max(10, Math.round(1840 * ratio));
				baseCoverage = Math.max(10, Math.round(1327 * ratio));
			} else if (countryLabel) {
				const countryMap: Record<string, number> = {
					Thailand: 2500,
					Myanmar: 3000,
					Vietnam: 2600,
					Cambodia: 2100,
				};
				totalWorkers = countryMap[countryLabel] ?? Math.round(10200 / 4);
				const ratio = totalWorkers / 10200;
				totalCases = Math.max(1, Math.round(48 * ratio));
				totalResponses = Math.max(10, Math.round(1840 * ratio));
				baseCoverage = Math.max(10, Math.round(1327 * ratio));
			} else if (industryLabel) {
				const industryMap: Record<string, number> = {
					Seafood: 4000,
					"Food and Beverage": 2000,
					Manufacturing: 4200,
				};
				totalWorkers = industryMap[industryLabel] ?? Math.round(10200 / 3);
				const ratio = totalWorkers / 10200;
				totalCases = Math.max(1, Math.round(48 * ratio));
				totalResponses = Math.max(10, Math.round(1840 * ratio));
				baseCoverage = Math.max(10, Math.round(1327 * ratio));
			}

			return {
				totalWorkers,
				workerVoiceCoverage: baseCoverage,
				totalCases,
				closedCases: totalCases,
				totalResponses,
				avgClosureTime: computedAvgClosureTime,
			};
		}

		return {
			totalWorkers:
				data?.demographics?.total ??
				data?.main_stats?.worker_count ??
				headerData?.demographics?.total ??
				headerData?.main_stats?.worker_count ??
				0,
			workerVoiceCoverage:
				data?.worker_voice_summary?.total_workers_with_access ??
				headerData?.worker_voice_summary?.total_workers_with_access ??
				0,
			totalCases: data?.main_stats?.case_count ?? 0,
			closedCases: data?.main_stats?.closed_case_count ?? 0,
			totalResponses: data?.main_stats?.response_count ?? 0,
			avgClosureTime: data?.time_to_case_closure?.average_closure_time ?? 0,
		};
	}, [
		shouldUseMockData,
		selectedCountryNames,
		selectedSuppliers,
		selectedIndustryNames,
		data,
		headerData,
		computedAvgClosureTime,
	]);

	const demographicsColors = chartData.demographicsData?.colors ?? [
		statusColorPalette[2],
		statusColorPalette[1],
		statusColorPalette[4],
		statusColorPalette[7],
	];

	const demographicsData = useMemo(() => {
		const mockBreakdown =
			(chartData as any)?.demographicsData?.mockBreakdown ?? {};
		const getCombinedWeights = (
			dimension: "gender" | "nationality" | "country",
		) => {
			const dimKey = dimension === "country" ? "ethnicity" : dimension;
			const mockCountryCode = selectedCountryNames[0]
				? MOCK_COUNTRY_CODE_BY_NAME.get(selectedCountryNames[0])
				: undefined;
			const countryWeights = mockCountryCode
				? (mockBreakdown?.country?.[mockCountryCode]?.[dimKey] ?? {})
				: {};
			const industryWeights = selectedIndustryNames[0]
				? (mockBreakdown?.industry?.[selectedIndustryNames[0]]?.[dimKey] ?? {})
				: {};

			const names = new Set([
				...Object.keys(countryWeights),
				...Object.keys(industryWeights),
			]);

			return Object.fromEntries(
				Array.from(names).map((name) => [
					name,
					(Number(countryWeights[name]) || 1) *
						(Number(industryWeights[name]) || 1),
				]),
			);
		};

		// When mock data + specific supplier selected, use absolute supplier data directly
		if (
			shouldUseMockData &&
			selectedSuppliers[0] &&
			MOCK_SUPPLIER_DATA[selectedSuppliers[0]]
		) {
			const supplierData = MOCK_SUPPLIER_DATA[selectedSuppliers[0]];
			const rawCountry = supplierData.country ?? [];
			const selectedCountryLabel = selectedCountryNames[0] ?? "";
			const countryDataRaw = selectedCountryLabel
				? rawCountry.filter((e) => e.name === selectedCountryLabel)
				: rawCountry;
			const countryTotal = countryDataRaw.reduce((sum, e) => sum + e.value, 0);
			return {
				country: countryDataRaw,
				countryTotal,
				gender: rebalanceDemographicTotals(
					supplierData.gender ?? [],
					countryTotal,
				),
				nationality: rebalanceDemographicTotals(
					supplierData.nationality ?? [],
					countryTotal,
				),
				colors: demographicsColors,
			};
		}

		const baseGender = normalizeDemographics(
			shouldUseMockData
				? (chartData.demographicsData?.gender ?? [])
				: (data?.demographics?.gender ?? []),
		);
		const baseNationality = normalizeDemographics(
			shouldUseMockData
				? (chartData.demographicsData?.nationality ?? [])
				: (data?.demographics?.nationality ?? []),
		);
		const baseCountry = normalizeDemographics(
			shouldUseMockData
				? (chartData.demographicsData?.country ?? [])
				: (data?.demographics?.country ?? []),
		);

		const weightedCountryData = shouldUseMockData
			? applyWeightsToEntries(baseCountry, getCombinedWeights("country"))
			: baseCountry;

		const selectedCountryLabel = selectedCountryNames[0] ?? "";
		const selectedCountryEntry = selectedCountryLabel
			? weightedCountryData.find((entry) => entry.name === selectedCountryLabel)
			: null;
		const countryData = selectedCountryLabel
			? selectedCountryEntry && selectedCountryEntry.value > 0
				? [selectedCountryEntry]
				: []
			: weightedCountryData;

		const countryTotal = countryData.reduce(
			(sum, entry) => sum + entry.value,
			0,
		);

		const weightedGenderData = shouldUseMockData
			? applyWeightsToEntries(baseGender, getCombinedWeights("gender"))
			: baseGender;
		const weightedNationalityData = shouldUseMockData
			? applyWeightsToEntries(
					baseNationality,
					getCombinedWeights("nationality"),
				)
			: baseNationality;

		const baseTotal = data?.demographics?.total ?? countryTotal;
		return {
			country: countryData,
			countryTotal,
			gender: rebalanceDemographicTotals(weightedGenderData, baseTotal),
			nationality: rebalanceDemographicTotals(
				weightedNationalityData,
				baseTotal,
			),
			colors: demographicsColors,
		};
	}, [
		data,
		demographicsColors,
		selectedCountryNames,
		selectedIndustryNames,
		selectedSuppliers,
		shouldUseMockData,
	]);

	// Exclude any 'Total' placeholder from gender chart data (keep demographics.total for header)
	const genderData = (demographicsData.gender || []).filter(
		(g) => String(g.name).toLowerCase() !== "total",
	);
	const nationalityData = demographicsData.nationality;
	const countryData = demographicsData.country;
	const demographicsTotal =
		statsData.totalWorkers ||
		data?.demographics?.total ||
		demographicsData.countryTotal;

	// Build separate name→color maps for each chart so that colors are assigned
	// independently per chart. This prevents nationality names from "consuming"
	// palette slots that would otherwise be used by country names, which was
	// causing two countries to share visually similar colours.
	const { getCountryColor, getNationalityColor } = useMemo(() => {
		const makeColorFn = (names: string[]) => {
			const sorted = [...names].sort();
			const map = new Map(
				sorted.map((name, i) => [
					name,
					DEMOGRAPHICS_PALETTE[i % DEMOGRAPHICS_PALETTE.length],
				]),
			);
			return (name: string) => map.get(name) ?? DEMOGRAPHICS_PALETTE[0];
		};
		return {
			getCountryColor: makeColorFn(countryData.map((d) => d.name)),
			getNationalityColor: makeColorFn(nationalityData.map((d) => d.name)),
		};
	}, [countryData, nationalityData]);

	const engagementColumns = useMemo(() => buildEngagementColumns(t), [t]);

	// Map fieldwork_activities from cascade_workplace API into table rows
	const supplyChainEngagementRows = useMemo(() => {
		if (shouldUseMockData) {
			let rows = SUPPLY_CHAIN_ENGAGEMENT_ROWS;
			if (selectedCountryNames.length > 0) {
				rows = rows.filter((r) =>
					selectedCountryNames.some((name) =>
						r.location.toLowerCase().includes(name.toLowerCase()),
					),
				);
			}
			if (selectedSuppliers.length > 0) {
				rows = rows.filter(
					(r) =>
						(r.supplierId && selectedSuppliers.includes(r.supplierId)) ||
						selectedSuppliers.some((sId) =>
							r.supplierName.toLowerCase().includes(sId.toLowerCase()),
						),
				);
			}
			if (selectedIndustryNames.length > 0) {
				rows = rows.filter(
					(r) => r.industry && selectedIndustryNames.includes(r.industry),
				);
			}
			return rows;
		}
		const activities = data?.fieldwork_activities;
		if (!Array.isArray(activities) || activities.length === 0) return [];
		return activities.map((a: Record<string, unknown>, idx: number) => ({
			id: (a.fieldwork_activity_id as number) ?? idx + 1,
			supplierName: (a.supplier_names as string) || "—",
			activityType: (a.fieldwork_type_name as string) || "—",
			date: (a.fieldwork_date as string)?.split("T")[0] || "—",
			location:
				[a.district_name, a.province_name, a.country_name]
					.filter(Boolean)
					.join(", ") || "—",
		}));
	}, [
		shouldUseMockData,
		data,
		selectedCountryNames,
		selectedSuppliers,
		selectedIndustryNames,
	]);

	const workerIssuesItems = useMemo<WorkerIssueItem[]>(() => {
		if (shouldUseMockData) {
			const mockRisks = (companyDashboardMock as any).top5WorkerRisks ?? [];
			// Deterministic mock days so Strengths/Improvements are meaningful — higher quality maps to faster turnaround.
			return mockRisks.map((r: any, idx: number) => ({
				issue: r.issue,
				category: r.category,
				isForcedLabor: Boolean(r.isForcedLabor),
				count: Number(r.closedCases || 0),
				qualityScore: Number(r.score || 0),
				speedDays: Math.round(15 + idx * 7 + (4 - Number(r.score || 0)) * 12),
			}));
		}

		const apiRemediation = (data as any)?.top_remediation_kpis;
		if (!Array.isArray(apiRemediation)) return [];
		return apiRemediation.map((r: any) => ({
			issue:
				r.kpi_grouping ||
				r.grouping ||
				r.kpi_description ||
				r.kpi_category ||
				"",
			category: t("companyDashboard.topRisks.level", { level: r.kpi_level }),
			isForcedLabor: Number(r.kpi_level) >= 3,
			count: Number(
				r.total_closed_issues ?? r.case_count ?? r.closed_cases ?? 0,
			),
			qualityScore:
				r.mean_remediation_quality != null
					? Number(r.mean_remediation_quality)
					: 0,
			speedDays:
				r.mean_days_to_close != null ? Number(r.mean_days_to_close) : 0,
		}));
	}, [shouldUseMockData, data, t]);

	const topCommonIssues = useMemo<WorkerIssueItem[]>(
		() =>
			[...workerIssuesItems]
				.sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
				.slice(0, 5),
		[workerIssuesItems],
	);

	// Combined remediation score (0–10): quality (50%) + speed (50%) when
	// speed is present, else quality alone. Same sigmoid timeliness as the
	// backend social-scores formula. Drives both Strengths and Improvements.
	const itemsWithCombined = useMemo(() => {
		const TIMELINESS_K = 0.05;
		const TIMELINESS_X0 = 90;
		const speedFromDays = (days: number) =>
			10 / (1 + Math.exp(TIMELINESS_K * (days - TIMELINESS_X0)));
		return workerIssuesItems.map((item) => {
			const quality = Math.max(
				0,
				Math.min(10, Number(item.qualityScore || 0) * 2.5),
			);
			const hasSpeed = item.speedDays != null && Number(item.speedDays) > 0;
			const days = hasSpeed ? Math.max(0, Number(item.speedDays)) : 0;
			const speed = hasSpeed ? speedFromDays(days) : 0;
			const combined = hasSpeed ? quality * 0.5 + speed * 0.5 : quality;
			return { item, combined };
		});
	}, [workerIssuesItems]);

	// Strengths: combined remediation score in Good/Excellent range (>= 5.0
	// out of 10), sorted DESC (best remediation first).
	const grievanceStrengths = useMemo(
		() =>
			[...itemsWithCombined]
				.filter((e) => e.combined >= 5)
				.sort((a, b) => b.combined - a.combined)
				.slice(0, 5)
				.map((e) => e.item),
		[itemsWithCombined],
	);

	// Improvements: combined remediation score in Poor/Fair range (< 5.0 out
	// of 10), sorted ASC (worst remediation first). Excludes items with no
	// quality data at all (combined would be 0 from missing inputs).
	const grievanceImprovements = useMemo(
		() =>
			[...itemsWithCombined]
				.filter((e) => e.combined < 5 && Number(e.item.qualityScore || 0) > 0)
				.sort((a, b) => a.combined - b.combined)
				.slice(0, 5)
				.map((e) => e.item),
		[itemsWithCombined],
	);

	const humanRightsSlides = useMemo(() => {
		const toStatus = (score: number) =>
			score >= 80 ? "excellent" : score >= 70 ? "good" : "medium";

		const overallScore = socialScores?.overall ?? null;
		const laborScore = socialScores?.labor ?? null;
		const recruitmentScore = socialScores?.recruitment ?? null;
		const livingWageScore = socialScores?.livingWage ?? null;

		const formatScore = (score: number | null) =>
			score === null ? "-" : String(score);

		return [
			{
				title: t("socialResponsibility.slides.overallTitle"),
				value: formatScore(overallScore),
				status: overallScore !== null ? toStatus(overallScore) : "medium",
				description: t("socialResponsibility.slides.overallDescription"),
				trend: socialScores?.trends?.overall ?? 0,
			},
			{
				title: t("socialResponsibility.slides.laborTitle"),
				value: formatScore(laborScore),
				status: laborScore !== null ? toStatus(laborScore) : "medium",
				description: t("socialResponsibility.slides.laborDescription"),
				trend: socialScores?.trends?.labor ?? 0,
			},
			{
				title: t("socialResponsibility.slides.recruitmentTitle"),
				value: formatScore(recruitmentScore),
				status:
					recruitmentScore !== null ? toStatus(recruitmentScore) : "medium",
				description: t("socialResponsibility.slides.recruitmentDescription"),
				trend: socialScores?.trends?.recruitment ?? 0,
			},
			{
				title: t("socialResponsibility.slides.wagesTitle"),
				value: formatScore(livingWageScore),
				status: livingWageScore !== null ? toStatus(livingWageScore) : "medium",
				description: t("socialResponsibility.slides.wagesDescription"),
				trend: socialScores?.trends?.livingWage ?? 0,
			},
		];
	}, [socialScores, t]);

	// Top-10 worker-reported labor issues — mirrors PartnerCompanyDashboard's
	// mapping of `top_remediation_kpis`, driven by the filtered workplace stats
	// so it honours the page's supplier/country/industry/date filters.
	const topRisks = useMemo(() => {
		const apiRemediation = (data as any)?.top_remediation_kpis;
		if (Array.isArray(apiRemediation) && apiRemediation.length > 0) {
			return apiRemediation.map((r: any) => {
				const category = r.kpi_category ?? null;
				const grouping = r.kpi_grouping ?? null;
				return {
					issue: grouping || category || "",
					category: t("companyDashboard.topRisks.level", {
						level: r.kpi_level,
					}),
					score:
						r.mean_remediation_quality != null
							? Number(r.mean_remediation_quality)
							: 0,
					isForcedLabor: Number(r.kpi_level) >= 3,
					kpiCategory: category,
					groupings: grouping ? [grouping] : [],
					caseCount:
						r.total_closed_issues != null
							? Number(r.total_closed_issues)
							: undefined,
				};
			});
		}
		// In live (non-mock) mode, an empty API result means the active filters
		// (e.g. country/industry) matched no remediated KPIs — show an empty list
		// rather than falling back to the unfiltered mock, which made the chart
		// look like it ignored the filter.
		if (!shouldUseMockData) {
			return [] as any[];
		}
		return ((companyDashboardMock as any).top5WorkerRisks ?? []) as any[];
	}, [data, t, shouldUseMockData]);

	// Builds a message that names the active filters, so an empty chart/table
	// explains *why* it is empty (e.g. the chosen country) instead of always
	// blaming "the selected suppliers".
	const noDataMessage = useMemo(() => {
		const parts: string[] = [];
		if (debouncedCountries.length > 0) {
			parts.push(
				debouncedCountries.length === 1
					? `${t("socialResponsibility.emptyStates.country")} (${
							countryNameById.get(debouncedCountries[0]) ??
							debouncedCountries[0]
						})`
					: t("socialResponsibility.emptyStates.countries"),
			);
		}
		if (debouncedIndustries.length > 0) {
			parts.push(
				debouncedIndustries.length === 1
					? `${t("socialResponsibility.emptyStates.industry")} (${
							industryNameById.get(debouncedIndustries[0]) ??
							debouncedIndustries[0]
						})`
					: t("socialResponsibility.emptyStates.industries"),
			);
		}
		if (selectedSuppliers.length > 0) {
			parts.push(t("socialResponsibility.emptyStates.suppliers"));
		}
		if (debouncedStartDate || debouncedEndDate) {
			parts.push(t("socialResponsibility.emptyStates.dateRange"));
		}
		if (parts.length === 0) {
			return t("socialResponsibility.emptyStates.noData");
		}
		const filterText =
			parts.length === 1
				? parts[0]
				: `${parts.slice(0, -1).join(", ")} ${t("common.and", {
						defaultValue: "and",
					})} ${parts[parts.length - 1]}`;
		return t("socialResponsibility.emptyStates.noDataForFilters", {
			filters: filterText,
		});
	}, [
		t,
		debouncedCountries,
		debouncedIndustries,
		selectedSuppliers.length,
		debouncedStartDate,
		debouncedEndDate,
	]);

	// Keep guard returns after all hooks so hook order stays stable across renders.
	// Only show full-page loading on the initial supply chain load (no data yet).
	// Filter changes show an inline indicator via `isLoading` prop passed down.
	if (!shouldUseMockData) {
		if (isInitialPageLoading && !data)
			return (
				<GuestLayout>
					<LoadingSpinner
						fullHeight
						subtitle={t("socialResponsibility.filters.updating")}
						title={t("socialResponsibility.states.loading")}
					/>
				</GuestLayout>
			);

		// Only an account with no suppliers at all gets the full-page notice.
		// An empty *filtered* list keeps the page (and its filter bar) mounted so
		// the user can undo the selection — see noSuppliersMatchFilters below.
		if (accountSupplierIds.length === 0) {
			return (
				<GuestLayout>
					<div className="p-xl text-center text-yellow-600">
						<p className="mb-2">
							{t("socialResponsibility.states.noSupplierTitle")}
						</p>
						<p className="text-sm">
							{isGlobalPartner
								? t("socialResponsibility.states.noSupplierForGlobalPartner")
								: t("socialResponsibility.states.contactAdmin")}
						</p>
					</div>
				</GuestLayout>
			);
		}

		if (error && !data)
			return (
				<GuestLayout>
					<div className="p-xl text-center text-[#FB8379]">
						{t("socialResponsibility.states.loadError")}
						{error && <p className="text-sm mt-2">{String(error)}</p>}
					</div>
				</GuestLayout>
			);
	}

	return (
		<GuestLayout>
			{/* Beautiful teal-based header with golden ratio design */}
			<div className="container mx-auto">
				<div className="grid grid-cols-1 md:grid-cols-5 gap-l md:gap-10 lg:gap-12 items-center">
					{/* Left content - takes up 3 parts of golden ratio (approx. 61.8%) */}
					<div className="md:col-span-5 lg:col-span-3 order-2 md:order-1 z-10 text-white my-2 md:my-4 text-center md:text-left">
						<h1 className="heading-display mb-s uppercase tracking-[-0.022em] text-white!">
							{t("socialResponsibility.hero.title")}
						</h1>
						<h3 className="text-base sm:text-lg lg:text-xl font-bold mb-3 sm:mb-4 mx-auto md:mx-0 text-white!">
							{t("socialResponsibility.hero.subtitle")}
						</h3>
						<p className="backdrop-blur text-sm sm:text-base lg:text-lg mx-auto md:mx-0 rounded-lg border-gray-400 p-1 text-gray-200">
							{t("socialResponsibility.hero.description")}
						</p>
					</div>
				</div>
				<div className="relative z-20 my-5 flex gap-m lg:w-1/2 w-full">
					<div className="relative flex flex-col gap-2 rounded-lg border border-[#D2D2D2] bg-white/95 px-6 py-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md w-1/2">
						<InfoTooltip
							buttonClassName="absolute top-2 right-2 text-[#8A979C] hover:text-[#148696] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] rounded-full"
							content={t("socialResponsibility.kpis.cascadeIndexTooltip")}
						/>
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#148696] shadow-sm">
								<BarChartIcon className="h-5 w-5 text-white" />
							</div>
							<p className="font-heading text-3xl font-bold leading-none text-[#004A60]">
								{String(cascadeFinalScore)}
							</p>
						</div>
						<p className="text-xs font-semibold text-[#8A979C] uppercase tracking-wide text-center">
							{t("socialResponsibility.kpis.cascadeIndex")}
						</p>
					</div>
					<div className="flex flex-col gap-2 rounded-lg border border-[#D2D2D2] bg-white/95 px-6 py-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md w-1/2">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#148696] shadow-sm">
								<ChatBubbleIcon className="h-5 w-5 text-white" />
							</div>
							<p className="font-heading text-3xl font-bold leading-none text-[#004A60]">
								{statsData.workerVoiceCoverage.toLocaleString()}
							</p>
						</div>
						<p className="text-xs font-semibold text-[#8A979C] uppercase tracking-wide text-center">
							{t("socialResponsibility.kpis.workerVoiceCoverage")}
						</p>
					</div>
				</div>
			</div>

			<div className={`${styles.container} ${styles.containerPadding}`}>
				<div className="container mx-auto z-10">
					{/* Filters — applies to whole page */}
					<div className="bg-white rounded-md shadow-sm border border-[#D2D2D2] px-5 py-m mb-l flex flex-wrap items-end gap-m">
						{!isSupplier && filteredSupplierOptions.length > 1 && (
							<div className="flex flex-col gap-1">
								<label
									className="text-[11px] font-semibold text-[#8A979C] uppercase tracking-wider"
									htmlFor={supplierFilterId}
								>
									{t("socialResponsibility.filters.supplier")}
								</label>
								<MultiSelect
									id={supplierFilterId}
									onChange={setSelectedSuppliers}
									options={filteredSupplierOptions.filter(
										(o) => o.value !== "",
									)}
									placeholder={t("socialResponsibility.filters.allSuppliers")}
									values={selectedSuppliers}
								/>
							</div>
						)}
						{!isSupplier && (
							<div className="flex flex-col gap-1">
								<label
									className="text-[11px] font-semibold text-[#8A979C] uppercase tracking-wider"
									htmlFor={countryFilterId}
								>
									{t("socialResponsibility.filters.country")}
								</label>
								<MultiSelect
									id={countryFilterId}
									onChange={setSelectedCountries}
									options={filteredCountryOptions}
									placeholder={t("socialResponsibility.filters.allCountries")}
									values={selectedCountries}
								/>
							</div>
						)}
						{!isSupplier && (
							<div className="flex flex-col gap-1">
								<label
									className="text-[11px] font-semibold text-[#8A979C] uppercase tracking-wider"
									htmlFor={industryFilterId}
								>
									{t("socialResponsibility.filters.industry")}
								</label>
								<MultiSelect
									id={industryFilterId}
									onChange={setSelectedIndustries}
									options={filteredIndustryOptions}
									placeholder={t("socialResponsibility.filters.allIndustries")}
									values={selectedIndustries}
								/>
							</div>
						)}
						<div className="flex items-end gap-2">
							<div className="flex flex-col gap-1">
								<label
									className="text-[11px] font-semibold text-[#8A979C] uppercase tracking-wider"
									htmlFor={startDateFilterId}
								>
									{t("socialResponsibility.filters.from")}
								</label>
								<input
									className="text-sm border border-[#D2D2D2] rounded-lg px-3 py-2 bg-gray-50 text-[#56666C] focus:outline-none focus:ring-2 focus:ring-[#148696] focus:bg-white transition"
									id={startDateFilterId}
									max={endDate}
									onChange={(e) => setStartDate(e.target.value)}
									type="date"
									value={startDate}
								/>
							</div>
							<span className="text-gray-300 pb-2">—</span>
							<div className="flex flex-col gap-1">
								<label
									className="text-[11px] font-semibold text-[#8A979C] uppercase tracking-wider"
									htmlFor={endDateFilterId}
								>
									{t("socialResponsibility.filters.to")}
								</label>
								<input
									className="text-sm border border-[#D2D2D2] rounded-lg px-3 py-2 bg-gray-50 text-[#56666C] focus:outline-none focus:ring-2 focus:ring-[#148696] focus:bg-white transition"
									id={endDateFilterId}
									min={startDate}
									onChange={(e) => setEndDate(e.target.value)}
									type="date"
									value={endDate}
								/>
							</div>
						</div>
						<div className="flex items-end gap-3 ml-auto">
							{isAnyRefetching && (
								<div className="flex items-center gap-2 text-xs text-[#148696] pb-2">
									<div className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-[#148696]" />
									<span>{t("socialResponsibility.filters.updating")}</span>
								</div>
							)}
							<button
								className="text-xs font-semibold text-[#8A979C] border border-[#D2D2D2] rounded-lg px-3 py-2 hover:border-[#148696] hover:text-[#148696] transition"
								onClick={() => {
									setSelectedCountries([]);
									setSelectedIndustries([]);
									setSelectedSuppliers([]);
									setStartDate(defaultStart);
									setEndDate(defaultEnd);
								}}
								type="button"
							>
								{t("socialResponsibility.filters.reset")}
							</button>
						</div>
					</div>
					{noSuppliersMatchFilters && (
						<div className="mb-l rounded-md border border-yellow-300 bg-yellow-50 px-5 py-4 text-center text-yellow-700">
							<p className="mb-3 text-sm font-semibold">
								No Suppliers for Filter
							</p>
							<button
								className="text-xs font-semibold text-yellow-700 border border-yellow-400 rounded-lg px-3 py-2 hover:border-[#148696] hover:text-[#148696] transition"
								onClick={() => {
									setSelectedCountries([]);
									setSelectedIndustries([]);
									setSelectedSuppliers([]);
								}}
								type="button"
							>
								{t("socialResponsibility.filters.reset")}
							</button>
						</div>
					)}
					{isAnyRefetching && (
						<div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
							<div className="flex flex-col items-center gap-3 bg-white/90 rounded-2xl px-6 py-5 shadow-lg">
								<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#148696]" />
								<span className="text-sm font-medium text-[#148696]">
									{t("socialResponsibility.filters.updating")}
								</span>
							</div>
						</div>
					)}
					<div
						aria-busy={isAnyRefetching}
						className={
							isAnyRefetching
								? "opacity-50 pointer-events-none transition-opacity duration-200"
								: "transition-opacity duration-200"
						}
					>
						<div className="p-m bg-white rounded px-6 my-4 sm:mb-l shadow-sm">
							<h3 className="heading-display mb-4 pb-1">
								{t("socialResponsibility.sections.overviewSocial")}
							</h3>
							<HumanRightsOverview slides={humanRightsSlides} />
						</div>
						{!(isSupplier || (viewMode as string) === "supplier-view") && (
							<h2 className="heading-display mb-4 pb-1 uppercase">
								{viewMode === "buyer-view"
									? t("socialResponsibility.sections.supplyChainDemographics")
									: t("socialResponsibility.sections.workplaceDemographics")}
							</h2>
						)}
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-m md:gap-l lg:gap-8 mb-8">
							{/* Suppliers by Country Pie Chart (not for supplier users) */}
							{viewMode !== "supplier-view" && (
								<div className={`${styles.chartCard} hover:shadow-lg`}>
									<div className="mb-1 flex flex-wrap gap-2 justify-between items-start sm:items-center">
										<h3 className={"heading-display"}>
											{t("socialResponsibility.sections.suppliersByCountry")}
										</h3>
										<span className="bg-amber-50 text-amber-600 text-xs px-2 py-1 rounded-full font-medium">
											{t("socialResponsibility.tags.demographics")}
										</span>
									</div>
									<p className="text-xs text-[#8A979C] mb-3">
										{t(
											"socialResponsibility.charts.suppliersByCountryDescription",
										)}
									</p>
									<div style={{ height: 300 }}>
										<ReactECharts
											option={buildEChartsPieOption(
												countryData,
												(n: string) => getCountryColor(n),
												t("socialResponsibility.charts.byCountry"),
												"bottom",
											)}
											style={{ height: 300, width: "100%" }}
										/>
									</div>
									<div className={styles.chartFooter}>
										<span className={styles.chartFooterText}>
											{t("socialResponsibility.charts.countriesRepresented", {
												count: countryData.length,
											})}
										</span>
									</div>
								</div>
							)}
							{!(isSupplier || (viewMode as string) === "supplier-view") && (
								<div className={`${styles.chartCard} hover:shadow-lg`}>
									<div className="mb-1 flex flex-wrap gap-2 justify-between items-start sm:items-center">
										<h3 className={"heading-display"}>
											{t("socialResponsibility.sections.workforceByGender")}
										</h3>
										<span className="bg-blue-50 text-[#148696] text-xs px-2 py-1 rounded-full font-medium">
											{t("socialResponsibility.tags.demographics")}
										</span>
									</div>
									<p className="text-xs text-[#8A979C] mb-3">
										{t(
											"socialResponsibility.charts.workforceByGenderDescription",
										)}
									</p>
									{genderData && genderData.length > 0 ? (
										<div style={{ height: 300 }}>
											<ReactECharts
												option={buildEChartsPieOption(
													genderData,
													(n: string) =>
														demographicsData.colors[
															Math.max(
																0,
																Math.min(
																	demographicsData.colors.length - 1,
																	genderData.findIndex((g) => g.name === n),
																),
															)
														],
													t("socialResponsibility.charts.byGender"),
												)}
												style={{ height: 300, width: "100%" }}
											/>
										</div>
									) : (
										<div className="h-72 flex items-center justify-center">
											{demographicsTotal > 0 ? (
												<span className="text-sm text-[#8A979C]">
													{t("socialResponsibility.charts.noGenderData")}
												</span>
											) : (
												<span className="text-sm text-[#8A979C]">
													{t("socialResponsibility.charts.noData")}
												</span>
											)}
										</div>
									)}
									<div className={styles.chartFooter}>
										<span className={styles.chartFooterText}>
											{t("socialResponsibility.charts.totalWorkers", {
												count: demographicsTotal,
											})}
										</span>
									</div>
								</div>
							)}

							{/* Nationality Pie Chart */}
							{!(isSupplier || (viewMode as string) === "supplier-view") && (
								<div className={`${styles.chartCard} hover:shadow-lg`}>
									<div className="mb-1 flex flex-wrap gap-2 justify-between items-start sm:items-center">
										<h3 className={"heading-display"}>
											{t("socialResponsibility.sections.workersByNationality")}
										</h3>
										<span className="bg-teal-50 text-teal-600 text-xs px-2 py-1 rounded-full font-medium">
											{t("socialResponsibility.tags.demographics")}
										</span>
									</div>
									<p className="text-xs text-[#8A979C] mb-3">
										{t(
											"socialResponsibility.charts.workersByNationalityDescription",
										)}
									</p>
									<div style={{ height: 300 }}>
										<ReactECharts
											option={buildEChartsPieOption(
												nationalityData,
												(n: string) => getNationalityColor(n),
												t("socialResponsibility.charts.byNationality"),
											)}
											style={{ height: 300, width: "100%" }}
										/>
									</div>
									<div className={styles.chartFooter}>
										<span className={styles.chartFooterText}>
											{t(
												"socialResponsibility.charts.nationalitiesRepresented",
												{
													count: nationalityData.length,
												},
											)}
										</span>
									</div>
								</div>
							)}

							{/* Country Pie Chart */}
						</div>

						{/* <h2 className="text-xl sm:text-2xl font-semibold mb-4 pb-1 uppercase">
						Worker Feedback Dashboard
					</h2> */}

						{/* Row 1: Cases by Category — full width */}
						{/* <SocialResponsibilityCasesByCategory filters={queryParams} /> */}

						{/* Supply Chain Engagement Table */}
						{!(isSupplier || (viewMode as string) === "supplier-view") && (
							<div
								className={`${styles.chartCard} hover:shadow-lg mt-8 w-full p-l sm:p-xl`}
							>
								<div className="flex items-center gap-2 mb-1">
									<h3 className="heading-display">
										{t("socialResponsibility.sections.supplyChainEngagement")}
									</h3>
									<InfoTooltip
										buttonClassName="text-[#8A979C] hover:text-[#148696] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] rounded-full"
										content={t("socialResponsibility.engagementTable.tooltip")}
									/>
								</div>
								<p className="text-xs text-[#8A979C] mb-4">
									{t("socialResponsibility.engagementTable.description")}
								</p>
								<DataTable
									columns={
										viewMode === "supplier-view"
											? engagementColumns.filter(
													(c) => c.field !== "supplierName",
												)
											: engagementColumns
									}
									pageSize={10}
									rows={supplyChainEngagementRows}
								/>
							</div>
						)}

						{/* Timeline Chart */}

						{(isSupplier || (viewMode as string) === "supplier-view") && (
							<Box
								className={`${styles.chartCard} hover:shadow-lg mt-8 w-full p-l sm:p-xl lg:p-10`}
								mt="8"
							>
								<h3 className="heading-display mb-4 pb-1">
									{t("companyDashboard.timeline.title")}
								</h3>
								<div className="chartCard">
									<SupplierKPITimelineChart
										chartVariant="time"
										compact={true}
										filters={supplierTimelineFilters}
										statusFilterMode={
											isSupplierContext ? "all-only" : "default"
										}
										useMock={shouldUseMockData}
									/>
								</div>
							</Box>
						)}

						<Box
							className={`${styles.chartCard} hover:shadow-lg mt-8 w-full p-l sm:p-xl lg:p-10`}
							mt="8"
						>
							<h3 className="heading-display mb-4 pb-1">
								{t("socialResponsibility.sections.workerVoiceOverview")}
							</h3>
							<div className="chartCard">
								<WorkerVoiceOverview
									emptyMessage={noDataMessage}
									filters={{
										supplierId: supplierIds,
										startDate: debouncedStartDate || null,
										endDate: debouncedEndDate || null,
										country:
											debouncedCountries.length > 0
												? debouncedCountries.join(",")
												: undefined,
										industry:
											debouncedIndustries.length > 0
												? debouncedIndustries.join(",")
												: undefined,
									}}
									useSupplierTerminology={isSupplierContext}
								/>
							</div>
						</Box>

						{/* HRDD charts relocated from the Company Dashboard — buyer/partner (SP) view only */}
						{!(isSupplier || (viewMode as string) === "supplier-view") && (
							<>
								<IssueTreemapSection
									className="mt-4"
									emptyMessage={noDataMessage}
									endTime={debouncedEndDate}
									filters={queryParams}
									startTime={debouncedStartDate}
								/>

								<div className="container mx-auto px-4 mb-6 print-section-break">
									<h2 className="heading-display mb-4 pb-1 uppercase">
										{t("companyDashboard.timeline.title")}
									</h2>
									<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
										<SupplierKPITimelineChart
											filters={supplierTimelineFilters}
											useMock={shouldUseMockData}
										/>
									</div>
								</div>

								<div className="container mx-auto px-4 mb-10 print-section-break">
									<TopRisks emptyMessage={noDataMessage} risks={topRisks} />
								</div>
							</>
						)}

						{/* Issues charts: show only for supplier users and in supplier view mode */}
						{(isSupplier || (viewMode as string) === "supplier-view") && (
							<>
								<div className="mt-8">
									<WorkerIssuesPanel
										description={t(
											"socialResponsibility.workerIssues.commonDescription",
										)}
										items={topCommonIssues}
										title={t("socialResponsibility.sections.topCommonIssues")}
										variant="common"
									/>
								</div>

								<WorkerIssuesPanel
									description={t(
										"socialResponsibility.workerIssues.strengthsDescription",
									)}
									emptyMessage={t(
										"socialResponsibility.workerIssues.noStrengths",
									)}
									items={grievanceStrengths}
									title={t("socialResponsibility.sections.grievanceStrengths")}
									variant="remediation"
								/>

								<WorkerIssuesPanel
									description={t(
										"socialResponsibility.workerIssues.improvementsDescription",
									)}
									emptyMessage={t(
										"socialResponsibility.workerIssues.noImprovements",
									)}
									items={grievanceImprovements}
									title={t(
										"socialResponsibility.sections.grievanceImprovements",
									)}
									variant="remediation"
								/>
							</>
						)}
					</div>
				</div>
			</div>
		</GuestLayout>
	);
}
