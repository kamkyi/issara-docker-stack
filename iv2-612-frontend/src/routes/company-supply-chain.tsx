import { Box, Card, CardContent, Chip, Tooltip } from "@mui/material";
import { GridFilterAltIcon } from "@mui/x-data-grid";
import { CalendarIcon } from "@radix-ui/react-icons";
import { Tabs } from "@radix-ui/themes";
import { createFileRoute } from "@tanstack/react-router";
import { differenceInDays, format } from "date-fns";
import moment from "moment";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import { statusColorPalette } from "$src/assets/mock/common-data";
import CascadeButton from "$src/components/button/button";
import VerticalStackedBarChart, {
	type StackedBarData,
} from "$src/components/charts/VerticalStackedBarChart";
import CategoryKPIsBySupplierChart from "$src/components/company-supply-chain/CategoryKPIsBySupplierChart";
import SummaryOpenOrClosedCard from "$src/components/company-supply-chain/SummaryOpenOrClosedCard";
import Selector from "$src/components/inputs/selector";
import CollapsibleDataTable, {
	type CollapsibleColumn,
	type CollapsibleRowData,
} from "$src/components/tables/CollapsibleDataTable";
import FilterColumn, {
	type FilterSection,
} from "$src/components/tables/FilterColumn";
import LoadingSpinner from "$src/components/ui/LoadingSpinner";
import YellowInfoBox from "$src/components/ui/YellowInfoBox";
import { useIndustries, useSubIndustries } from "$src/hooks/useIndustries";
import {
	type SupplierKPIParams,
	type SupplierKPISummaryParams,
	useSupplierKPIOpenClosedSummary,
	useSupplierKPISummary,
	useSupplierKPIs,
	useSupplyChains,
} from "$src/hooks/useSupplyChain";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { useKPICategories } from "$src/queries/kpis";
import useAuthData from "$src/store/store.auth";
import { requireGlobalPartnerAuth } from "$src/utils/auth";
import { forceLogout } from "$src/utils/auth-utils";
import { CLOSED_QUALITY_LEGENDS } from "$src/utils/kpiUtils";

