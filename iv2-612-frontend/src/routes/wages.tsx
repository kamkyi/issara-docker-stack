import { Box, Card, CardContent } from "@mui/material";
import { GridFilterAltIcon } from "@mui/x-data-grid";
import { useIsFetching } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import moment from "moment";
import { useEffect, useMemo, useState } from "react";

function useDebounce<T>(value: T, delay = 800): T {
	const [debounced, setDebounced] = useState<T>(value);
	useEffect(() => {
		const id = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(id);
	}, [value, delay]);
	return debounced;
}

import wagesMockData from "$src/assets/mock/wages-data.json";
import CascadeButton from "$src/components/button/button";
import CompanyDashboardDateRange from "$src/components/inputs/CompanyDashboardDateRange";
import Selector from "$src/components/inputs/selector";
import CollapsibleDataTable, {
	type CollapsibleColumn,
	type CollapsibleRowData,
} from "$src/components/tables/CollapsibleDataTable";
import FilterColumn, {
	type FilterSection,
} from "$src/components/tables/FilterColumn";
import LoadingSpinner from "$src/components/ui/LoadingSpinner";
import RemediationNotesSummary from "$src/components/ui/RemediationNotesSummary";
import YellowInfoBox from "$src/components/ui/YellowInfoBox";
import { useIndustries, useSubIndustries } from "$src/hooks/useIndustries";
import {
	type SupplierKPIParams,
	useSupplierKPIs,
	useSupplyChains,
} from "$src/hooks/useSupplyChain";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import useAuthData from "$src/store/store.auth";
import { requireGlobalPartnerAuth } from "$src/utils/auth";
import { useMockData } from "$src/utils/config";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";
import {
	CLOSED_QUALITY_LEGENDS,
	KPI_STATUS_LEGENDS,
	kpiUtils,
} from "$src/utils/kpiUtils";
import { refreshMockKPIDates } from "$utils/refreshMockKPIDates";
import { toSpRecommendations } from "$utils/workerReportedKpiTable";

function dedupeKpisByDisplayId<
	T extends { id?: string | number; kpi?: string | number },
>(rows: T[]): T[] {
	const uniqueIds = new Set<string>();

	return rows.filter((row) => {
		const displayId = row.kpi ?? row.id;
		if (displayId === null || displayId === undefined || displayId === "") {
			return false;
		}

		const uniqueKey = String(displayId);
		if (uniqueIds.has(uniqueKey)) {
			return false;
		}

		uniqueIds.add(uniqueKey);
		return true;
	});
}

const getSupplierStatus = (supplier: any): string | undefined =>
	supplier?.status || supplier?.SupplierSupplyChain?.status;

const getSupplierLabel = (supplier: any): string => {
	const name = supplier?.name || supplier?.supplier_name || "Unknown Supplier";
	return getSupplierStatus(supplier) === "inactive"
		? `${name} (inactive)`
		: name;
};

export const Route = createFileRoute("/wages")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireGlobalPartnerAuth({
			isAuthenticated,
			role,
		});
	},
	component: RouteComponent,
});

