import * as Icons from "@mui/icons-material";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CatalogView } from "$src/components/marketplace/CatalogView";
import { MarketplaceSidebar } from "$src/components/marketplace/CommonComponents";
import { DashboardView } from "$src/components/marketplace/DashboardView";
import { PlanView } from "$src/components/marketplace/PlanView";
import { useStrategicPartners } from "$src/hooks/useSupplyChain";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { useCascadeIndex } from "$src/queries/useCascadeIndex";
import { useSupplierName } from "$src/queries/useSupplierName";
import { useViewModeStore } from "$src/store/viewModeStore";
import { requireSupplierAuth } from "$src/utils/auth";
import { useMockData } from "$src/utils/config";
import { getUserIdentifiers } from "$src/utils/getUserIdentifiers";

// Using 'as any' here because the TanStack Router type registry (routeTree.gen.ts)
// sometimes takes a moment to sync in the IDE after creating a new route file.
export const Route = createFileRoute("/cascade-marketplace")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireSupplierAuth({ isAuthenticated, role });
	},
	component: CascadeMarketplacePage,
});

type Tab = "dashboard" | "catalog" | "plan";

const normalizeTab = (value: string | null): Tab => {
	switch (value) {
		case "catalog":
		case "Solutions Catalog":
			return "catalog";
		case "plan":
		case "Improvement Plan":
			return "plan";
		case "dashboard":
		case "CASCADE Marketplace Dashboard":
		default:
			return "dashboard";
	}
};