export const Route = createFileRoute("/company-supply-chain")({
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
		startTime: "2022-01-01",
		endTime: moment(new Date()).format("YYYY-MM-DD"),
	});
	const [page, setPage] = useState(1);
	const pageSize = 5;
	const [userSelectedSuppliers, setUserSelectedSuppliers] = useState<
		number[] | null
	>(null);

	// Selected values for Selector components
	const [selectedIndustry, setSelectedIndustry] = useState<number | null>(null);
	const [selectedSubIndustry, setSelectedSubIndustry] = useState<number | null>(
		null,
	);

	// Move useTheme hook to top to ensure consistent hook order
	const { theme } = useTheme();
	const authUserRaw = localStorage.getItem("auth_user");
	const authUser = authUserRaw ? JSON.parse(authUserRaw) : {};
	const { role } = useAuthData();
	// Use partner ID 28 for org-test-user
	const partnerIdFromUser =
		role === "org-test-user"
			? 28
			: (authUser?.partner ??
				authUser?.partnerId ??
				authUser?.partner_id ??
				null);
	const { data: kpiCategories = [], isLoading: loadingKpiCategories } =
		useKPICategories();
	const modifiedKpiCategories = [
		{ name: "Open/Closed", id: 99 },
		...kpiCategories,
	];
	// API queries

	// Category-specific API calls - individual hooks to avoid Rules of Hooks violation

	// const { data: workingConditionsKPIsNotShowClosed = [], isLoading: loadingWorkingConditionsNotShowClosed, error: errorWorkingConditionsNotShowClosed } = useSupplierKPIs(workingConditionsParamsNotShowClosed);
	// const { data: laborRecruitmentKPIsNotShowClosed = [], isLoading: loadingLaborRecruitmentNotShowClosed, error: errorLaborRecruitmentNotShowClosed } = useSupplierKPIs(laborRecruitmentParamsNotShowClosed);
	// const { data: paymentSystemsKPIsNotShowClosed = [], isLoading: loadingPaymentSystemsNotShowClosed, error: errorPaymentSystemsNotShowClosed } = useSupplierKPIs(paymentSystemsParamsNotShowClosed);
	// const { data: communicationsKPIsNotShowClosed = [], isLoading: loadingCommunicationsNotShowClosed, error: errorCommunicationsNotShowClosed } = useSupplierKPIs(communicationsParamsNotShowClosed);
	// const { data: livingConditionsKPIsNotShowClosed = [], isLoading: loadingLivingConditionsNotShowClosed, error: errorLivingConditionsNotShowClosed } = useSupplierKPIs(livingConditionsParamsNotShowClosed);

	// Main API queries
	const { data: supplyChains = [], isLoading: loadingSupplyChains } =
		useSupplyChains();

	const filteredSupplyChains = useMemo(() => {
		if (!supplyChains || supplyChains.length === 0) return [];
		return supplyChains.filter(
			(sc) => sc?.strategic_partner_id === partnerIdFromUser,
		);
	}, [supplyChains, partnerIdFromUser]);
	const [selectedSupplyChain, setSelectedSupplyChain] = useState<number | null>(
		null,
	);

	// Auto-select first supply chain when data loads
	useEffect(() => {
		if (filteredSupplyChains.length > 0 && !selectedSupplyChain) {
			const firstSC = filteredSupplyChains[0];
			setSelectedSupplyChain(firstSC.id);

			// Also initialize suppliers for the first supply chain
			const initialSupplierIds = firstSC.suppliers?.map((s) => s.id) || [];
			setUserSelectedSuppliers(initialSupplierIds);

			setFilters((prev) => ({
				...prev,
				supplyChains: [firstSC.id],
			}));
		}
	}, [filteredSupplyChains, selectedSupplyChain]);

	const suppliers = useMemo(() => {
		if (selectedSupplyChain) {
			return (
				filteredSupplyChains.find((sc) => sc.id === selectedSupplyChain)
					?.suppliers || []
			);
		}
		return filteredSupplyChains[0]?.suppliers || [];
	}, [filteredSupplyChains, selectedSupplyChain]);

	const getSupplierStatus = (supplier: any): string | undefined =>
		supplier?.status || supplier?.SupplierSupplyChain?.status;

	const getSupplierLabel = (supplier: any): string => {
		const name =
			supplier?.name || supplier?.supplier_name || "Unknown Supplier";
		return getSupplierStatus(supplier) === "inactive"
			? `${name} (inactive)`
			: name;
	};
	const allSupplierIds = useMemo(
		() => suppliers?.map((s) => s.id),
		[suppliers],
	);
	const supplierIds = userSelectedSuppliers ?? allSupplierIds;

	const { data: industries = [], isLoading: loadingIndustries } =
		useIndustries();
	const { data: subIndustries = [], isLoading: loadingSubIndustries } =
		useSubIndustries();
	// const { data: strategicPartners = [], isLoading: loadingPartners, isFetching: fetchingPartners } = useStrategicPartners()

	// Only run KPI queries when allSupplierIds is available and non-empty
	const supplierKPIParams: SupplierKPIParams | undefined = useMemo(() => {
		if (!allSupplierIds || allSupplierIds.length === 0) return undefined;
		return {
			suppliers: supplierIds,
			opened_at_range_after: filters.startTime || undefined,
			opened_at_range_before: filters.endTime || undefined,
			has_cases: true,
			show_closed: true,
		};
	}, [filters, userSelectedSuppliers, allSupplierIds, supplierIds]);

	const supplierKPIParams2: SupplierKPIParams | undefined = useMemo(() => {
		if (!allSupplierIds || allSupplierIds.length === 0) return undefined;
		return {
			suppliers: supplierIds,
			opened_at_range_after: filters.startTime || undefined,
			opened_at_range_before: filters.endTime || undefined,
			has_cases: true,
			show_closed: false,
		};
	}, [filters, userSelectedSuppliers, allSupplierIds, supplierIds]);

	// Search filters like legacy code
	const [searchFilters, setSearchFilters] = useState({
		search: "",
		search2: "",
	});

	// API params for closed violations with pagination
	const closedViolationsParams: SupplierKPIParams = useMemo(
		() => ({
			suppliers: supplierIds,
			opened_at_range_after: filters.startTime || undefined,
			opened_at_range_before: filters.endTime || undefined,
			has_cases: true,
			show_closed: true,
			ordering: "-closed_at",
			page: page,
			page_size: pageSize,
		}),
		[supplierIds, filters.startTime, filters.endTime, page],
	);

	const {
		data: supplierKPIData = { results: [], count: 0 },
		isLoading: loadingKPIs,
		error: kpiError,
	} = useSupplierKPIs(supplierKPIParams);
	const { data: supplierKPIData2 = { results: [], count: 0 } } =
		useSupplierKPIs(supplierKPIParams2);
	const {
		data: closedViolationsData = { results: [], count: 0 },
		isLoading: loadingClosedViolations,
	} = useSupplierKPIs(closedViolationsParams);

	// Extract results arrays for backward compatibility
	const supplierKPIs = supplierKPIData.results;

	const workingConditionsParams: SupplierKPIParams | undefined = useMemo(() => {
		if (!allSupplierIds || allSupplierIds.length === 0) return undefined;
		return {
			suppliers:
				userSelectedSuppliers && userSelectedSuppliers?.length > 0
					? userSelectedSuppliers
					: allSupplierIds,
			opened_at_range_after: filters.startTime || undefined,
			opened_at_range_before: filters.endTime || undefined,
			has_cases: true,
			show_closed: false,
			kpi__kpi_category: "Labor - Working conditions",
		};
	}, [filters, userSelectedSuppliers, allSupplierIds]);

	const laborRecruitmentParams: SupplierKPIParams | undefined = useMemo(() => {
		if (!allSupplierIds || allSupplierIds.length === 0) return undefined;
		return {
			suppliers:
				userSelectedSuppliers && userSelectedSuppliers?.length > 0
					? userSelectedSuppliers
					: allSupplierIds,
			opened_at_range_after: filters.startTime || undefined,
			opened_at_range_before: filters.endTime || undefined,
			has_cases: true,
			show_closed: false,
			kpi__kpi_category: "Recruitment",
		};
	}, [filters, userSelectedSuppliers, allSupplierIds]);

	const paymentSystemsParams: SupplierKPIParams | undefined = useMemo(() => {
		if (!allSupplierIds || allSupplierIds.length === 0) return undefined;
		return {
			suppliers:
				userSelectedSuppliers && userSelectedSuppliers?.length > 0
					? userSelectedSuppliers
					: allSupplierIds,
			opened_at_range_after: filters.startTime || undefined,
			opened_at_range_before: filters.endTime || undefined,
			has_cases: true,
			show_closed: false,
			kpi__kpi_category: "Wages",
		};
	}, [filters, userSelectedSuppliers, allSupplierIds]);

	const communicationsParams: SupplierKPIParams | undefined = useMemo(() => {
		if (!allSupplierIds || allSupplierIds.length === 0) return undefined;
		return {
			suppliers:
				userSelectedSuppliers && userSelectedSuppliers?.length > 0
					? userSelectedSuppliers
					: allSupplierIds,
			opened_at_range_after: filters.startTime || undefined,
			opened_at_range_before: filters.endTime || undefined,
			has_cases: true,
			show_closed: false,
			kpi__kpi_category: "Labor - Employer-employee relations",
		};
	}, [filters, userSelectedSuppliers, allSupplierIds]);

	const livingConditionsParams: SupplierKPIParams | undefined = useMemo(() => {
		if (!allSupplierIds || allSupplierIds.length === 0) return undefined;
		return {
			suppliers:
				userSelectedSuppliers && userSelectedSuppliers?.length > 0
					? userSelectedSuppliers
					: allSupplierIds,
			opened_at_range_after: filters.startTime || undefined,
			opened_at_range_before: filters.endTime || undefined,
			has_cases: true,
			show_closed: false,
			kpi__kpi_category: "Labor - Living and eating conditions",
		};
	}, [filters, userSelectedSuppliers, allSupplierIds]);

	const workingConditionsParamsClosed: SupplierKPIParams | undefined =
		useMemo(() => {
			if (!allSupplierIds || allSupplierIds.length === 0) return undefined;
			return {
				suppliers:
					userSelectedSuppliers && userSelectedSuppliers?.length > 0
						? userSelectedSuppliers
						: allSupplierIds,
				opened_at_range_after: filters.startTime || undefined,
				opened_at_range_before: filters.endTime || undefined,
				has_cases: true,
				show_closed: true,
				kpi__kpi_category: "Labor - Working conditions",
			};
		}, [filters, userSelectedSuppliers, allSupplierIds]);

	const laborRecruitmentParamsClosed: SupplierKPIParams | undefined =
		useMemo(() => {
			if (!allSupplierIds || allSupplierIds.length === 0) return undefined;
			return {
				suppliers:
					userSelectedSuppliers && userSelectedSuppliers?.length > 0
						? userSelectedSuppliers
						: allSupplierIds,
				opened_at_range_after: filters.startTime || undefined,
				opened_at_range_before: filters.endTime || undefined,
				has_cases: true,
				show_closed: true,
				kpi__kpi_category: "Recruitment",
			};
		}, [filters, userSelectedSuppliers, allSupplierIds]);

	const paymentSystemsParamsClosed: SupplierKPIParams | undefined =
		useMemo(() => {
			if (!allSupplierIds || allSupplierIds.length === 0) return undefined;
			return {
				suppliers:
					userSelectedSuppliers && userSelectedSuppliers?.length > 0
						? userSelectedSuppliers
						: allSupplierIds,
				opened_at_range_after: filters.startTime || undefined,
				opened_at_range_before: filters.endTime || undefined,
				has_cases: true,
				show_closed: true,
				kpi__kpi_category: "Wages",
			};
		}, [filters, userSelectedSuppliers, allSupplierIds]);

	const communicationsParamsClosed: SupplierKPIParams | undefined =
		useMemo(() => {
			if (!allSupplierIds || allSupplierIds.length === 0) return undefined;
			return {
				suppliers:
					userSelectedSuppliers && userSelectedSuppliers?.length > 0
						? userSelectedSuppliers
						: allSupplierIds,
				opened_at_range_after: filters.startTime || undefined,
				opened_at_range_before: filters.endTime || undefined,
				has_cases: true,
				show_closed: true,
				kpi__kpi_category: "Labor - Employer-employee relations",
			};
		}, [filters, userSelectedSuppliers, allSupplierIds]);

	const livingConditionsParamsClosed: SupplierKPIParams | undefined =
		useMemo(() => {
			if (!allSupplierIds || allSupplierIds.length === 0) return undefined;
			return {
				suppliers:
					userSelectedSuppliers && userSelectedSuppliers?.length > 0
						? userSelectedSuppliers
						: allSupplierIds,
				opened_at_range_after: filters.startTime || undefined,
				opened_at_range_before: filters.endTime || undefined,
				has_cases: true,
				show_closed: true,
				kpi__kpi_category: "Labor - Living and eating conditions",
			};
		}, [filters, userSelectedSuppliers, allSupplierIds]);

	// Individual hook calls for each category
	const {
		data: workingConditionsData = { results: [], count: 0 },
		isLoading: loadingWorkingConditions,
		error: errorWorkingConditions,
	} = useSupplierKPIs(workingConditionsParams);
	const {
		data: laborRecruitmentData = { results: [], count: 0 },
		isLoading: loadingLaborRecruitment,
		error: errorLaborRecruitment,
	} = useSupplierKPIs(laborRecruitmentParams);
	const {
		data: paymentSystemsData = { results: [], count: 0 },
		isLoading: loadingPaymentSystems,
		error: errorPaymentSystems,
	} = useSupplierKPIs(paymentSystemsParams);
	const {
		data: communicationsData = { results: [], count: 0 },
		isLoading: loadingCommunications,
		error: errorCommunications,
	} = useSupplierKPIs(communicationsParams);
	const {
		data: livingConditionsData = { results: [], count: 0 },
		isLoading: loadingLivingConditions,
		error: errorLivingConditions,
	} = useSupplierKPIs(livingConditionsParams);

	const { data: workingConditionsDataClosed = { results: [], count: 0 } } =
		useSupplierKPIs(workingConditionsParamsClosed);
	const { data: laborRecruitmentDataClosed = { results: [], count: 0 } } =
		useSupplierKPIs(laborRecruitmentParamsClosed);
	const { data: paymentSystemsDataClosed = { results: [], count: 0 } } =
		useSupplierKPIs(paymentSystemsParamsClosed);
	const { data: communicationsDataClosed = { results: [], count: 0 } } =
		useSupplierKPIs(communicationsParamsClosed);
	const { data: livingConditionsDataClosed = { results: [], count: 0 } } =
		useSupplierKPIs(livingConditionsParamsClosed);

	// Extract results arrays for backward compatibility
	const workingConditionsKPIs = workingConditionsData.results;
	const laborRecruitmentKPIs = laborRecruitmentData.results;
	const paymentSystemsKPIs = paymentSystemsData.results;
	const communicationsKPIs = communicationsData.results;
	const livingConditionsKPIs = livingConditionsData.results;

	// Combine all category data
	const categoryData = useMemo(
		() => ({
			"Labor - Working conditions": workingConditionsKPIs,
			Recruitment: laborRecruitmentKPIs,
			Wages: paymentSystemsKPIs,
			"Labor - Employer-employee relations": communicationsKPIs,
			"Labor - Living and eating conditions": livingConditionsKPIs,
		}),
		[
			workingConditionsKPIs,
			laborRecruitmentKPIs,
			paymentSystemsKPIs,
			communicationsKPIs,
			livingConditionsKPIs,
		],
	);
	const allCategoryData = useMemo(
		() => ({
			"Labor - Working conditions": workingConditionsKPIs?.concat(
				workingConditionsDataClosed.results,
			),
			Recruitment: laborRecruitmentKPIs?.concat(
				laborRecruitmentDataClosed.results,
			),
			Wages: paymentSystemsKPIs?.concat(paymentSystemsDataClosed.results),
			"Labor - Employer-employee relations": communicationsKPIs?.concat(
				communicationsDataClosed.results,
			),
			"Labor - Living and eating conditions": livingConditionsKPIs?.concat(
				livingConditionsDataClosed.results,
			),
		}),
		[
			workingConditionsKPIs,
			laborRecruitmentKPIs,
			paymentSystemsKPIs,
			communicationsKPIs,
			livingConditionsKPIs,
		],
	);

	// const filterByPanelSettings = (supplierKpisToBeFiltered, supplierClosedKpisFiltered, supplierOpenKpisFiltered, supplierKpiCountClosedMap, supplierKpiCountOpenMap) => {
	//   Object.keys(supplierKpisToBeFiltered).map(key => {
	//     const supplierKpi = supplierKpisToBeFiltered[key];
	//     let call_count = supplierKpi.calls !== undefined && supplierKpi.calls !== null && supplierKpi.calls?.length !== undefined ? supplierKpi.calls?.length : 0;
	//     let source_recruiter_count = supplierKpi.source_recruiters !== undefined && supplierKpi.source_recruiters !== null && supplierKpi.source_recruiters?.length !== undefined ? supplierKpi.source_recruiters?.length : 0;
	//     let destination_recruiter_count = supplierKpi.destination_recruiters !== undefined && supplierKpi.destination_recruiters !== null && supplierKpi.destination_recruiters?.length !== undefined ? supplierKpi.destination_recruiters?.length : 0;
	//     let total_update_count = supplierKpi.updates !== undefined && supplierKpi.updates !== null && supplierKpi.updates?.length !== undefined ? supplierKpi.updates?.length : 0;
	//     const matchesSupplier = supplierIds?.length === 0 || supplierIds.includes(supplierKpi.supplier);

	//     if (matchesSupplier && (!filters.startTime || new Date(supplierKpi.opened_at).getTime() >= new Date(filters.startTime).getTime()) && (!filters.endTime || new Date(supplierKpi.opened_at).getTime() <= new Date(filters.endTime).getTime())) {
	//       if (supplierKpi.status === SUPPLIER_UPDATE_KPI_STATUS_CLOSED_ID || supplierKpi.status === SUPPLIER_UPDATE_KPI_STATUS_OLD_ID) {
	//         if (supplierKpiCountClosedMap.has(supplierKpi.category) === false) {
	//           supplierKpiCountClosedMap.set(supplierKpi.category, 0);
	//         }
	//         supplierKpiCountClosedMap.set(supplierKpi.category, supplierKpiCountClosedMap.get(supplierKpi.category) + 1);
	//         supplierClosedKpisFiltered.push({ ...supplierKpi, call_count, source_recruiter_count, destination_recruiter_count, total_update_count });
	//       } else {
	//         // open
	//         if (supplierKpiCountOpenMap.has(supplierKpi.category) === false) {
	//           supplierKpiCountOpenMap.set(supplierKpi.category, 0);
	//         }
	//         supplierKpiCountOpenMap.set(supplierKpi.category, supplierKpiCountOpenMap.get(supplierKpi.category) + 1);
	//         supplierOpenKpisFiltered.push({ ...supplierKpi, call_count, source_recruiter_count, destination_recruiter_count, total_update_count });
	//       }
	//     }
	//   });
	// };

	// const filterMetrics = (categoryKPIs) => {
	//   // FILTER SUPPLIER KPI UPDATES
	//   if (categoryKPIs !== undefined && categoryKPIs !== null && categoryKPIs?.length > 0) {
	//     // FILTER OPEN SUPPLIER KPIS
	//     const supplierKpisToBeFiltered = categoryKPIs.filter(kpi => kpi.calls && kpi.calls?.length > 0);
	//     const supplierKpiCountOpenMap = new Map();
	//     const supplierKpiCountClosedMap = new Map();
	//     const supplierOpenKpisFiltered = [];
	//     const supplierClosedKpisFiltered = [];

	//     // Convert array to object with index as key for compatibility with original function
	//     const supplierKpisObject = {};
	//     supplierKpisToBeFiltered.forEach((kpi, index) => {
	//       supplierKpisObject[index] = kpi;
	//     });

	//     filterByPanelSettings(supplierKpisObject, supplierClosedKpisFiltered, supplierOpenKpisFiltered, supplierKpiCountClosedMap, supplierKpiCountOpenMap);

	//     return {
	//       openKPIs: supplierOpenKpisFiltered,
	//       closedKPIs: supplierClosedKpisFiltered,
	//       openCountMap: supplierKpiCountOpenMap,
	//       closedCountMap: supplierKpiCountClosedMap
	//     };
	//   }
	//   return {
	//     openKPIs: [],
	//     closedKPIs: [],
	//     openCountMap: new Map(),
	//     closedCountMap: new Map()
	//   };
	// };

	// Check if any category queries are loading
	const loadingCategoryData =
		loadingWorkingConditions ||
		loadingLaborRecruitment ||
		loadingPaymentSystems ||
		loadingCommunications ||
		loadingLivingConditions;

	if (kpiError) {
		forceLogout();
	}

	// Get suppliers based on selected supply chain or all suppliers
	const availableSuppliers = useMemo(() => {
		if (selectedSupplyChain) {
			const selectedSupplyChainData = supplyChains.find(
				(sc) => sc?.id === selectedSupplyChain,
			);
			return selectedSupplyChainData?.suppliers || [];
		}
		return suppliers;
	}, [selectedSupplyChain, supplyChains]);

	const supplierSections: FilterSection[] = [
		{
			title: "",
			options:
				availableSuppliers?.map((supplier) => ({
					id: supplier?.id,
					label: getSupplierLabel(supplier),
					value: supplier?.id,
				})) || [],
			selectedIds: supplierIds,
			onChange: (selectedIds: (string | number)[]) => {
				setUserSelectedSuppliers(selectedIds as number[]);
			},
		},
	];

	// Summary API with filters
	const summaryParams: SupplierKPISummaryParams = useMemo(
		() => ({
			// Keep the empty case as an empty set, not `undefined`. Dropping the key
			// makes the summary endpoints skip their supplier filter entirely and
			// return every supplier, so deselecting all suppliers used to widen the
			// results instead of emptying them.
			suppliers: supplierIds ?? [],
			opened_at_range_after: filters.startTime || undefined,
			opened_at_range_before: filters.endTime || undefined,
			has_cases: true,
		}),
		[filters, supplierIds],
	);

	const { data: supplierKPISummary = [], isLoading: loadingSummary } =
		useSupplierKPISummary(summaryParams);
	const { data: openClosedSummary = [] } =
		useSupplierKPIOpenClosedSummary(summaryParams);

	// Utility functions
	const getDaysActive = (openedAt: string): number => {
		return differenceInDays(new Date(), new Date(openedAt));
	};

	const getStatusColor = (daysActive: number, statusId: number): string => {
		const statusMap: Record<number, string> = {
			1: "No Progress",
			2: "Some Progress",
			3: "Closed",
			4: "Old",
		};
		const status = statusMap[statusId] || "No Progress";

		if (daysActive >= 60) return "#f44336"; // red
		if (daysActive > 30 && daysActive < 60 && status === "No Progress")
			return "#ff9800"; // orange
		if (daysActive > 15 && daysActive < 60 && status === "Some Progress")
			return "#ffeb3b"; // yellow
		if (daysActive <= 15) return "#000000"; // black
		return "#9e9e9e"; // grey
	};

	const getStatusString = (
		daysActive: number,
		statusId: number,
		openedAt: string,
	): string => {
		const statusMap: Record<number, string> = {
			1: "No Progress",
			2: "Some Progress",
			3: "Closed",
			4: "Old",
		};
		const status = statusMap[statusId] || "No Progress";

		if (daysActive >= 60) return "No Progress for over 60 days " + openedAt;
		if (daysActive > 30 && daysActive < 60 && status === "No Progress")
			return "No Progress";
		if (daysActive > 15 && daysActive < 60 && status === "Some Progress")
			return "Some Progress";
		if (daysActive <= 15) return "Active Under 15 days";
		if (daysActive > 15 && daysActive < 30 && status === "No Progress")
			return "No Progress";
		return "No Progress";
	};

	const filteredKPIs = useMemo(() => {
		return supplierKPIs
			?.concat(supplierKPIData2.results)
			?.filter((kpi) => {
				// Add calculated fields like in legacy code
				// const call_count = kpi.calls?.length || 0;

				// // Only include KPIs with calls (like legacy logic)
				// if (call_count === 0) {
				//   return false;
				// }

				// Supplier filtering - match legacy logic with string conversion and multiple checks
				const matchesSupplier =
					supplierIds?.length === 0 ||
					supplierIds.includes(kpi.supplier as number) ||
					(kpi.supplier && supplierIds.includes(kpi.supplier));

				return matchesSupplier;
			})
			.map((kpi) => ({
				// Add calculated fields to the KPI object like legacy code
				...kpi,
				call_count: kpi.call_count || 0,
				source_recruiter_count: kpi.source_recruiter_count || 0,
				destination_recruiter_count: kpi.destination_recruiter_count || 0,
				total_update_count: kpi.total_update_count || 0,
			}));
	}, [supplierKPIs, filters, supplierIds]);

	// Separate open and closed KPIs matching legacy logic exactly
	const openKPIs = useMemo(() => {
		const SUPPLIER_UPDATE_KPI_STATUS_CLOSED_ID = 3;
		const SUPPLIER_UPDATE_KPI_STATUS_OLD_ID = 4;

		let open = filteredKPIs?.filter(
			(kpi) =>
				kpi.status !== SUPPLIER_UPDATE_KPI_STATUS_CLOSED_ID &&
				kpi.status !== SUPPLIER_UPDATE_KPI_STATUS_OLD_ID,
		);

		// Apply search filter like legacy code (search for open KPIs)
		if (searchFilters.search && searchFilters.search?.length > 2) {
			const searchColumns = [
				"id",
				"supplier_name",
				"category",
				"description",
				"level",
				"opened_at",
				"closed_at",
				"affected_workers",
				"status_name",
				"call_count",
			];
			open = open?.filter((kpi) =>
				searchColumns.some((column) =>
					kpi[column]
						?.toString()
						.toLowerCase()
						.includes(searchFilters.search.toLowerCase()),
				),
			);
		}

		return open;
	}, [filteredKPIs, supplierIds, searchFilters.search]);

	const closedKPIs = useMemo(() => {
		const SUPPLIER_UPDATE_KPI_STATUS_CLOSED_ID = 3;

		// Use supplierKPIs (from supplierKPIData with show_closed: true) to get all closed records.
		// Status 4 ("Old, unresolved case") is excluded here as it already is from
		// openKPIs above, so it appears in neither bucket — matching cascade-api.
		let closed = supplierKPIs?.filter(
			(kpi) => kpi.status === SUPPLIER_UPDATE_KPI_STATUS_CLOSED_ID,
		);

		// Apply supplier filter
		closed = closed?.filter(
			(kpi) => supplierIds?.length === 0 || supplierIds.includes(kpi.supplier),
		);

		// Apply date filters
		closed = closed?.filter(
			(kpi) =>
				(!filters.startTime ||
					new Date(kpi.opened_at).getTime() >=
						new Date(filters.startTime).getTime()) &&
				(!filters.endTime ||
					new Date(kpi.opened_at).getTime() <=
						new Date(filters.endTime).getTime()),
		);

		// Apply search filter like legacy code (search2 for closed KPIs)
		if (searchFilters.search2 && searchFilters.search2?.length > 2) {
			const searchColumns = [
				"id",
				"supplier_name",
				"category",
				"description",
				"level",
				"opened_at",
				"closed_at",
				"affected_workers",
				"status_name",
				"call_count",
			];
			closed = closed?.filter((kpi) =>
				searchColumns.some((column) =>
					kpi[column]
						?.toString()
						.toLowerCase()
						.includes(searchFilters.search2.toLowerCase()),
				),
			);
		}

		return closed;
	}, [
		supplierKPIs,
		supplierIds,
		filters.startTime,
		filters.endTime,
		searchFilters.search2,
	]);

	const verticalChartData = useMemo(() => {
		// Use the new API data directly for the chart
		return (
			openClosedSummary?.map((data) => {
				return {
					category: data.name,
					Closed: data.closed_cases,
					Open: data.open_cases,
				};
			}) || []
		);
	}, [openClosedSummary]);

	// CollapsibleDataTable columns for closed KPIs
	const closedKPICollapsibleColumns: CollapsibleColumn[] = [
		{
			id: "id",
			label: "ID",
			minWidth: 80,
		},
		{
			id: "supplier_name",
			label: "Supplier",
			minWidth: 200,
			format: (value) => (
				<Tooltip title={value || "N/A"}>
					<span className="truncate">{value}</span>
				</Tooltip>
			),
		},
		{
			id: "category",
			label: "Category",
			minWidth: 80,
		},
		{
			id: "description",
			label: "Description",
			minWidth: 300,
			format: (value) => (
				<Tooltip title={value}>
					<span className="truncate">{value}</span>
				</Tooltip>
			),
		},
		{
			id: "remediation_sp_recommendation",
			label: "Recommendation for SP",
			minWidth: 150,
		},
		{
			id: "level",
			label: "Level (1-4)",
			minWidth: 80,
		},
		{
			id: "opened_at",
			label: "Opened",
			minWidth: 120,
			format: (value) => (value ? format(new Date(value), "yyyy-MM-dd") : ""),
		},
		{
			id: "closed_at",
			label: "Closed",
			minWidth: 120,
			format: (value) => (value ? format(new Date(value), "yyyy-MM-dd") : ""),
		},
		{
			id: "affected_workers",
			label: "Affected",
			minWidth: 130,
			align: "right",
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

	// Transform paginated closed violations data for CollapsibleDataTable
	const closedKPIsCollapsibleData: CollapsibleRowData[] = useMemo(() => {
		return (
			closedViolationsData.results?.map((kpi) => ({
				...kpi,
				id: kpi?.id,
				expandable: true,
				expandedContent: (row: CollapsibleRowData) => (
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<h4 className="font-semibold text-sm mb-2">Case Details</h4>
								<div className="space-y-1 text-sm">
									<div>
										<strong>Category:</strong> {row.category}
									</div>
									<div>
										<strong>Opened:</strong>{" "}
										{format(new Date(row.opened_at), "yyyy-MM-dd")}
									</div>
									<div>
										<strong>Closed:</strong>{" "}
										{row.closed_at
											? format(new Date(row.closed_at), "yyyy-MM-dd")
											: "N/A"}
									</div>
									<div>
										<strong>Status:</strong> {row.status_name}
									</div>
								</div>
							</div>
							<div>
								<h4 className="font-semibold text-sm mb-2">
									Resolution Details
								</h4>
								<div className="space-y-1 text-sm">
									<div>
										<strong>Quality:</strong>{" "}
										{row.closed_quality || "Unresolved"}
									</div>
									<div>
										<strong>Source Recruiters:</strong>{" "}
										{row.source_recruiter_count || 0}
									</div>
									<div>
										<strong>Destination Recruiters:</strong>{" "}
										{row.destination_recruiter_count || 0}
									</div>
									<div>
										<strong>Total Updates:</strong>{" "}
										{row.total_update_count || 0}
									</div>
								</div>
							</div>
						</div>
						{row.remediation_sp_recommendation &&
							row.remediation_sp_recommendation?.length > 0 && (
								<div>
									<h4 className="font-semibold text-sm mb-2">
										SP Recommendations
									</h4>
									<ul className="list-disc list-inside text-sm space-y-1">
										{row.remediation_sp_recommendation.map((rec, index) => (
											<li key={index}>{rec}</li>
										))}
									</ul>
								</div>
							)}
					</div>
				),
			})) || []
		);
	}, [closedViolationsData.results]);

	// Comprehensive loading check - wait for all API calls to complete
	const isStructuralLoading =
		loadingSupplyChains ||
		loadingIndustries ||
		loadingSubIndustries ||
		loadingKpiCategories;

	const isDataLoading =
		loadingKPIs ||
		loadingSummary ||
		loadingCategoryData ||
		loadingWorkingConditions ||
		loadingLaborRecruitment ||
		loadingPaymentSystems ||
		loadingCommunications ||
		loadingLivingConditions ||
		loadingClosedViolations;

	// Only show full-page loading for initial structural data
	if (isStructuralLoading) {
		return (
			<GuestLayout>
				<div className="flex flex-col justify-center items-center h-[70vh]">
					<LoadingSpinner
						subtitle={"Initializing supply chain structure..."}
						title={"Loading components..."}
					/>
				</div>
			</GuestLayout>
		);
	}

	// Check for critical errors that would prevent rendering
	const hasErrors =
		kpiError ||
		errorWorkingConditions ||
		errorLaborRecruitment ||
		errorPaymentSystems ||
		errorCommunications ||
		errorLivingConditions;

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
		supplyChains?.length > 0 && kpiCategories?.length > 0;

	if (!isStructuralLoading && !hasEssentialData) {
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
					Company Supply Chain
				</h1>

				<div className="flex items-center gap-4 flex-wrap text-sm mb-4">
					<div className="flex items-center gap-2 border-r pe-2">
						<GridFilterAltIcon className="w-5 h-5 text-[#148696]" />
						<span className="font-semibold">Filters</span>
					</div>

					<div className="flex flex-grow items-center my-2 justify-between">
						<div className="flex gap-4 items-center">
							<Selector
								allLabel="Supply Chain"
								id={"supply-chain-selector"}
								onChange={(value) => {
									setSelectedSupplyChain(value as number);
									// Get all supplier IDs for the selected supply chain
									const selectedSupplyChainData = filteredSupplyChains.find(
										(sc) => sc?.id === value,
									);
									const allSupplierIds =
										selectedSupplyChainData?.suppliers?.map((s) => s.id) || [];

									setFilters((prev) => ({
										...prev,
										supplyChains: value ? [value as number] : [],
									}));
									setUserSelectedSuppliers(value ? allSupplierIds : []);
								}}
								options={filteredSupplyChains?.map((supplyChain) => ({
									value: supplyChain?.id,
									label: supplyChain.name,
								}))}
								value={selectedSupplyChain ?? undefined}
							/>
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
							<CascadeButton
								buttonText={"Clear Filters"}
								handleOnClick={() => {
									// Reset all filters to initial state
									setFilters({
										supplyChains: [],
										industries: [],
										subIndustries: [],
										startTime: "2022-01-01",
										endTime: "2025-09-01",
									});
									setUserSelectedSuppliers(null);

									// Reset selected values
									setSelectedSupplyChain(null);
									setSelectedIndustry(null);
									setSelectedSubIndustry(null);

									// Reset search filters
									setSearchFilters({
										search: "",
										search2: "",
									});
								}}
								size={"2"}
							/>
						</div>

						<div className="z-40">
							<DatePicker
								className={
									"rounded-md focus:border-none focus:outline-none text-sm transition cursor-pointer min-w-[230px] text-[#37BDD2] font-bold"
								}
								dateFormat="yyyy MMM dd"
								endDate={filters.endTime ? new Date(filters.endTime) : null}
								icon={<CalendarIcon cursor={"pointer"} />}
								id={"kpi-date-range"}
								maxDate={new Date()}
								onChange={(dates) => {
									const [start, end] = dates;
									setFilters((prev) => ({
										...prev,
										startTime: start ? moment(start).format("YYYY-MM-DD") : "",
										endTime: end ? moment(end).format("YYYY-MM-DD") : "",
									}));
								}}
								onKeyDown={(e) => e.preventDefault()}
								placeholderText="Select date range"
								selectsRange
								showIcon
								startDate={
									filters.startTime ? new Date(filters.startTime) : null
								}
								// isClearable
								toggleCalendarOnIconClick
							/>
						</div>
					</div>
				</div>

				{!selectedSupplyChain ? (
					<NoSupplyChain />
				) : (
					<div className="grid grid-cols-5 gap-4 ">
						<div className="md:col-1 col-span-5">
							<div className="lg:sticky lg:top-6">
								<FilterColumn sections={supplierSections} title="Suppliers" />
							</div>
						</div>

						<div className="col-2 col-span-5 md:col-span-4 min-h-[400px]">
							{isDataLoading ? (
								<div className="flex flex-col justify-center items-center h-full min-h-[400px]">
									<LoadingSpinner
										subtitle={"Fetching KPIs, summaries, and chart data"}
										title={"Loading dashboard content..."}
									/>
								</div>
							) : (
								<>
									{/* Summary Cards */}
									<Box
										sx={{
											display: "grid",
											gridTemplateColumns:
												"repeat(auto-fit, minmax(200px, 1fr))",
											gap: 2,
											mb: 2,
										}}
									>
										<Card className="card-radius h-[100px]">
											<CardContent sx={{ textAlign: "center" }}>
												<p className="text-xl">{supplierKPIData2?.count}</p>
												<p>Open Issues</p>
											</CardContent>
										</Card>
										<Card className="card-radius h-[100px]">
											<CardContent sx={{ textAlign: "center" }}>
												<p className="text-xl">{supplierKPIData?.count}</p>
												<p>Closed Issues</p>
											</CardContent>
										</Card>
										<Card className="card-radius h-[100px]">
											<CardContent sx={{ textAlign: "center" }}>
												<p className="text-xl">
													{userSelectedSuppliers?.length ||
														allSupplierIds.length}
												</p>
												<p>Total Suppliers</p>
											</CardContent>
										</Card>
										<Card className="card-radius h-[100px]">
											<CardContent sx={{ textAlign: "center" }}>
												<p className="text-yellow-500 text-xl">
													{
														openKPIs?.filter(
															(kpi) => getDaysActive(kpi.opened_at) >= 60,
														)?.length
													}
												</p>
												<p color="text.secondary">Critical (60+ days)</p>
											</CardContent>
										</Card>
										<Card className="card-radius h-[100px]">
											<CardContent sx={{ textAlign: "center" }}>
												<p className="text-xl">
													{Math.round(
														(closedKPIs?.length /
															(openKPIs?.length + closedKPIs?.length)) *
															100,
													) || 0}
													%
												</p>
												<p color="text.secondary">Resolution Rate</p>
											</CardContent>
										</Card>
									</Box>

									<div className="space-y-4">
										<Card
											className="rounded-md shadow-lg z-50 p-4 card-radius"
											style={{ zIndex: 10 }}
										>
											<SummaryOpenOrClosedCard
												supplierKPISummary={supplierKPISummary}
											/>
										</Card>
										<Card className="card-radius">
											<Tabs.Root defaultValue="Open/Closed">
												<div className="overflow-x-auto">
													<Tabs.List
														color="green"
														style={{
															display: "flex",
															flexWrap: "nowrap",
															minWidth: "min-content",
														}}
													>
														{modifiedKpiCategories?.map((kpiCategory) => (
															<Tabs.Trigger
																id={kpiCategory?.id.toString()}
																key={kpiCategory?.id}
																style={{
																	color: theme === "dark" ? "white" : "#004A60",
																	whiteSpace: "nowrap",
																	flexShrink: 0,
																}}
																value={kpiCategory.name}
															>
																{kpiCategory.name}
															</Tabs.Trigger>
														))}
													</Tabs.List>
												</div>
												<Tabs.Content value="Open/Closed">
													<Box sx={{ height: 300, p: 2 }}>
														<VerticalStackedBarChart
															data={
																verticalChartData as unknown as StackedBarData[]
															}
															dataKeys={[
																{
																	key: "Open",
																	name: "Open",
																	color: statusColorPalette[4],
																},
																{
																	key: "Closed",
																	name: "Closed",
																	color: statusColorPalette[0],
																},
															]}
															xKey="category"
														/>
													</Box>
												</Tabs.Content>
												{kpiCategories?.map((category) => {
													// Use category-specific API data instead of filtering
													const categoryKPIs =
														allCategoryData[category.name] || [];

													return (
														<Tabs.Content
															key={category?.id}
															value={category.name}
														>
															<CategoryKPIsBySupplierChart
																header={
																	<h4
																		style={{ textAlign: "center", margin: 0 }}
																	>
																		{category.name}
																	</h4>
																}
																kpis={categoryKPIs}
															/>
														</Tabs.Content>
													);
												})}
											</Tabs.Root>
										</Card>

										<div className="my-4">
											<p className="text-xl font-bold">
												Open Worker-Reported Violations (
												{supplierKPIData2.count})
											</p>
											<p className="text-sm mt-2">
												Worker reported labor violations below are organized
												into the 5 main KPI I categories. These map to and
												expand upon internationally recognized types of labor
												violations and potential workplace and recruitment
												issues.
											</p>
										</div>

										<div className="grid grid-cols-1 gap-4">
											{/* Use the same 5 categories as the chart for consistency */}
											{[
												"Labor - Working conditions",
												"Recruitment",
												"Wages",
												"Labor - Employer-employee relations",
												"Labor - Living and eating conditions",
											].map((categoryName) => {
												// Use category-specific API data instead of filtering

												const categoryKPIs = categoryData[categoryName] || [];

												// Define columns for the collapsible table
												const categoryColumns: CollapsibleColumn[] = [
													{
														id: "id",
														label: "ID",
														minWidth: 80,
														align: "center",
													},
													{
														id: "supplier_name",
														label: "Supplier",
														minWidth: 150,
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
													},
													{
														id: "status_display",
														label: "Status",
														minWidth: 120,
													},
												];

												// Prepare row data with expanded content
												const categoryRows: CollapsibleRowData[] =
													categoryKPIs?.map((kpi) => {
														const daysActive = getDaysActive(kpi.opened_at);
														const statusText = getStatusString(
															daysActive,
															kpi.status,
															kpi.opened_at,
														);
														const color = getStatusColor(
															daysActive,
															kpi.status,
														);

														return {
															...kpi,
															id: kpi?.id,
															days_active: daysActive,
															affected_workers: kpi.affected_workers || 0,
															call_count: kpi.call_count || 0,
															status_display: (
																<div
																	className="w-3 h-3 rounded-full"
																	style={{
																		background: color,
																	}}
																	title={statusText}
																/>
															),
															expandedContent: (row) => (
																<Box sx={{ p: 2, borderRadius: 1 }}>
																	<div className="text-lg font-bold mb-3">
																		KPI Details - ID: {row?.id}
																	</div>
																	<Box
																		sx={{
																			display: "grid",
																			gridTemplateColumns: {
																				xs: "1fr",
																				md: "1fr 1fr",
																			},
																			gap: 3,
																		}}
																	>
																		<Box>
																			<div className="mb-2">
																				<span className="font-semibold">
																					Full Description:
																				</span>
																				<p className="mt-1 text-sm">
																					{row.description}
																				</p>
																			</div>

																			<div className="mb-2">
																				<span className="font-semibold">
																					Category:
																				</span>
																				<p className="mt-1 text-sm">
																					{row.category}
																				</p>
																			</div>

																			<div className="mb-2">
																				<span className="font-semibold">
																					Opened Since:
																				</span>
																				<p className="mt-1 text-sm">
																					{row.opened_at &&
																						format(
																							new Date(row.opened_at),
																							"PPP",
																						)}
																				</p>
																			</div>

																			{row.closed_at && (
																				<div className="mb-2">
																					<span className="font-semibold">
																						Closed Date:
																					</span>
																					<p className="mt-1 text-sm">
																						{format(
																							new Date(row.closed_at),
																							"PPP",
																						)}
																					</p>
																				</div>
																			)}

																			<div className="mb-2">
																				<span className="font-semibold">
																					Status:
																				</span>
																				<p className="mt-1 text-sm">
																					{row.status_name}
																				</p>
																			</div>
																		</Box>

																		<Box>
																			<div className="mb-2">
																				<span className="font-semibold">
																					Affected Workers:
																				</span>
																				<p className="mt-1 text-sm">
																					{row.affected_workers || "N/A"}
																				</p>
																			</div>

																			<div className="mb-2">
																				<span className="font-semibold">
																					Call Count:
																				</span>
																				<p className="mt-1 text-sm">
																					{row.call_count || 0}
																				</p>
																			</div>

																			<div className="mb-2">
																				<span className="font-semibold">
																					Source Recruiters:
																				</span>
																				<p className="mt-1 text-sm">
																					{row.source_recruiter_count || 0}
																				</p>
																			</div>

																			<div className="mb-2">
																				<span className="font-semibold">
																					Destination Recruiters:
																				</span>
																				<p className="mt-1 text-sm">
																					{row.destination_recruiter_count || 0}
																				</p>
																			</div>

																			{row.remediation_sp_recommendation &&
																				row.remediation_sp_recommendation
																					?.length > 0 && (
																					<div className="mb-2">
																						<span className="font-semibold">
																							SP Recommendations:
																						</span>
																						<Box sx={{ mt: 1 }}>
																							{/* {row.remediation_sp_recommendation.map((rec, index) => (
                                  <Chip
                                    key={index}
                                    label={rec}
                                    size="small"
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                    color="info"
                                  />
                                ))} */}
																						</Box>
																					</div>
																				)}

																			{row.closed_quality && (
																				<div className="mb-2">
																					<span className="font-semibold">
																						Closure Quality:
																					</span>
																					<Box sx={{ mt: 1 }}>
																						<Chip
																							color={
																								row.closed_quality?.toLowerCase() ===
																								"excellent"
																									? "success"
																									: row.closed_quality?.toLowerCase() ===
																											"good"
																										? "info"
																										: row.closed_quality?.toLowerCase() ===
																												"fair"
																											? "warning"
																											: "error"
																							}
																							label={row.closed_quality}
																							size="small"
																						/>
																					</Box>
																				</div>
																			)}

																			{row.remediation_notes && (
																				<div className="mb-2">
																					<span className="font-semibold">
																						Remediation Notes (Summary)
																					</span>
																					<p className="mt-1 text-sm">
																						<b>Issues: </b>
																						{row.remediation_notes}
																					</p>
																					<p className="mt-1 text-sm">
																						<b>Action: </b>
																						{row.remediation_action}
																					</p>
																				</div>
																			)}

																			{row.closed_notes && (
																				<div className="mb-2">
																					<span className="font-semibold">
																						Closed Notes:
																					</span>
																					<p className="mt-1 text-sm">
																						{row.closed_notes}
																					</p>
																				</div>
																			)}
																		</Box>
																	</Box>
																</Box>
															),
														};
													});

												return (
													<div key={categoryName}>
														<CollapsibleDataTable
															columns={categoryColumns}
															dense={false}
															expandAllButton={true}
															maxHeight={500}
															pageSize={10}
															rows={categoryRows}
															title={`${categoryName} (${categoryRows?.length} issues)`}
														/>
													</div>
												);
											})}
										</div>
										<div className="text-lg font-bold my-4">
											Closed Worker-Reported Violations (
											{closedViolationsData.count})
										</div>

										<CollapsibleDataTable
											columns={closedKPICollapsibleColumns}
											currentPage={page}
											defaultExpanded={false}
											dense={false}
											expandAllButton={true}
											isLoading={loadingClosedViolations}
											maxHeight={600}
											onPageChange={setPage}
											pageSize={pageSize}
											rows={closedKPIsCollapsibleData}
											statusLegends={[...CLOSED_QUALITY_LEGENDS]}
											stickyHeader={true}
											title="Closed Worker-Reported Violations"
											totalCount={closedViolationsData.count}
										/>
									</div>
								</>
							)}
						</div>
					</div>
				)}
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