function RouteComponent() {
	const [filters, setFilters] = useState({
		supplyChains: [] as number[],
		industries: [] as number[],
		subIndustries: [] as number[],
		startTime: "2023-01-01",
		endTime: moment(new Date()).format("YYYY-MM-DD"),
	});
	const pageSize = 5;
	const [userSelectedSuppliers, setUserSelectedSuppliers] = useState<
		number[] | null
	>(null);

	const debouncedFilters = useDebounce(filters);
	const debouncedUserSelectedSuppliers = useDebounce(userSelectedSuppliers);

	// Selected values for Selector components
	const [selectedIndustry, setSelectedIndustry] = useState<number | null>(null);
	const [selectedSubIndustry, setSelectedSubIndustry] = useState<number | null>(
		null,
	);
	const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

	// Main API queries
	const { data: apiSupplyChains = [], isLoading: loadingSupplyChains } =
		useSupplyChains();
	const [selectedSupplyChain, setSelectedSupplyChain] = useState<number | null>(
		null,
	);
	// Read partner id from stored auth user (try several possible field names)
	const authUserRaw = localStorage.getItem("auth_user");
	const authUser = authUserRaw ? JSON.parse(authUserRaw) : {};
	const { role } = useAuthData();
	const { isSupplier, supplierId: supplierIdFromAuth } = getUserIdentifiers();

	// Use mock JSON data instead of staging CMS when env flag is set or role is org-test-user
	const shouldUseMockData = useMockData() || role === "org-test-user";
	const supplyChains = shouldUseMockData
		? (wagesMockData.supplyChains as any[])
		: apiSupplyChains;
	const allMockKPIs: any[] = shouldUseMockData
		? refreshMockKPIDates(wagesMockData.supplierKPIs as any[])
		: [];

	// Use partner ID 28 for mock data (org-test-user or dev mock mode)
	const partnerIdFromUser = shouldUseMockData
		? 28
		: (authUser?.partner ??
			authUser?.partnerId ??
			authUser?.partner_id ??
			null);

	let suppliers: any[] = [];
	let defaultSupplyChainId: number | null = null;

	if (supplyChains && supplyChains.length > 0) {
		if (partnerIdFromUser) {
			// Find supply chains belonging to this partner
			// Staging CMS uses 'strategic_partner', regular API uses 'strategic_partner_id'
			const partnerSupplyChains = supplyChains.filter(
				(sc: any) =>
					sc.strategic_partner === partnerIdFromUser ||
					sc.strategic_partner_id === partnerIdFromUser ||
					sc.partner_id === partnerIdFromUser,
			);

			if (partnerSupplyChains.length > 0) {
				defaultSupplyChainId = partnerSupplyChains[0].id;
				partnerSupplyChains.forEach((sc: any) => {
					if (sc.suppliers && Array.isArray(sc.suppliers)) {
						suppliers = suppliers.concat(sc.suppliers);
					}
				});
			}
		} else {
			// Default fallback if no specific partner ID
			defaultSupplyChainId = supplyChains[1]?.id || supplyChains[0]?.id || null;
			suppliers =
				supplyChains.find((sc: any) => sc.id === defaultSupplyChainId)
					?.suppliers || [];
		}
	}

	// Remove duplicates
	const uniqueSupplierIds = new Set();
	suppliers = suppliers.filter((s: any) => {
		const id = s.id || s.supplier;
		if (!id || uniqueSupplierIds.has(id)) return false;
		uniqueSupplierIds.add(id);
		return true;
	});

	// For supplier users, bypass supply chain logic and use their own ID directly
	if (isSupplier && supplierIdFromAuth) {
		suppliers = [{ id: supplierIdFromAuth }];
	}

	const allSupplierIds = useMemo(
		() => suppliers.map((s) => s.id || s.supplier),
		[suppliers],
	);

	// Get suppliers based on selected supply chain or all suppliers
	const availableSuppliers = useMemo(() => {
		if (selectedSupplyChain) {
			const selectedSupplyChainData = supplyChains.find(
				(sc: any) => sc.id === selectedSupplyChain,
			);
			return selectedSupplyChainData?.suppliers || [];
		}
		return suppliers;
	}, [selectedSupplyChain, supplyChains, suppliers]);

	const countryFilteredAllSupplierIds = useMemo(() => {
		if (selectedCountries.length === 0)
			return availableSuppliers.map((s: any) => s.id || s.supplier);
		return availableSuppliers
			.filter((s: any) => {
				const c =
					s.country_name || (typeof s.country === "string" ? s.country : null);
				return c && selectedCountries.includes(c);
			})
			.map((s: any) => s.id || s.supplier);
	}, [availableSuppliers, selectedCountries]);

	const supplierIds = useMemo(() => {
		const base =
			userSelectedSuppliers ??
			availableSuppliers.map((s: any) => s.id || s.supplier);
		if (selectedCountries.length === 0) return base;
		const countrySet = new Set(countryFilteredAllSupplierIds);
		return base.filter((id: number) => countrySet.has(id));
	}, [
		userSelectedSuppliers,
		availableSuppliers,
		selectedCountries,
		countryFilteredAllSupplierIds,
	]);

	const debouncedSupplierIds = useMemo(() => {
		const base =
			debouncedUserSelectedSuppliers ??
			availableSuppliers.map((s: any) => s.id || s.supplier);
		if (selectedCountries.length === 0) return base;
		const countrySet = new Set(countryFilteredAllSupplierIds);
		return base.filter((id: number) => countrySet.has(id));
	}, [
		debouncedUserSelectedSuppliers,
		availableSuppliers,
		selectedCountries,
		countryFilteredAllSupplierIds,
	]);

	const debouncedNormalizedSupplierIds = useMemo(() => {
		const list = debouncedSupplierIds || [];
		if (!Array.isArray(list)) return [];
		return list.filter((s) => s !== null && s !== undefined && s !== "");
	}, [debouncedSupplierIds]);

	// Automatically select the supply chain if there's exactly 1 belonging to the partner
	useEffect(() => {
		if (isSupplier) return;
		if (supplyChains.length > 0 && selectedSupplyChain === null) {
			let partnerSupplyChains = supplyChains;
			if (partnerIdFromUser) {
				// Staging CMS uses 'strategic_partner', regular API uses 'strategic_partner_id'
				partnerSupplyChains = supplyChains.filter(
					(sc: any) =>
						sc.strategic_partner === partnerIdFromUser ||
						sc.strategic_partner_id === partnerIdFromUser ||
						sc.partner_id === partnerIdFromUser,
				);
			}

			if (partnerSupplyChains.length === 1) {
				const singleSc = partnerSupplyChains[0];
				setSelectedSupplyChain(singleSc.id);
				setFilters((prev) => ({
					...prev,
					supplyChains: [singleSc.id],
				}));

				const singleAllSupplierIds =
					singleSc.suppliers?.map((s: any) => s.id || s.supplier) || [];
				setUserSelectedSuppliers(singleAllSupplierIds);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [supplyChains]);

	// Fallback: auto-select a default supply chain when mock data is present
	useEffect(() => {
		if (isSupplier) return;
		if (!selectedSupplyChain && supplyChains && supplyChains.length > 0) {
			const defaultId = (defaultSupplyChainId as number) || supplyChains[0]?.id;
			if (defaultId) {
				setSelectedSupplyChain(defaultId);
				setFilters((prev) => ({ ...prev, supplyChains: [defaultId] }));
				const sc = supplyChains.find((s: any) => s.id === defaultId);
				const ids = sc?.suppliers?.map((s: any) => s.id || s.supplier) || [];
				setUserSelectedSuppliers(ids);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [supplyChains]);

	const { data: industries = [] } = useIndustries();
	const { data: subIndustries = [] } = useSubIndustries();
	const selectedIndustryName = useMemo(
		() => industries.find((industry) => industry.id === selectedIndustry)?.name,
		[industries, selectedIndustry],
	);
	// const { data: strategicPartners = [], isLoading: loadingPartners, isFetching: fetchingPartners } = useStrategicPartners()

	// Only run KPI queries when allSupplierIds is available and non-empty
	const supplierKPIParams: SupplierKPIParams | undefined = useMemo(() => {
		if (!allSupplierIds || allSupplierIds.length === 0) return undefined;
		return {
			suppliers: debouncedNormalizedSupplierIds,
			opened_at_range_after: debouncedFilters.startTime || undefined,
			opened_at_range_before: debouncedFilters.endTime || undefined,
			has_cases: true,
			show_closed: true,
			industry: selectedIndustryName,
		};
	}, [
		allSupplierIds,
		debouncedNormalizedSupplierIds,
		debouncedFilters,
		selectedIndustryName,
	]);

	const closedViolationsParams: SupplierKPIParams | undefined = useMemo(() => {
		if (!allSupplierIds || allSupplierIds.length === 0) return undefined;
		return {
			suppliers: debouncedNormalizedSupplierIds,
			opened_at_range_after: debouncedFilters.startTime || undefined,
			opened_at_range_before: debouncedFilters.endTime || undefined,
			has_cases: true,
			show_closed: true,
			ordering: "-closed_at",
			industry: selectedIndustryName,
		};
	}, [
		allSupplierIds,
		debouncedNormalizedSupplierIds,
		debouncedFilters.startTime,
		debouncedFilters.endTime,
		selectedIndustryName,
	]);

	const { isLoading: loadingKPIs, error: kpiError } =
		useSupplierKPIs(supplierKPIParams);
	// const {
	// 	data: supplierKPIData2 = { results: [], count: 0 },
	// 	isLoading: loadingKPIs2,
	// 	error: kpiError2,
	// } = useSupplierKPIs(supplierKPIParams2);
	const { isLoading: loadingClosedViolations } = useSupplierKPIs(
		closedViolationsParams,
	);

	const paymentSystemsParams: SupplierKPIParams | undefined = useMemo(() => {
		if (!allSupplierIds || allSupplierIds.length === 0) return undefined;
		return {
			suppliers: debouncedNormalizedSupplierIds,
			opened_at_range_after: debouncedFilters.startTime || undefined,
			opened_at_range_before: debouncedFilters.endTime || undefined,
			has_cases: true,
			show_closed: false,
			kpi__kpi_category: "Wages",
			industry: selectedIndustryName,
		};
	}, [
		allSupplierIds,
		debouncedNormalizedSupplierIds,
		debouncedFilters,
		selectedIndustryName,
	]);

	const paymentSystemsParamsClosed: SupplierKPIParams | undefined =
		useMemo(() => {
			if (!allSupplierIds || allSupplierIds.length === 0) return undefined;
			return {
				suppliers: debouncedNormalizedSupplierIds,
				opened_at_range_after: debouncedFilters.startTime || undefined,
				opened_at_range_before: debouncedFilters.endTime || undefined,
				has_cases: true,
				show_closed: true,
				kpi__kpi_category: "Wages",
				industry: selectedIndustryName,
			};
		}, [
			allSupplierIds,
			debouncedNormalizedSupplierIds,
			debouncedFilters,
			selectedIndustryName,
		]);

	const isDateWithinRange = (date?: string | null) => {
		if (!date) return false;
		const dateTime = new Date(date).getTime();
		if (Number.isNaN(dateTime)) return false;
		const startTime = new Date(debouncedFilters.startTime).getTime();
		const endTime = new Date(debouncedFilters.endTime).getTime();
		return dateTime >= startTime && dateTime <= endTime;
	};

	// Individual hook calls for each category

	const {
		data: paymentSystemsData = { results: [], count: 0 },
		isLoading: loadingPaymentSystems,
		error: errorPaymentSystems,
	} = useSupplierKPIs(paymentSystemsParams);
	const { data: paymentSystemsDataClosed = { results: [], count: 0 } } =
		useSupplierKPIs(paymentSystemsParamsClosed);

	// Extract results arrays for backward compatibility
	const paymentSystemsKPIs = (
		shouldUseMockData
			? allMockKPIs.filter((k) => k.category === "Wages")
			: paymentSystemsData.results
	).filter((kpi) => {
		// Exclude KPIs marked hidden
		return !(kpi && (kpi.hide === true || kpi.hide === "true"));
	});
	// Combine all category data
	const categoryData = useMemo(
		() => ({
			Wages: paymentSystemsKPIs,
		}),
		[paymentSystemsKPIs],
	);
	// Check if any category queries are loading
	const loadingCategoryData = loadingPaymentSystems;

	if (kpiError) {
		console.error("KPI API error:", kpiError);
	}

	const uniqueCountries = useMemo(() => {
		const countries = new Set<string>();
		availableSuppliers?.forEach((s: any) => {
			const c =
				s.country_name || (typeof s.country === "string" ? s.country : null);
			if (c) countries.add(c);
		});
		return Array.from(countries).sort();
	}, [availableSuppliers]);

	const countryFilteredSuppliers = useMemo(() => {
		if (selectedCountries.length === 0) return availableSuppliers || [];
		return (availableSuppliers || []).filter((s: any) => {
			const c =
				s.country_name || (typeof s.country === "string" ? s.country : null);
			return c && selectedCountries.includes(c);
		});
	}, [availableSuppliers, selectedCountries]);

	const supplierSections: FilterSection[] = [
		{
			title: "",
			options:
				countryFilteredSuppliers?.map((supplier: any) => ({
					id: supplier?.id || supplier?.supplier,
					label: getSupplierLabel(supplier),
					value: supplier?.id || supplier?.supplier,
				})) || [],
			selectedIds: supplierIds,
			onChange: (selectedIds: (string | number)[]) => {
				setUserSelectedSuppliers(selectedIds as number[]);
			},
		},
	];

	const getDaysActive = (openedAt: string): number =>
		kpiUtils.getDaysActive(openedAt);

	const getStatusColor = (daysActive: number, statusId: number): string =>
		kpiUtils.getStatusColor(daysActive, statusId);

	const getStatusString = (daysActive: number, statusId: number): string =>
		kpiUtils.getStatusString(daysActive, statusId);

	const getResultsText = (row: CollapsibleRowData): string => {
		const rowData = row as Record<string, unknown>;
		const candidates = [
			rowData.remediation_results,
			rowData.results,
			rowData.remediation_result,
		];

		for (const value of candidates) {
			if (typeof value === "string" && value.trim().length > 0) {
				return value.trim();
			}
		}

		return "";
	};

	const renderOpenKpiExpandedContent = (row: CollapsibleRowData) =>
		(() => {
			const recommendations = toSpRecommendations(
				row.remediation_sp_recommendation,
			);
			const resultsText = getResultsText(row);

			return (
				<Box sx={{ p: 1 }}>
					<div className="text-lg font-bold mb-3">Wages Violation Details</div>
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2 text-sm">
							<div>
								<strong>KPI ID:</strong> {row.id}
							</div>
							<div>
								<strong>Supplier:</strong> {row.supplier_name || "N/A"}
							</div>
							<div>
								<strong>Category:</strong> {row.category || "N/A"}
							</div>
							<div>
								<strong>Status:</strong> {row.status_name || "N/A"}
							</div>
							<div>
								<strong>Opened:</strong>{" "}
								{row.opened_at
									? format(new Date(row.opened_at), "yyyy-MM-dd")
									: "N/A"}
							</div>
							<div>
								<strong>Days Active:</strong> {row.days_active ?? "N/A"}
							</div>
						</div>
						<div className="space-y-2 text-sm">
							<div>
								<strong>Level:</strong> {row.level || "N/A"}
							</div>
							<div>
								<strong>Affected Workers:</strong>{" "}
								{kpiUtils.getAffectedWorkersRangeForSupplier(
									row.affected_workers as number | null | undefined,
								)}
							</div>
						</div>
					</div>
					<div className="mt-4 text-sm">
						<strong>Description:</strong>
						<p className="mt-1 whitespace-pre-wrap">
							{row.description || "N/A"}
						</p>
					</div>
					<RemediationNotesSummary
						action={row.remediation_action}
						issues={row.remediation_notes}
						result={resultsText}
						spRecommendations={recommendations}
						workerValidation={row.remediation_validation}
					/>
				</Box>
			);
		})();

	const renderClosedKpiExpandedContent = (row: CollapsibleRowData) => {
		const recommendations = toSpRecommendations(
			row.remediation_sp_recommendation,
		);
		const resultsText = getResultsText(row);

		return (
			<Box sx={{ p: 1 }}>
				<div className="text-lg font-bold mb-3">
					Closed Wages Violation Details
				</div>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-2 text-sm">
						<div>
							<strong>KPI ID:</strong> {row.id}
						</div>
						<div>
							<strong>Supplier:</strong> {row.supplier_name || "N/A"}
						</div>
						<div>
							<strong>Category:</strong>{" "}
							{row.original_category || row.category || "N/A"}
						</div>
						<div>
							<strong>Opened:</strong>{" "}
							{row.opened_at
								? format(new Date(row.opened_at), "yyyy-MM-dd")
								: "N/A"}
						</div>
						<div>
							<strong>Closed:</strong>{" "}
							{row.closed_at
								? format(new Date(row.closed_at), "yyyy-MM-dd")
								: "N/A"}
						</div>
						<div>
							<strong>Status:</strong> {row.status_name || "Closed"}
						</div>
					</div>
					<div className="space-y-2 text-sm">
						<div>
							<strong>Level:</strong> {row.level || "N/A"}
						</div>
						<div>
							<strong>Affected Workers:</strong>{" "}
							{kpiUtils.getAffectedWorkersRangeForSupplier(
								row.affected_workers as number | null | undefined,
							)}
						</div>
						<div>
							<strong>Remediation Outcome:</strong>{" "}
							{row.closed_quality || "N/A"}
						</div>
					</div>
				</div>
				<div className="mt-4 text-sm">
					<strong>Description:</strong>
					<p className="mt-1 whitespace-pre-wrap">{row.description || "N/A"}</p>
				</div>
				<RemediationNotesSummary
					action={row.remediation_action}
					issues={row.remediation_notes}
					result={resultsText}
					spRecommendations={recommendations}
					workerValidation={row.remediation_validation}
				/>
			</Box>
		);
	};

	// True whenever any supplierKPIs query is in flight (works with keepPreviousData)
	const fetchingCount = useIsFetching({ queryKey: ["supplierKPIs"] });
	const isRefetching = !shouldUseMockData && fetchingCount > 0;

	// Comprehensive loading check - wait for all API calls to complete
	const isLoading =
		!shouldUseMockData &&
		(loadingKPIs ||
			loadingSupplyChains ||
			// loadingPartners ||
			loadingCategoryData ||
			loadingPaymentSystems);

	// Only block render on the very first load (no supply chains yet)
	if (
		!shouldUseMockData &&
		!isSupplier &&
		loadingSupplyChains &&
		supplyChains.length === 0
	) {
		return (
			<GuestLayout>
				<div className="flex flex-col justify-center items-center h-[70vh]">
					<LoadingSpinner
						subtitle={"Fetching KPIs, suppliers, and category data"}
						title={"Loading supply chain data..."}
					/>
				</div>
			</GuestLayout>
		);
	}

	// Check for critical errors that would prevent rendering
	const hasErrors = !shouldUseMockData && (kpiError || errorPaymentSystems);

	if (hasErrors) {
		return (
			<GuestLayout>
				<div className="flex flex-col justify-center items-center h-[70vh]">
					<p className="text-red-500 text-lg mb-4">
						Error loading supply chain data
					</p>
					<p className="text-sm text-gray-600">
						Please refresh the page or contact support if the issue persists.
					</p>
				</div>
			</GuestLayout>
		);
	}

	// Prevent rendering without essential data
	const hasEssentialData =
		shouldUseMockData || isSupplier || supplyChains?.length > 0;

	if (!isLoading && !hasEssentialData) {
		return (
			<GuestLayout>
				<div className="flex flex-col justify-center items-center h-[70vh]">
					<p className="text-gray-500 text-lg mb-4">
						No supply chain data available
					</p>
					<p className="text-sm text-gray-600">
						Please check your filters or contact support if you expect to see
						data here.
					</p>
				</div>
			</GuestLayout>
		);
	}

	return (
		<GuestLayout>
			{false && role === "org-test-user" && (
				<YellowInfoBox
					expanded={
						<p className="mb-2">
							The idea here is to give companies one step deeper insights on
							their social and environmental metrics, following from the Company
							Overview page. This is very much a work in progress since it's
							currently very social heavy, and much of this info should be moved
							to under the Social Responsibility tab. So for now what would be
							good is for us NGO partners to ideate and agree on what info would
							be good to highlight here, both social and environmental. Put your
							comments in the <strong>Got Feedback?</strong> tab! As many as you
							want. We can also have some calls for ideation if that is
							convenient.
						</p>
					}
					summary={
						<span>
							The idea here is to give companies one step deeper insights on
							their social and environmental metrics,
						</span>
					}
				/>
			)}
			<div className="container mx-auto px-l py-xl">
				<h1 className="mb-xl font-black uppercase tracking-[-0.022em]">
					Social Responsibility - Wages
				</h1>

				<div className="flex items-center gap-4 flex-wrap text-sm mb-1">
					{!isSupplier && (
						<div className="flex items-center gap-2 border-r pe-2">
							<GridFilterAltIcon className="w-5 h-5 text-[#148696]" />
							<span className="font-semibold">Filters</span>
						</div>
					)}

					<div
						className={`flex grow items-center my-2 ${!isSupplier ? "justify-between" : ""}`}
					>
						{!isSupplier && (
							<div className="flex gap-4 items-center">
								{!isSupplier && (
									<Selector
										allLabel="Supply Chain"
										id={"supply-chain-selector"}
										onChange={(value) => {
											setSelectedSupplyChain(value as number);

											const selectedSupplyChainData = supplyChains.find(
												(sc: any) => sc.id === value,
											);
											const allSupplierIds =
												selectedSupplyChainData?.suppliers?.map(
													(s: any) => s.id || s.supplier,
												) || [];

											setFilters((prev) => ({
												...prev,
												supplyChains: value ? [value as number] : [],
											}));
											setUserSelectedSuppliers(value ? allSupplierIds : []);
										}}
										options={
											partnerIdFromUser
												? supplyChains
														.filter(
															(sc: any) =>
																sc.strategic_partner === partnerIdFromUser ||
																sc.strategic_partner_id === partnerIdFromUser ||
																sc.partner_id === partnerIdFromUser,
														)
														.map((sc: any) => ({
															value: sc.id,
															label: sc.name,
														}))
												: supplyChains.map((sc: any) => ({
														value: sc.id,
														label: sc.name,
													}))
										}
										value={selectedSupplyChain ?? undefined}
									/>
								)}
								{!isSupplier && (
									<Selector
										allLabel="Industries"
										id={"industries-selector"}
										onChange={(value) => {
											setSelectedIndustry(value as number);
											setFilters((prev) => ({
												...prev,
												industries: value ? [value as number] : [],
											}));
										}}
										options={industries?.map((industry) => ({
											value: industry?.id,
											label: industry.name,
										}))}
										value={selectedIndustry ?? undefined}
									/>
								)}
								{!isSupplier && (
									<Selector
										allLabel="Sub-Industries"
										id={"sub-industries-selector"}
										onChange={(value) => {
											setSelectedSubIndustry(value as number);
											setFilters((prev) => ({
												...prev,
												subIndustries: value ? [value as number] : [],
											}));
										}}
										options={subIndustries?.map((subIndustry) => ({
											value: subIndustry?.id,
											label: subIndustry.name,
										}))}
										value={selectedSubIndustry ?? undefined}
									/>
								)}
								{!isSupplier && uniqueCountries.length > 0 && (
									<Selector
										allLabel="Country"
										id={"country-selector"}
										onChange={(value) => {
											setSelectedCountries(value ? [value as string] : []);
										}}
										options={uniqueCountries.map((c) => ({
											value: c,
											label: c,
										}))}
										value={
											selectedCountries.length === 1
												? selectedCountries[0]
												: undefined
										}
									/>
								)}
								<CascadeButton
									buttonText={"Clear Filters"}
									handleOnClick={() => {
										const currentSupplierIds = allSupplierIds;

										// Reset all filters to initial state
										setFilters({
											supplyChains: selectedSupplyChain
												? [selectedSupplyChain]
												: [],
											industries: [],
											subIndustries: [],
											startTime: "2022-01-01",
											endTime: moment(new Date()).format("YYYY-MM-DD"),
										});
										setUserSelectedSuppliers(currentSupplierIds);

										// Reset selected values
										setSelectedIndustry(null);
										setSelectedSubIndustry(null);
										setSelectedCountries([]);
									}}
									size={"2"}
								/>
							</div>
						)}

						<div className="z-40">
							<CompanyDashboardDateRange
								endTime={filters.endTime}
								formatDate={(date) => format(date, "yyyy MMM dd")}
								onChange={({ startTime, endTime }) => {
									setFilters((prev) => ({
										...prev,
										startTime,
										endTime,
									}));
								}}
								startTime={filters.startTime}
							/>
							<p className="mt-1 text-xs text-gray-500">
								Data starts from 2023
							</p>
						</div>
					</div>
				</div>

				{isRefetching && (
					<div className="flex items-center gap-2 text-xs text-[#148696] mb-3 -mt-1">
						<span className="inline-block w-3 h-3 border-2 border-[#148696] border-t-transparent rounded-full animate-spin" />
						<span>Fetching latest data…</span>
					</div>
				)}

				{!selectedSupplyChain && !isSupplier ? (
					<NoSupplyChain />
				) : (
					<>
						<div className="grid grid-cols-3 gap-4">
							{!isSupplier && (
								<div className="col-span-3 md:col-span-1">
									<div className="lg:sticky lg:top-6">
										<FilterColumn
											sections={supplierSections}
											title="Suppliers"
										/>
									</div>
								</div>
							)}

							<div
								className={`col-span-3 ${isSupplier ? "" : "md:col-span-2"}`}
							>
								{/* Summary Cards */}
								<Box
									sx={{
										display: "grid",
										gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
										gap: 2,
										mb: 2,
									}}
								>
									<Card className="card-radius h-[100px]">
										<CardContent sx={{ textAlign: "center" }}>
											<p className="text-xl">{supplierIds.length}</p>
											<p>Total Suppliers</p>
										</CardContent>
									</Card>
									<Card className="card-radius h-[100px]">
										<CardContent sx={{ textAlign: "center" }}>
											<p className="text-yellow-500 text-xl">
												{
													categoryData.Wages?.filter(
														(kpi) => getDaysActive(kpi.opened_at) >= 60,
													)?.length
												}
											</p>
											<p color="text.secondary">
												Critical{" "}
												<span className="text-xs text-gray-500 mt-1">
													(60+ days)
												</span>
											</p>
										</CardContent>
									</Card>
									<Card className="card-radius h-[100px]">
										<CardContent sx={{ textAlign: "center" }}>
											<p className="text-xl">
												{(() => {
													let wagesOpen = 0;
													let wagesClosed = 0;
													if (shouldUseMockData) {
														wagesOpen = allMockKPIs.filter(
															(k) => k.status === 1 || k.status === 2,
														).length;
														wagesClosed = allMockKPIs.filter(
															(k) => k.status === 3 || k.status === 4,
														).length;
													} else {
														wagesOpen = dedupeKpisByDisplayId(
															categoryData.Wages?.filter(
																(kpi) => kpi.status === 1 || kpi.status === 2,
															) ?? [],
														).length;
														wagesClosed = dedupeKpisByDisplayId(
															(paymentSystemsDataClosed.results || [])
																.filter(
																	(kpi) => kpi.status === 3 || kpi.status === 4,
																)
																.filter((kpi) =>
																	isDateWithinRange(kpi.opened_at),
																),
														).length;
													}
													return (
														Math.round(
															(wagesClosed / (wagesOpen + wagesClosed)) * 100,
														) || 0
													);
												})()}%
											</p>
											<p color="text.secondary">
												Resolution Rate{" "}
												<span className="text-xs text-gray-500 mt-1">
													(% of cases closed)
												</span>
											</p>
										</CardContent>
									</Card>
								</Box>

								<div className="space-y-4">
									<Box sx={{ display: "flex", gap: 4, mb: 4 }}>
										{(() => {
											const wagesOpen = dedupeKpisByDisplayId(
												categoryData.Wages?.filter(
													(kpi) => kpi.status === 1 || kpi.status === 2,
												) ?? [],
											).length;
											const wagesClosed = shouldUseMockData
												? allMockKPIs.filter(
														(k) => k.status === 3 || k.status === 4,
													).length
												: dedupeKpisByDisplayId(
														(paymentSystemsDataClosed.results || [])
															.filter(
																(kpi) => kpi.status === 3 || kpi.status === 4,
															)
															.filter((kpi) =>
																isDateWithinRange(kpi.opened_at),
															),
													).length;
											return (
												<>
													<Card
														className="card-radius"
														sx={{ flex: 1, textAlign: "center", py: 4 }}
													>
														<div
															className="text-5xl font-black"
															style={{ color: "#F59E42" }}
														>
															{wagesOpen}
														</div>
														<div
															className="text-lg font-semibold mt-2"
															style={{ color: "#B45309" }}
														>
															Open Wages Issues
														</div>
													</Card>
													<Card
														className="card-radius"
														sx={{ flex: 1, textAlign: "center", py: 4 }}
													>
														<div
															className="text-5xl font-black"
															style={{ color: "#10B981" }}
														>
															{wagesClosed}
														</div>
														<div
															className="text-lg font-semibold mt-2"
															style={{ color: "#065F46" }}
														>
															Closed Wages Issues
														</div>
													</Card>
												</>
											);
										})()}
									</Box>
								</div>
							</div>
							{/* KPI Categories Collapsible Tables */}
						</div>
						<div className="my-4">
							<p className="text-xl font-bold"></p>
							<p className="text-sm mt-2">
								Worker reported Wages violations below are organized into the
								main KPI category. These map to and expand upon internationally
								recognized types of wage and payment issues.
							</p>
						</div>
						<div className="grid grid-cols-1 gap-4">
							{/* Only show KPIs from Wages category in the table */}
							{(() => {
								// Use 'Wages' as the category name for UI
								const wagesKPIs = categoryData.Wages?.filter(
									(kpi) => kpi.status === 1 || kpi.status === 2,
								);

								const categoryColumns: CollapsibleColumn[] = [
									{
										id: "id",
										label: "ID",
										minWidth: 80,
										align: "center",
										sortable: true,
									},
									{
										id: "supplier_name",
										label: "Supplier",
										minWidth: 150,
										sortable: true,
									},
									{
										id: "description",
										label: "Description",
										minWidth: 250,
										format: (value) =>
											value?.length > 60
												? `${value.substring(0, 60)}...`
												: value,
									},
									{
										id: "level",
										label: "Level",
										minWidth: 80,
										align: "center",
									},
									{
										id: "days_active",
										label: "Days Active",
										minWidth: 100,
										align: "right",
										sortable: true,
									},
									{
										id: "affected_workers",
										label: "Affected",
										minWidth: 130,
										align: "right",
										sortable: true,
										format: (value) =>
											kpiUtils.getAffectedWorkersRangeForSupplier(
												value as number | null | undefined,
											),
									},
									{
										id: "remediation_sp_recommendation",
										label: "Recommendation for SP",
										minWidth: 160,
										format: (value) => {
											const hasRecommendations = Array.isArray(value)
												? value.length > 0
												: Boolean(value);
											return hasRecommendations ? "Yes" : "";
										},
									},
									{
										id: "status_display",
										label: "Status",
										minWidth: 120,
										searchValue: (row) => row.status_text,
									},
								];
								const uniqueWagesKPIs = dedupeKpisByDisplayId(wagesKPIs);
								const sortedOpenKPIs = [...uniqueWagesKPIs].sort(
									(a, b) =>
										new Date(b.opened_at).getTime() -
										new Date(a.opened_at).getTime(),
								);
								const categoryRows: CollapsibleRowData[] = sortedOpenKPIs.map(
									(kpi) => {
										const daysActive = getDaysActive(kpi.opened_at);
										const statusText = getStatusString(daysActive, kpi.status);
										const color = getStatusColor(daysActive, kpi.status);
										return {
											...kpi,
											// Show the KPI identifier (supplier_kpi_id returned as `kpi` from the API).
											id: (kpi as any)?.kpi ?? kpi?.id,
											days_active: daysActive,
											affected_workers: kpi.affected_workers || 0,
											call_count: kpi.call_count || 0,
											expandedContent: renderOpenKpiExpandedContent,
											status_text: statusText,
											status_display: (
												<div
													className="w-3 h-3 rounded-full"
													style={{ background: color }}
													title={statusText}
												/>
											),
										};
									},
								);
								return (
									<CollapsibleDataTable
										columnSearchEnabled={true}
										columns={categoryColumns}
										dense={false}
										expandAllButton={true}
										maxHeight={500}
										pageSize={pageSize}
										rows={categoryRows}
										statusLegends={[...KPI_STATUS_LEGENDS]}
										stickyHeader={true}
										title={`Open Worker-Reported Violations (Wages)(${categoryRows.length} issues)`}
										totalCount={categoryRows.length}
									/>
								);
							})()}
						</div>
					</>
				)}
				<div className="text-lg font-bold my-4">
					<br />
				</div>

				{/* Only show closed KPIs from Wages category */}
				{(() => {
					// Use the same filtering logic as the summary card for closed payment issues
					// Use the API data for closed payment systems KPIs for accuracy
					// Use 'Wages' as the category name for UI
					const wagesClosedKPIs = shouldUseMockData
						? allMockKPIs.filter((k) => k.status === 3 || k.status === 4)
						: (paymentSystemsDataClosed.results || [])
								.filter((kpi) => kpi.status === 3 || kpi.status === 4)
								.filter((kpi) => isDateWithinRange(kpi.opened_at));

					const closedColumns: CollapsibleColumn[] = [
						{ id: "id", label: "ID", minWidth: 80, sortable: true },
						{
							id: "supplier_name",
							label: "Supplier",
							minWidth: 200,
							sortable: true,
						},
						{ id: "category", label: "Category", minWidth: 80, sortable: true },
						{ id: "description", label: "Description", minWidth: 300 },
						{
							id: "remediation_sp_recommendation",
							label: "Recommendation for SP",
							minWidth: 150,
							format: (value) => {
								const hasRecommendations = Array.isArray(value)
									? value.length > 0
									: Boolean(value);
								return hasRecommendations ? "Yes" : "";
							},
						},
						{ id: "level", label: "Level (1-4)", minWidth: 80, sortable: true },
						{
							id: "opened_at",
							label: "Opened",
							minWidth: 120,
							sortable: true,
							format: (value) =>
								value ? format(new Date(value), "yyyy-MM-dd") : "",
						},
						{
							id: "closed_at",
							label: "Closed",
							minWidth: 120,
							sortable: true,
							format: (value) =>
								value ? format(new Date(value), "yyyy-MM-dd") : "",
						},
						{
							id: "affected_workers",
							label: "Affected",
							minWidth: 130,
							align: "right",
							sortable: true,
							format: (value) =>
								kpiUtils.getAffectedWorkersRangeForSupplier(
									value as number | null | undefined,
								),
						},
						{
							id: "closed_quality",
							label: "Remediation Outcome",
							minWidth: 120,
							format: (value) => {
								const quality = value?.toLowerCase();
								let color = "#9CA3AF"; // Unresolved - Grey
								if (quality === "poor") color = "#EF4444";
								else if (quality === "fair") color = "#F97316";
								else if (quality === "good") color = "#EAB308";
								else if (quality === "excellent") color = "#22C55E";
								return (
									<div
										className="h-3 w-3 rounded-full"
										style={{ background: color }}
										title={value}
									/>
								);
							},
						},
					];
					// For mock data, use raw closed wage KPIs (no dedupe/grouping)
					const closedRows: CollapsibleRowData[] = shouldUseMockData
						? wagesClosedKPIs.map((kpi) => ({
								...kpi,
								id: (kpi as any)?.kpi ?? kpi?.id,
								original_category: kpi.category,
								category: "Wages",
								affected_workers: kpi.affected_workers || 0,
								expandedContent: renderClosedKpiExpandedContent,
							}))
						: dedupeKpisByDisplayId(wagesClosedKPIs).map((kpi) => ({
								...kpi,
								id: (kpi as any)?.kpi ?? kpi?.id,
								original_category: kpi.category,
								category: "Wages",
								affected_workers: kpi.affected_workers || 0,
								expandedContent: renderClosedKpiExpandedContent,
							}));
					return (
						<CollapsibleDataTable
							columnSearchEnabled={true}
							columns={closedColumns}
							defaultExpanded={false}
							dense={false}
							expandAllButton={true}
							isLoading={loadingClosedViolations}
							maxHeight={600}
							pageSize={pageSize}
							rows={closedRows}
							statusLegends={[...CLOSED_QUALITY_LEGENDS]}
							stickyHeader={true}
							title={`Closed Worker-Reported Violations (Wages) (${closedRows.length} issues)`}
							totalCount={closedRows.length}
						/>
					);
				})()}
			</div>
		</GuestLayout>
	);
}

const NoSupplyChain = () => {
	return (
		<div className="flex flex-col justify-center items-center h-[70vh]">
			<p className="text-gray-500 text-lg mb-4">
				Please select a Supply Chain.
			</p>
		</div>
	);
};