function CascadeMarketplacePage() {
	const { t } = useTranslation();
	const ACTIVE_TAB_KEY = "cascade-marketplace-active-tab";
	const [activeTab, setActiveTab] = useState<Tab>(() => {
		try {
			return normalizeTab(localStorage.getItem(ACTIVE_TAB_KEY));
		} catch {
			return "dashboard";
		}
	});
	const LOCAL_STORAGE_KEY = "cascade-marketplace-plan";
	const [planItems, setPlanItems] = useState<any[]>(() => {
		try {
			const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
			return raw ? JSON.parse(raw) : [];
		} catch (e) {
			console.error("Failed to parse plan from localStorage", e);
			return [];
		}
	});

	useEffect(() => {
		try {
			localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(planItems));
		} catch (e) {
			console.error("Failed to persist plan to localStorage", e);
		}
	}, [planItems]);

	useEffect(() => {
		try {
			localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
		} catch {
			/* ignore */
		}
	}, [activeTab]);

	useEffect(() => {
		try {
			const target = localStorage.getItem("cascade-marketplace-target-tab");
			if (target) {
				setActiveTab(normalizeTab(target));
				localStorage.removeItem("cascade-marketplace-target-tab");
			}
		} catch {
			// ignore
		}
	}, []);

	const shouldUseMockData = useMockData();
	const viewMode = useViewModeStore((state) => state.viewMode);

	const { isSupplier, partnerId, supplierId } = getUserIdentifiers();
	const isSupplierContext = isSupplier || viewMode === "supplier-view";

	// Keep marketplace mock identity consistent across global partner and supplier
	// contexts so the tester UI never exposes real partner or supplier identities.
	const effectivePartnerId = shouldUseMockData ? 28 : partnerId;
	const effectiveSupplierId = isSupplierContext
		? shouldUseMockData
			? 28
			: supplierId
		: null;

	const { data: cascadeIndex } = useCascadeIndex(
		effectiveSupplierId,
		isSupplierContext ? null : effectivePartnerId,
	);
	const { data: strategicPartners = [] } = useStrategicPartners();
	const realPartnerName = strategicPartners.find(
		(p) => p.id === partnerId,
	)?.name;
	const { data: supplierDisplayNameLookup } = useSupplierName(
		isSupplierContext ? effectiveSupplierId : null,
	);
	const supplierDisplayName =
		supplierDisplayNameLookup || t("cascadeMarketplace.supplierFallback");
	const effectivePartnerName = shouldUseMockData
		? isSupplierContext
			? "Test Supplier"
			: "Test SP"
		: isSupplierContext
			? supplierDisplayName
			: realPartnerName;

	const wvScore = cascadeIndex?.wvScore ?? 0;
	const currentCiScore = cascadeIndex?.ciScore ?? 50;
	const finalScore =
		cascadeIndex?.finalScore ??
		Math.round(wvScore * 0.65 + currentCiScore * 0.35);

	const handleAddToPlan = (
		solution: any,
		meta?: { action?: "self" | "sponsor" | "recommend"; partners?: any[] },
	) => {
		const partners =
			(meta?.partners || []).map((p) => {
				if (typeof p === "number") {
					return { id: p, code: `S-${String(p).padStart(3, "0")}` };
				}
				if (typeof p === "string") {
					return { code: p };
				}
				return {
					id: p.id,
					name: p.name,
					country: p.country,
					code: p.code || `S-${String(p.id).padStart(3, "0")}`,
				};
			}) || [];
		const action = meta?.action || "self";
		const newItem = { ...solution, partners, action };

		const existsIndex = planItems.findIndex((item) => item.id === solution.id);
		if (existsIndex === -1) {
			setPlanItems([...planItems, newItem]);
		} else {
			const updated = [...planItems];
			updated[existsIndex] = { ...updated[existsIndex], ...newItem };
			setPlanItems(updated);
		}
	};

	const handleRemoveFromPlan = (id: number) => {
		setPlanItems(planItems.filter((item) => item.id !== id));
	};

	const tabLabels: Record<Tab, string> = {
		dashboard: t("cascadeMarketplace.tabs.dashboard"),
		catalog: t("cascadeMarketplace.tabs.catalog"),
		plan: t("cascadeMarketplace.tabs.plan"),
	};

	const tabs: { id: Tab; icon: any }[] = [
		{
			id: "dashboard",
			icon: (
				<Icons.Dashboard
					style={{
						color: "#1aaec3",
					}}
				/>
			),
		},
		{
			id: "catalog",
			icon: (
				<Icons.LibraryBooks
					style={{
						color: "#1aaec3",
					}}
				/>
			),
		},
		{
			id: "plan",
			icon: (
				<Icons.ShoppingCart
					style={{
						color: "#1aaec3",
					}}
				/>
			),
		},
	];

	return (
		<GuestLayout>
			<div className="min-h-screen">
				{/* Secondary Header */}
				<header className="border-b border-gray-100 sticky top-0 z-40 backdrop-blur-md">
					<div className="px-6 h-20 flex items-center justify-between font-outfit">
						<div className="flex items-center gap-12">
							<div className="flex items-center gap-3">
								<span className="text-xl font-black tracking-tighter">
									{t("cascadeMarketplace.appName")}
								</span>
							</div>

							<nav className="flex gap-4">
								{tabs.map((tab) => (
									<button
										className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
											activeTab === tab.id
												? "bg-[#148696] text-white"
												: "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
										}`}
										key={tab.id}
										onClick={() => setActiveTab(tab.id)}
									>
										<span className="scale-90 opacity-70">{tab.icon}</span>
										{tabLabels[tab.id]}
										{tab.id === "plan" && planItems.length > 0 && (
											<span className="ml-1 w-5 h-5 bg-[#523bae] text-white text-[10px] rounded-full flex items-center justify-center">
												{planItems.length}
											</span>
										)}
									</button>
								))}
							</nav>
						</div>

						<div className="text-right">
							<div className="text-sm font-bold text-[#004A60]">
								{effectivePartnerName ?? "—"}
							</div>
							<div className="text-[10px] text-gray-400 uppercase font-medium">
								{isSupplierContext
									? `${t("cascadeMarketplace.supplierIdLabel")}: ${effectiveSupplierId ?? "—"}`
									: `${t("cascadeMarketplace.partnerIdLabel")}: ${effectivePartnerId}`}
							</div>
						</div>
					</div>
				</header>

				<main className=" mx-auto px-6 py-12">
					<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
						{/* Main Content Area */}
						<div className="lg:col-span-3">
							{!(activeTab === "plan" && planItems.length > 0) && (
								<header className="mb-12">
									<h1 className="mb-xl uppercase tracking-[-0.022em] heading-display">
										{tabLabels[activeTab]}
									</h1>
									<p className="text-gray-700 text-sm md:text-base mb-4 no-print">
										{activeTab === "dashboard" &&
											t("cascadeMarketplace.dashboardDescription")}
										{activeTab === "catalog" &&
											t("cascadeMarketplace.catalogDescription")}
									</p>
								</header>
							)}

							<AnimatePresence mode="wait">
								<motion.div
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -20 }}
									initial={{ opacity: 0, x: 20 }}
									key={activeTab}
									transition={{ duration: 0.2 }}
								>
									{activeTab === "dashboard" && (
										<DashboardView
											ciScore={currentCiScore}
											finalScore={finalScore}
											isSupplierContext={isSupplierContext}
											mock={shouldUseMockData}
											onBrowse={() => setActiveTab("catalog")}
											wvScore={wvScore}
										/>
									)}
									{activeTab === "catalog" && (
										<CatalogView
											isSupplierContext={isSupplierContext}
											mock={shouldUseMockData}
											onAdd={handleAddToPlan}
											planIds={planItems.map((p) => p.id)}
											supplierScores={cascadeIndex?.supplierScores ?? []}
										/>
									)}
									{activeTab === "plan" && (
										<PlanView
											onAdd={handleAddToPlan}
											onBrowse={() => setActiveTab("catalog")}
											onClearAll={() => {
												setPlanItems([]);
												try {
													localStorage.removeItem(LOCAL_STORAGE_KEY);
												} catch {
													/* ignore */
												}
											}}
											onRemove={handleRemoveFromPlan}
											planItems={planItems}
										/>
									)}
								</motion.div>
							</AnimatePresence>
						</div>

						{/* Sidebar */}
						<aside className="lg:col-span-1">
							<div className="sticky top-28 space-y-6">
								<MarketplaceSidebar
									ciScore={currentCiScore}
									currentScore={finalScore}
									itemCount={planItems.length}
									onBrowse={() => setActiveTab("catalog")}
									onViewPlan={() => setActiveTab("plan")}
									projectedWeight={Math.min(
										planItems.reduce((sum, item) => sum + item.impact, 0),
										20,
									)}
									wvScore={wvScore}
								/>
							</div>
						</aside>
					</div>
				</main>
			</div>
		</GuestLayout>
	);
}

export default CascadeMarketplacePage;
