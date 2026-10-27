import { Cross2Icon, MixerHorizontalIcon } from "@radix-ui/react-icons";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import GroupTabButton, {
	type ViewMode,
} from "$src/components/button/groupTabButton";
import MemberDirectoryFilterPanel, {
	type MemberDirectoryFilterSection,
} from "$src/components/member-directory/MemberDirectoryFilterPanel";
import MemberDirectoryCard from "$src/components/member-directory/memberDirectoryCard";
import MemberDirectoryListCard from "$src/components/member-directory/memberDirectoryListCard";
import SearchBox from "$src/components/search/searchBox";
import LoadingSpinner from "$src/components/ui/LoadingSpinner";
import { useCities, useCountries } from "$src/hooks/useCommonData";
import {
	useGlobalBuyerIndustries,
	useGlobalBuyers,
} from "$src/hooks/useGlobalBuyers";
import { useGDIndustries } from "$src/hooks/useIndustries";
import { useRecruitmentAgencies } from "$src/hooks/useRecruitmentAgencies";
import { useSuppliers } from "$src/hooks/useSuppliers";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import useAuthData from "$src/store/store.auth";
import { useViewModeStore } from "$src/store/viewModeStore";
import { requireRecruiterSupplierAuth } from "$src/utils/auth";
import {
	buildDirectoryLocationMaps,
	canViewGlobalBuyersForRole,
	getAppliedFilterIds,
	getDirectoryCount,
	getResolvedMemberLocation,
	MEMBER_DIRECTORY_DEFAULT_ORDERING,
} from "$src/utils/memberDirectory";

const MEMBER_DIRECTORY_ACTIVE_TAB_KEY = "member-directory-active-tab-v2";
const MEMBER_DIRECTORY_TABS = [
	"recruitment-agencies",
	"suppliers",
	"global-buyers",
] as const;

type MemberDirectoryTab = (typeof MEMBER_DIRECTORY_TABS)[number];

const isMemberDirectoryTab = (
	value: string | null,
): value is MemberDirectoryTab =>
	MEMBER_DIRECTORY_TABS.includes(value as MemberDirectoryTab);

const getStoredMemberDirectoryTab = (): MemberDirectoryTab => {
	if (typeof window === "undefined") return "recruitment-agencies";

	try {
		const storedTab = window.localStorage.getItem(
			MEMBER_DIRECTORY_ACTIVE_TAB_KEY,
		);
		return isMemberDirectoryTab(storedTab) ? storedTab : "recruitment-agencies";
	} catch {
		return "recruitment-agencies";
	}
};

const getMemberDirectoryItemKey = (
	tab: MemberDirectoryTab,
	company: { id?: string | number; type?: string },
) => `${tab}:${company.type ?? "member"}:${company.id ?? "unknown"}`;

