import { Translate } from "@mui/icons-material";
import { useIsFetching } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import SupplyChainCoverage from "$components/routes/SupplyChainCoverage";
import AnimatedTabs from "$components/ui/AnimatedTabs";
import DrivingEthicalSupplyChains from "$src/components/routes/DrivingEthicalSupplyChains";
import OutreachEffectiveness from "$src/components/routes/OutreachEffectiveness";
import WorkerVoice from "$src/components/routes/WorkerVoice";
import { FilterBar, type FilterBarFilters } from "$src/components/ui/FilterBar";
import LoadingSpinner from "$src/components/ui/LoadingSpinner";
import PageContainer from "$src/components/ui/PageContainer";
import PageHeader from "$src/components/ui/PageHeader";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { getCurrentViewMode } from "$src/store/viewModeStore";
import { isILMManagement, isIssaraManagement } from "$src/utils/account";
import { DEFAULT_FROM_DATE, getDefaultToDate } from "$src/utils/dateDefaults";

const DASHBOARD_TABS = [
	{ value: "worker-voice", label: "Worker Voice" },
	{ value: "supply-chain-coverage", label: "Supply Chain Coverage" },
	{
		value: "driving-ethical-supply-chains",
		label: "Driving Ethical Supply Chains",
	},
	{ value: "outreach-effectiveness", label: "Outreach Effectiveness" },
];

type DashboardTab =
	| "worker-voice"
	| "supply-chain-coverage"
	| "driving-ethical-supply-chains"
	| "outreach-effectiveness";

const TAB_VALUES = DASHBOARD_TABS.map((t) => t.value) as DashboardTab[];

export const Route = createFileRoute("/internal-dashboard")({
	validateSearch: (search: Record<string, unknown>): { tab: DashboardTab } => {
		const tab = search.tab;
		return {
			tab: TAB_VALUES.includes(tab as DashboardTab)
				? (tab as DashboardTab)
				: "worker-voice",
		};
	},
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		if (!isAuthenticated) {
			throw redirect({ to: "/" });
		}

		const isIlmView = getCurrentViewMode() === "ilm-view";

		if (!isIssaraManagement(role) || !isIlmView) {
			throw redirect({ to: "/unauthorized" });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	const initialFrom = DEFAULT_FROM_DATE;
	const initialTo = getDefaultToDate();

	const { role } = authStatus();
	const canEditTranslations = isILMManagement(role);

	const { tab: activeTab } = Route.useSearch();
	const navigate = Route.useNavigate();

	const [isTabChanging, setIsTabChanging] = useState(false);
	const prevTabRef = useRef(activeTab);

	useEffect(() => {
		if (prevTabRef.current !== activeTab) {
			prevTabRef.current = activeTab;
			setIsTabChanging(true);
			const timer = setTimeout(() => {
				setIsTabChanging(false);
			}, 450);
			return () => clearTimeout(timer);
		}
	}, [activeTab]);

	const setActiveTab = (tab: string) => {
		if (tab !== activeTab) {
			setIsTabChanging(true);
			navigate({ search: { tab: tab as DashboardTab } });
		}
	};

	const [filters, setFilters] = useState<FilterBarFilters>({
		countries: [],
		provinces: [],
		districts: [],
		industries: [],
		strategicPartnerGroupings: [],
		subIndustries: [],
		suppliers: [],
		from: initialFrom,
		to: initialTo,
	});

	// The Supplier dropdown uses server-side type-ahead search (see FilterBar's
	// supplierServerSearch), so the full supplier list is no longer pre-loaded.

	const [isFilterRefetching, setIsFilterRefetching] = useState(true);
	const prevFiltersRef = useRef(filters);

	useEffect(() => {
		if (JSON.stringify(prevFiltersRef.current) !== JSON.stringify(filters)) {
			prevFiltersRef.current = filters;
			setIsFilterRefetching(true);
		}
	}, [filters]);

	const activeFetchingCount = useIsFetching({
		predicate: (query) => {
			const queryKey = query.queryKey;
			if (queryKey[0] === "supply-chain-suppliers-table") {
				return false;
			}
			return true;
		},
	});

	useEffect(() => {
		if (activeFetchingCount === 0) {
			setIsFilterRefetching(false);
		}
	}, [activeFetchingCount]);

	const isOverlayLoading = isTabChanging || isFilterRefetching;

	return (
		<GuestLayout>
			{isOverlayLoading && (
				<div
					aria-busy="true"
					aria-live="polite"
					className="fixed inset-0 z-[1000] flex items-center justify-center bg-white/60 backdrop-blur-[2px] transition-opacity duration-200"
				>
					<div className="rounded-xl bg-white px-8 py-6 shadow-2xl border border-gray-100 flex flex-col items-center">
						<LoadingSpinner
							subtitle="Updating metrics, charts, and supply chain data"
							title="Loading Dashboard Data…"
						/>
					</div>
				</div>
			)}
			<PageContainer>
				<PageHeader
					actions={
						canEditTranslations ? (
							<Link
								className="rounded-lg bg-[#148696] px-3 py-1.5 font-semibold text-white transition-colors hover:bg-[#004A60] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
								to="/dev-translations"
							>
								<Translate className="mr-1 inline h-4 w-4" />
								Edit Translations
							</Link>
						) : undefined
					}
					title="Internal Dashboard"
				/>
				<AnimatedTabs
					onValueChange={setActiveTab}
					tabs={DASHBOARD_TABS}
					value={activeTab}
				/>
				{activeTab !== "worker-voice" &&
					activeTab !== "outreach-effectiveness" &&
					activeTab !== "driving-ethical-supply-chains" && (
						<FilterBar
							className="my-6"
							defaultFrom={initialFrom}
							defaultTo={initialTo}
							filters={filters}
							onChange={setFilters}
							showCountry
							showDateRange={activeTab !== "supply-chain-coverage"}
							showDistrict={activeTab === "supply-chain-coverage"}
							showIndustry
							showProvince={activeTab === "supply-chain-coverage"}
							showStrategicPartnerGrouping={
								activeTab === "supply-chain-coverage"
							}
							showStrategicPartners={activeTab === "supply-chain-coverage"}
							supplierServerSearch
						/>
					)}

				<div className="mt-6">
					{(() => {
						switch (activeTab) {
							case "worker-voice":
								return (
									<WorkerVoice
										defaultFrom={initialFrom}
										defaultTo={initialTo}
										filters={filters}
										onFiltersChange={setFilters}
									/>
								);
							case "supply-chain-coverage":
								return <SupplyChainCoverage filters={filters} />;
							case "driving-ethical-supply-chains":
								return (
									<DrivingEthicalSupplyChains
										defaultFrom={initialFrom}
										defaultTo={initialTo}
										filters={filters}
										onFiltersChange={setFilters}
									/>
								);
							case "outreach-effectiveness":
								return (
									<OutreachEffectiveness
										defaultFrom={initialFrom}
										defaultTo={initialTo}
										filters={filters}
										onFiltersChange={setFilters}
									/>
								);
							default:
								return null;
						}
					})()}
				</div>
			</PageContainer>
		</GuestLayout>
	);
}