export const Route = createFileRoute("/member-directory/")({
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
	const storedRole = useAuthData((state) => state.role);
	const authRole = authStatus().role;
	const activeViewMode = useViewModeStore((state) => state.viewMode);
	const canViewGlobalBuyers = canViewGlobalBuyersForRole(
		storedRole ?? authRole,
		activeViewMode,
	);
	const [activeTab, setActiveTab] = useState<MemberDirectoryTab>(
		getStoredMemberDirectoryTab,
	);
	const effectiveActiveTab =
		activeTab === "global-buyers" && !canViewGlobalBuyers
			? "recruitment-agencies"
			: activeTab;
	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [selectedCountries, setSelectedCountries] = useState<
		(string | number)[]
	>([]);
	const [selectedSendingCountries, setSelectedSendingCountries] = useState<
		(string | number)[]
	>([]);
	const [selectedIndustries, setSelectedIndustries] = useState<
		(string | number)[]
	>([]);
	const [searchQuery, setSearchQuery] = useState<string>(""); // Search query state
	const { data: countriesData = [] } = useCountries();
	const { data: citiesData = [] } = useCities();
	const { data: supplierIndustries = [] } = useGDIndustries();
	const { data: globalPartnerIndustries = [] } = useGlobalBuyerIndustries();

	const countryFilterOptionIds = useMemo(
		() => countriesData.map((option: any) => option.country),
		[countriesData],
	);
	const supplierIndustryFilterOptionIds = useMemo(
		() => supplierIndustries.map((industry: any) => industry.industry),
		[supplierIndustries],
	);
	const globalPartnerIndustryFilterOptionIds = useMemo(
		() => globalPartnerIndustries.map((industry: any) => industry.id),
		[globalPartnerIndustries],
	);
	const activeIndustryFilterOptionIds =
		effectiveActiveTab === "global-buyers"
			? globalPartnerIndustryFilterOptionIds
			: supplierIndustryFilterOptionIds;
	const appliedCountries = getAppliedFilterIds(
		selectedCountries,
		countryFilterOptionIds,
	);
	const appliedSendingCountries = getAppliedFilterIds(
		selectedSendingCountries,
		countryFilterOptionIds,
	);
	const appliedIndustries = getAppliedFilterIds(
		selectedIndustries,
		activeIndustryFilterOptionIds,
	);

	useEffect(() => {
		if (activeTab === "global-buyers" && !canViewGlobalBuyers) {
			setActiveTab("recruitment-agencies");
			return;
		}

		try {
			window.localStorage.setItem(MEMBER_DIRECTORY_ACTIVE_TAB_KEY, activeTab);
		} catch {
			// Keep the directory usable if localStorage is unavailable.
		}
	}, [activeTab, canViewGlobalBuyers]);

	const {
		data: recruitmentAgenciesData,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading: loadingRecruitmentAgencies,
		error: recruitmentAgenciesError,
	} = useRecruitmentAgencies({
		enabled: effectiveActiveTab === "recruitment-agencies",
		ordering: MEMBER_DIRECTORY_DEFAULT_ORDERING,
		country:
			effectiveActiveTab === "recruitment-agencies"
				? appliedCountries
				: undefined,
		sendingCountry:
			effectiveActiveTab === "recruitment-agencies"
				? appliedSendingCountries
				: undefined,
		industry:
			effectiveActiveTab === "recruitment-agencies"
				? appliedIndustries
				: undefined,
		search:
			effectiveActiveTab === "recruitment-agencies"
				? searchQuery || undefined
				: undefined,
	});

	const {
		data: suppliersData,
		fetchNextPage: fetchNextPageSuppliers,
		hasNextPage: hasNextPageSuppliers,
		isFetchingNextPage: isFetchingNextPageSuppliers,
		isLoading: loadingSuppliers,
		error: suppliersError,
	} = useSuppliers({
		enabled: effectiveActiveTab === "suppliers",
		ordering: MEMBER_DIRECTORY_DEFAULT_ORDERING,
		country: effectiveActiveTab === "suppliers" ? appliedCountries : undefined,
		industry:
			effectiveActiveTab === "suppliers" ? appliedIndustries : undefined,
		search:
			effectiveActiveTab === "suppliers" ? searchQuery || undefined : undefined,
	});

	const {
		data: globalBuyersData,
		fetchNextPage: fetchNextPageGlobalBuyers,
		hasNextPage: hasNextPageGlobalBuyers,
		isFetchingNextPage: isFetchingNextPageGlobalBuyers,
		isLoading: loadingGlobalBuyers,
		error: globalBuyersError,
	} = useGlobalBuyers({
		enabled: canViewGlobalBuyers && effectiveActiveTab === "global-buyers",
		ordering: MEMBER_DIRECTORY_DEFAULT_ORDERING,
		country:
			effectiveActiveTab === "global-buyers" ? appliedCountries : undefined,
		industry:
			effectiveActiveTab === "global-buyers" ? appliedIndustries : undefined,
		search:
			effectiveActiveTab === "global-buyers"
				? searchQuery || undefined
				: undefined,
	});

	const locationMaps = useMemo(
		() => buildDirectoryLocationMaps(citiesData, countriesData),
		[citiesData, countriesData],
	);

	const companiesState = useMemo(() => {
		let companies: any[] = [];

		if (effectiveActiveTab === "recruitment-agencies") {
			companies =
				recruitmentAgenciesData?.pages.flatMap((page) => page.results) ?? [];
		} else if (effectiveActiveTab === "suppliers") {
			companies = suppliersData?.pages.flatMap((page) => page.results) ?? [];
		} else if (canViewGlobalBuyers && effectiveActiveTab === "global-buyers") {
			companies = globalBuyersData?.pages.flatMap((page) => page.results) ?? [];
		}

		return companies.map((company) => ({
			...company,
			memberDirectoryLocation: getResolvedMemberLocation(company, locationMaps),
		}));
	}, [
		effectiveActiveTab,
		recruitmentAgenciesData,
		suppliersData,
		globalBuyersData,
		canViewGlobalBuyers,
		locationMaps,
	]);

	// Infinite scroll observer
	const observer = useRef<IntersectionObserver | null>(null);
	const lastElementRef = useCallback(
		(node: HTMLDivElement) => {
			const currentIsFetching =
				effectiveActiveTab === "recruitment-agencies"
					? isFetchingNextPage
					: effectiveActiveTab === "suppliers"
						? isFetchingNextPageSuppliers
						: isFetchingNextPageGlobalBuyers;
			const currentHasNextPage =
				effectiveActiveTab === "recruitment-agencies"
					? hasNextPage
					: effectiveActiveTab === "suppliers"
						? hasNextPageSuppliers
						: hasNextPageGlobalBuyers;
			const currentFetchNextPage =
				effectiveActiveTab === "recruitment-agencies"
					? fetchNextPage
					: effectiveActiveTab === "suppliers"
						? fetchNextPageSuppliers
						: fetchNextPageGlobalBuyers;

			if (currentIsFetching) return;
			if (observer.current) observer.current.disconnect();
			observer.current = new IntersectionObserver((entries) => {
				if (entries[0].isIntersecting && currentHasNextPage) {
					currentFetchNextPage();
				}
			});
			if (node) observer.current.observe(node);
		},
		[
			isFetchingNextPage,
			fetchNextPage,
			hasNextPage,
			isFetchingNextPageSuppliers,
			fetchNextPageSuppliers,
			hasNextPageSuppliers,
			isFetchingNextPageGlobalBuyers,
			fetchNextPageGlobalBuyers,
			hasNextPageGlobalBuyers,
			effectiveActiveTab,
		],
	);

	const handleViewChange = (newView: ViewMode) => {
		setViewMode(newView);
	};

	const handleTabChange = (tab: MemberDirectoryTab) => {
		setActiveTab(tab);
		handleClearAllFilters();
	};

	const filterSections: MemberDirectoryFilterSection[] = useMemo(
		() => [
			{
				title: t("memberDirectoryPage.filters.country"),
				options: countriesData?.map((option: any) => ({
					id: option.country,
					label: option.name,
				})),
				selectedIds: selectedCountries,
				onChange: setSelectedCountries,
				type: "single-select",
				placeholder: t("memberDirectoryPage.filters.placeholders.basedCountry"),
			},
			{
				title: t("memberDirectoryPage.filters.industry"),
				options: supplierIndustries?.map((industry: any) => ({
					id: industry.industry,
					label: industry.name,
				})),
				selectedIds: selectedIndustries,
				onChange: setSelectedIndustries,
				type: "single-select",
				placeholder: t("memberDirectoryPage.filters.placeholders.industry"),
			},
		],
		[
			t,
			selectedCountries,
			selectedIndustries,
			supplierIndustries,
			countriesData,
		],
	);

	const filterSectionsRA: MemberDirectoryFilterSection[] = useMemo(
		() => [
			{
				title: t("memberDirectoryPage.filters.basedCountry"),
				options: countriesData?.map((option: any) => ({
					id: option.country,
					label: option.name,
				})),
				selectedIds: selectedCountries,
				onChange: setSelectedCountries,
				type: "single-select",
				placeholder: t("memberDirectoryPage.filters.placeholders.basedCountry"),
			},
			{
				title: t("memberDirectoryPage.filters.sendingCountry"),
				options: countriesData?.map((option: any) => ({
					id: option.country,
					label: option.name,
				})),
				selectedIds: selectedSendingCountries,
				onChange: setSelectedSendingCountries,
				multiSelect: true,
				type: "multi-select",
				searchable: true,
				placeholder: t(
					"memberDirectoryPage.filters.placeholders.sendingCountry",
				),
			},
			{
				title: t("memberDirectoryPage.filters.industry"),
				options: supplierIndustries?.map((industry: any) => ({
					id: industry.industry,
					label: industry.name,
				})),
				selectedIds: selectedIndustries,
				onChange: setSelectedIndustries,
				type: "single-select",
				placeholder: t("memberDirectoryPage.filters.placeholders.industry"),
			},
		],
		[
			t,
			selectedCountries,
			selectedSendingCountries,
			selectedIndustries,
			supplierIndustries,
			countriesData,
		],
	);

	const filterSectionsGlobalBuyers: MemberDirectoryFilterSection[] = useMemo(
		() => [
			{
				title: t("memberDirectoryPage.filters.basedCountry"),
				options: countriesData?.map((option: any) => ({
					id: option.country,
					label: option.name,
				})),
				selectedIds: selectedCountries,
				onChange: setSelectedCountries,
				type: "single-select",
				placeholder: t("memberDirectoryPage.filters.placeholders.basedCountry"),
			},
			{
				title: t("memberDirectoryPage.filters.industry"),
				options: globalPartnerIndustries?.map((industry: any) => ({
					id: industry.id,
					label: industry.name,
				})),
				selectedIds: selectedIndustries,
				onChange: setSelectedIndustries,
				type: "single-select",
				placeholder: t("memberDirectoryPage.filters.placeholders.industry"),
			},
		],
		[
			t,
			selectedCountries,
			selectedIndustries,
			countriesData,
			globalPartnerIndustries,
		],
	);

	// const containerStyle = {
	// 	width: "100%",
	// 	height: "90vh",
	// 	borderRadius: 5,
	// 	border: "1px solid #e0e0e0",
	// };

	// const defaultMapProps = {
	// 	center: {
	// 		lat: 20, // Latitude of Myanmar
	// 		lng: 94.956,
	// 	},
	// 	zoom: 4.8,
	// };
	// const mapKey = import.meta.env.VITE_APP_GOOGLE_GEOCODE_API_KEY;

	// Clear all filters
	const handleClearAllFilters = () => {
		setSelectedCountries([]);
		setSelectedSendingCountries([]);
		setSelectedIndustries([]);
		setSearchQuery("");
	};

	const isLoading =
		(effectiveActiveTab === "recruitment-agencies" &&
			loadingRecruitmentAgencies) ||
		(effectiveActiveTab === "suppliers" && loadingSuppliers) ||
		(canViewGlobalBuyers &&
			effectiveActiveTab === "global-buyers" &&
			loadingGlobalBuyers);
	const showInitialLoading = isLoading && companiesState.length === 0;

	const currentFilterSections =
		effectiveActiveTab === "recruitment-agencies"
			? filterSectionsRA
			: effectiveActiveTab === "global-buyers"
				? filterSectionsGlobalBuyers
				: filterSections;
	const currentIsFetchingNextPage =
		effectiveActiveTab === "recruitment-agencies"
			? isFetchingNextPage
			: effectiveActiveTab === "suppliers"
				? isFetchingNextPageSuppliers
				: isFetchingNextPageGlobalBuyers;
	const currentHasNextPage =
		effectiveActiveTab === "recruitment-agencies"
			? hasNextPage
			: effectiveActiveTab === "suppliers"
				? hasNextPageSuppliers
				: hasNextPageGlobalBuyers;
	const currentError =
		effectiveActiveTab === "recruitment-agencies"
			? recruitmentAgenciesError
			: effectiveActiveTab === "suppliers"
				? suppliersError
				: globalBuyersError;
	const hasBlockingError = Boolean(currentError && companiesState.length === 0);

	const [showMobileFilters, setShowMobileFilters] = useState(false);
	const tabItems = [
		{
			value: "recruitment-agencies" as const,
			label: t("navigation.recruitmentAgencies"),
			count: getDirectoryCount(recruitmentAgenciesData),
		},
		{
			value: "suppliers" as const,
			label: t("navigation.suppliers"),
			count: getDirectoryCount(suppliersData),
		},
		...(canViewGlobalBuyers
			? [
					{
						value: "global-buyers" as const,
						label: t("memberDirectoryPage.tabs.globalBuyers"),
						count: getDirectoryCount(globalBuyersData),
					},
				]
			: []),
	];

	return (
		<GuestLayout>
			<div className="flex flex-col gap-3 mb-3">
				{/* Top row: title + view toggle */}
				<div className="flex items-center justify-between gap-3">
					<h1 className="heading-display mb-xl uppercase tracking-[-0.022em]">
						{t("memberDirectoryPage.title")}
					</h1>
					<GroupTabButton
						activeView={viewMode}
						onViewChange={handleViewChange}
						showLabels={true}
						size="2"
					/>
				</div>
				{/* Search + mobile filter button */}
				<div className="flex items-center justify-between gap-3">
					<div className="w-full max-w-md">
						<SearchBox
							debounceMs={500}
							key={`member-directory-search-${effectiveActiveTab}`}
							onSearch={setSearchQuery}
							placeholder={t(
								effectiveActiveTab === "recruitment-agencies"
									? "memberDirectoryPage.search.recruitmentAgencies"
									: effectiveActiveTab === "global-buyers"
										? "memberDirectoryPage.search.globalBuyers"
										: "memberDirectoryPage.search.suppliers",
							)}
							value={searchQuery}
						/>
					</div>
					<button
						aria-label="Toggle filters"
						className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:border-[#148696] hover:text-[#148696] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] whitespace-nowrap"
						onClick={() => setShowMobileFilters((v) => !v)}
						type="button"
					>
						{showMobileFilters ? (
							<Cross2Icon height={14} width={14} />
						) : (
							<MixerHorizontalIcon height={14} width={14} />
						)}
						{t("memberDirectoryPage.filters.title")}
					</button>
				</div>
			</div>

			<div className="mb-5 border-b border-gray-200">
				<div className="flex flex-wrap items-center gap-5">
					{tabItems.map((item) => {
						const active = effectiveActiveTab === item.value;
						return (
							<button
								className={`relative flex items-center gap-1.5 pb-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] ${
									active
										? "text-[#004A60]"
										: "text-gray-600 hover:text-[#004A60]"
								}`}
								key={item.value}
								onClick={() => handleTabChange(item.value)}
								type="button"
							>
								<span>{item.label}</span>
								{typeof item.count === "number" && (
									<span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#148696] px-1 text-[10px] font-medium leading-none text-white">
										{item.count}
									</span>
								)}
								{active && (
									<span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#148696]" />
								)}
							</button>
						);
					})}
				</div>
			</div>

			{/* Mobile filter overlay */}
			<AnimatePresence>
				{showMobileFilters && (
					<>
						{/* Backdrop */}
						<motion.div
							animate={{ opacity: 1 }}
							className="fixed inset-0 z-40 bg-black/40 lg:hidden"
							exit={{ opacity: 0 }}
							initial={{ opacity: 0 }}
							key="filter-backdrop"
							onClick={() => setShowMobileFilters(false)}
						/>
						{/* Drawer */}
						<motion.div
							animate={{ x: 0 }}
							className="fixed bottom-0 left-0 right-0 z-50 lg:hidden max-h-[80vh] overflow-y-auto rounded-t-2xl shadow-xl"
							exit={{ x: "-100%" }}
							initial={{ x: "-100%" }}
							key="filter-drawer"
							transition={{ type: "spring", damping: 30, stiffness: 300 }}
						>
							<MemberDirectoryFilterPanel
								labels={{
									apply: t("memberDirectoryPage.filters.actions.apply"),
									deselectAll: t(
										"memberDirectoryPage.filters.actions.deselectAll",
									),
									reset: t("memberDirectoryPage.filters.actions.reset"),
									searchPlaceholder: t(
										"memberDirectoryPage.filters.actions.search",
									),
									selectAll: t("memberDirectoryPage.filters.actions.selectAll"),
								}}
								onClearAll={() => {
									handleClearAllFilters();
									setShowMobileFilters(false);
								}}
								sections={currentFilterSections}
								title={t("memberDirectoryPage.filters.title")}
							/>
						</motion.div>
					</>
				)}
			</AnimatePresence>

			{/* Main Content */}
			<div className="flex flex-col lg:flex-row gap-4 items-start">
				{/* Filter Sidebar — desktop sticky */}
				<div className="hidden lg:block w-60 xl:w-72 shrink-0 sticky top-6 self-start">
					<MemberDirectoryFilterPanel
						labels={{
							apply: t("memberDirectoryPage.filters.actions.apply"),
							deselectAll: t("memberDirectoryPage.filters.actions.deselectAll"),
							reset: t("memberDirectoryPage.filters.actions.reset"),
							searchPlaceholder: t(
								"memberDirectoryPage.filters.actions.search",
							),
							selectAll: t("memberDirectoryPage.filters.actions.selectAll"),
						}}
						onClearAll={handleClearAllFilters}
						sections={currentFilterSections}
						title={t("memberDirectoryPage.filters.title")}
					/>
				</div>
				{/* Content Area */}
				<div className="flex-1 min-w-0">
					{showInitialLoading && (
						<LoadingSpinner
							fullHeight={true}
							subtitle={t("memberDirectoryPage.states.loadingSubtitle")}
							title={t("memberDirectoryPage.states.loadingTitle")}
						/>
					)}

					{!showInitialLoading && hasBlockingError && (
						<div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
							<div className="mb-2 text-lg font-medium text-gray-700">
								{t("memberDirectoryPage.states.emptyTitle")}
							</div>
							<div className="text-sm text-gray-500">
								{t("memberDirectoryPage.states.emptyBody")}
							</div>
						</div>
					)}

					{!showInitialLoading && !hasBlockingError && viewMode === "grid" ? (
						/* Grid View - Responsive columns */
						<div
							className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
							key={`member-directory-grid-${effectiveActiveTab}`}
						>
							{companiesState?.map((com, index) => {
								const itemKey = getMemberDirectoryItemKey(
									effectiveActiveTab,
									com,
								);
								if (companiesState?.length === index + 1) {
									return (
										<div className="h-full" key={itemKey} ref={lastElementRef}>
											<MemberDirectoryCard data={com} index={index} />
										</div>
									);
								}
								return (
									<MemberDirectoryCard data={com} index={index} key={itemKey} />
								);
							})}
						</div>
					) : !showInitialLoading && !hasBlockingError ? (
						/* List View - Responsive */
						<div
							className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2"
							key={`member-directory-list-${effectiveActiveTab}`}
						>
							{companiesState?.map((com, index) => {
								const itemKey = getMemberDirectoryItemKey(
									effectiveActiveTab,
									com,
								);
								if (companiesState?.length === index + 1) {
									return (
										<div key={itemKey} ref={lastElementRef}>
											<MemberDirectoryListCard data={com} />
										</div>
									);
								}
								return <MemberDirectoryListCard data={com} key={itemKey} />;
							})}
						</div>
					) : null}

					{currentIsFetchingNextPage && (
						<div className="text-center p-4">
							{t("memberDirectoryPage.states.loadingMore")}
						</div>
					)}
					{!hasBlockingError &&
						!currentHasNextPage &&
						companiesState?.length > 0 && (
							<div className="text-center p-4 text-gray-500">
								{t("memberDirectoryPage.states.endReached")}
							</div>
						)}

					{!showInitialLoading &&
						!hasBlockingError &&
						companiesState?.length === 0 && (
							<div className="text-center py-12">
								<div className="text-gray-500 text-lg mb-2">
									{t("memberDirectoryPage.states.emptyTitle")}
								</div>
								<div className="text-gray-400 text-sm">
									{t("memberDirectoryPage.states.emptyBody")}
								</div>
							</div>
						)}
				</div>
			</div>

			{/* Results Count - Mobile friendly */}
			<div className="mt-6 text-center lg:text-left">
				<span className="text-sm text-gray-600">
					{/* Showing {companiesState?.length} of {companiesData.companies?.length} companies */}
				</span>
			</div>
		</GuestLayout>
	);
}

export const mapTheme = [
	{
		elementType: "geometry",
		stylers: [{ color: "#ededed" }],
	},
	{
		elementType: "geometry.stroke",
		stylers: [{ color: "#74afcc" }],
	},
	{
		featureType: "water",
		elementType: "geometry",
		stylers: [{ color: "#74afcc" }],
	},
];
