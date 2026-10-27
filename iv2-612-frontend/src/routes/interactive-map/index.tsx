import Slider from "@mui/material/Slider";
import { ArrowLeftIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { Badge, Flex, Text } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@workos-inc/authkit-react";
import axios from "axios";
import * as L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import styles from "$components/interactive-map/InteractiveMap.module.css";
import { MobileFilterModal } from "$components/interactive-map/MobileFilterModal";
import SupplierDetailPanel from "$components/interactive-map/SupplierDetailPanel";
import industryMarker from "$src/assets/img/industry_marker.svg";
import industryMarkerGrey from "$src/assets/img/industry_marker_grey.svg";
import { statusColorPalette } from "$src/assets/mock/common-data";
import MuiMultiSelectDropdown from "$src/components/business/MuiMultiSelectDropdown";
import CascadeButton from "$src/components/button/button";
import DoughnutChart from "$src/components/charts/DoughnutChart";
import { TermsAcceptModal } from "$src/components/modals/TermsAcceptModal";
import { useTermsGate } from "$src/hooks/useTermsGate";
import { authStatus } from "$src/queries/auth";
import useAuthData from "$src/store/store.auth";
import { handleSignIn } from "$src/utils/auth";
import { getInteractiveMapApiUrl } from "$src/utils/interactiveMapApi";

type Supplier = {
	supplier_id: number;
	supplier_name: string;
	industry: string;
	lat: number;
	lng: number;
	workers: number;
	supply_chain_member?: boolean;
};

type ApiSupplier = {
	suppliers: Supplier[];
};
type ApiIndustries = {
	results: { id: number; name: string }[];
};

type InteractiveMapAuthUser = {
	firstName?: string;
	email?: string;
	avatarUrl?: string | null;
};

type InteractiveMapAuthSnapshot = {
	isAuthenticated: boolean;
	displayName: string;
	initial: string;
	avatarUrl?: string;
};

// NOTE: this component uses `react-leaflet` for map rendering and clustering.

const getStringValue = (value: unknown) =>
	typeof value === "string" ? value : undefined;

const getStoredAuthUser = (): InteractiveMapAuthUser | null => {
	try {
		const raw = localStorage.getItem("auth_user");
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Record<string, unknown>;

		return {
			firstName:
				getStringValue(parsed.firstName) ?? getStringValue(parsed.first_name),
			email: getStringValue(parsed.email),
			avatarUrl:
				getStringValue(parsed.avatarUrl) ??
				getStringValue(parsed.profile_picture_url) ??
				null,
		};
	} catch {
		return null;
	}
};

const getInteractiveMapAuthSnapshot = (): InteractiveMapAuthSnapshot => {
	const { isAuthenticated } = authStatus();
	const storedUser = getStoredAuthUser();
	const displayName =
		storedUser?.firstName?.trim() || storedUser?.email || "Account";

	return {
		isAuthenticated,
		displayName,
		initial: displayName.charAt(0).toUpperCase() || "A",
		avatarUrl: storedUser?.avatarUrl || undefined,
	};
};

// Custom component to handle map panning and zooming
function MapController({
	center,
	zoom,
}: {
	center: [number, number];
	zoom: number;
}) {
	const map = useMap();

	useEffect(() => {
		// Approximate bounding box for Asia: SW [-11, 25], NE [80, 180]
		const ASIA_BOUNDS = L.latLngBounds(L.latLng(-11, 25), L.latLng(80, 180));

		// Restrict panning/zooming to the Asia region
		map.setMaxBounds(ASIA_BOUNDS);
		map.options.maxBoundsViscosity = 1.0;

		if (center && zoom) {
			const target = L.latLng(center[0], center[1]);
			if (ASIA_BOUNDS.contains(target)) {
				map.setView(center, zoom);
			} else {
				map.fitBounds(ASIA_BOUNDS);
			}
		}
	}, [center, zoom, map]);

	return null;
}

export const Route = createFileRoute("/interactive-map/")({
	component: RouteComponent,
});

export default function RouteComponent() {
	const { signOut } = useAuth();
	const { session } = useAuthData();
	const [authSnapshot, setAuthSnapshot] = useState(
		getInteractiveMapAuthSnapshot,
	);
	const termsGate = useTermsGate({
		isAuthenticated: authSnapshot.isAuthenticated,
		signOut,
		session,
	});
	const [supplierSearchText, setSupplierSearchText] = useState("");
	const [debouncedSupplierSearch, setDebouncedSupplierSearch] = useState("");
	const [selectedIndustryNames, setSelectedIndustryNames] = useState<string[]>(
		[],
	);
	const [workerRange, setWorkerRange] = useState<[number, number]>([0, 20000]);
	const [debouncedWorkerRange, setDebouncedWorkerRange] = useState<
		[number, number]
	>([0, 20000]);
	// const [moreFilters, setMoreFilters] = useState(false);
	const [activeTab, setActiveTab] = useState<"summary" | "suppliers">(
		"summary",
	);
	const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(
		null,
	);
	const mapRef = useRef<L.Map | null>(null);
	const [mapCenter, setMapCenter] = useState<[number, number]>([
		13.736717, 100.523186,
	]);
	const [mapZoom, setMapZoom] = useState(6);
	const [detailPanelSupplierId, setDetailPanelSupplierId] = useState<
		number | null
	>(null);
	const [showInfoModal, setShowInfoModal] = useState(false);
	const [showMobileFilterModal, setShowMobileFilterModal] = useState(false);

	useEffect(() => {
		const refreshAuthSnapshot = () => {
			setAuthSnapshot(getInteractiveMapAuthSnapshot());
		};
		const handleStorage = (event: StorageEvent) => {
			if (
				event.key === "auth_token" ||
				event.key === "auth_user" ||
				event.key === "auth-storage"
			) {
				refreshAuthSnapshot();
			}
		};

		window.addEventListener("storage", handleStorage);
		window.addEventListener("focus", refreshAuthSnapshot);

		return () => {
			window.removeEventListener("storage", handleStorage);
			window.removeEventListener("focus", refreshAuthSnapshot);
		};
	}, []);

	const handleSupplierCardClick = useCallback((supplier: Supplier) => {
		setSelectedSupplierId(supplier.supplier_id);
		setDetailPanelSupplierId(supplier.supplier_id);
		setMapCenter([supplier.lat, supplier.lng]);
		setMapZoom(16);
	}, []);

	const handleMarkerClick = useCallback((supplierId: number) => {
		setSelectedSupplierId(supplierId);
		setActiveTab("suppliers");
	}, []);

	const { data: industriesData } = useQuery({
		queryKey: ["industries"],
		queryFn: async () => {
			const url = getInteractiveMapApiUrl("industries");
			console.log("[Industries API] Remote Address:", url);
			const { data } = await axios.get<ApiIndustries>(url, {
				withCredentials: true,
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
			});
			return data.results;
		},
	});

	const { data: supplierDetail, isLoading: isLoadingDetail } = useQuery({
		queryKey: ["supplier-detail", detailPanelSupplierId],
		queryFn: async () => {
			if (!detailPanelSupplierId) return null;
			const url = getInteractiveMapApiUrl("supplier_full_detail");
			console.log("[Supplier Detail API] Remote Address:", url, "Params:", {
				supplier_id: detailPanelSupplierId,
			});
			const { data } = await axios.get(url, {
				params: { supplier_id: detailPanelSupplierId },
				withCredentials: true,
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
			});
			return data;
		},
		enabled: !!detailPanelSupplierId,
	});

	// Debounce supplier search
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSupplierSearch(supplierSearchText);
		}, 500);

		return () => clearTimeout(timer);
	}, [supplierSearchText]);

	// Debounce worker range
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedWorkerRange(workerRange);
		}, 500);

		return () => clearTimeout(timer);
	}, [workerRange]);

	const { data: suppliers = [], isLoading: loading } = useQuery({
		queryKey: ["suppliers-map", debouncedSupplierSearch, debouncedWorkerRange],
		queryFn: async () => {
			const params: Record<string, string> = {};
			if (debouncedSupplierSearch) {
				params.supplier_name = debouncedSupplierSearch;
			}
			if (
				debouncedWorkerRange &&
				(debouncedWorkerRange[0] !== 0 || debouncedWorkerRange[1] !== 20000)
			) {
				params.min_workers = debouncedWorkerRange[0].toString();
				params.max_workers = debouncedWorkerRange[1].toString();
			}
			const url = getInteractiveMapApiUrl("suppliers_map");
			console.log(
				"[Suppliers Map API] Remote Address:",
				url,
				"Params:",
				params,
			);
			const { data } = await axios.get<ApiSupplier>(url, {
				params,
				withCredentials: true,
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
			});
			return data.suppliers;
		},
		placeholderData: (previousData) => previousData,
	});

	const showMapLoading = loading;

	const allIndustries = useMemo(
		() => industriesData?.map((industry: any) => industry.name) || [],
		[industriesData],
	);

	const industryList = useMemo(
		() => allIndustries.map((name, idx) => ({ id: idx, name })),
		[allIndustries],
	);

	const filteredSuppliers = useMemo(() => {
		if (!suppliers?.length) return [];
		if (!selectedIndustryNames.length) return suppliers;
		return suppliers.filter((s) => selectedIndustryNames.includes(s.industry));
	}, [suppliers, selectedIndustryNames]);

	// Create custom Leaflet icons
	const memberIcon = useMemo(
		() =>
			L.icon({
				iconUrl: industryMarker,
				iconSize: [40, 50],
				iconAnchor: [20, 50],
				popupAnchor: [0, -50],
			}),
		[],
	);

	const memberIconSelected = useMemo(
		() =>
			L.icon({
				iconUrl: industryMarker,
				iconSize: [50, 62.5],
				iconAnchor: [25, 62.5],
				popupAnchor: [0, -62.5],
			}),
		[],
	);

	const nonMemberIcon = useMemo(
		() =>
			L.icon({
				iconUrl: industryMarkerGrey,
				iconSize: [40, 50],
				iconAnchor: [20, 50],
				popupAnchor: [0, -50],
			}),
		[],
	);

	const nonMemberIconSelected = useMemo(
		() =>
			L.icon({
				iconUrl: industryMarkerGrey,
				iconSize: [50, 62.5],
				iconAnchor: [25, 62.5],
				popupAnchor: [0, -62.5],
			}),
		[],
	);

	const summaryData = useMemo(() => {
		const counts: Record<string, number> = {};
		if (filteredSuppliers) {
			for (const s of filteredSuppliers)
				counts[s.industry || "Unknown"] =
					(counts[s.industry || "Unknown"] || 0) + 1;
		}
		return counts;
	}, [filteredSuppliers]);

	const chartData = useMemo(() => {
		return Object.entries(summaryData).map(([name, value]) => ({
			name: name === "null" ? "Unknown" : name,
			value,
		}));
	}, [summaryData]);

	return (
		<div
			className="flex w-full relative"
			style={{ height: "100vh", overflow: "hidden" }}
		>
			<aside
				aria-label="Map filters"
				className={`${styles.sidebar} hidden md:flex md:flex-col`}
				style={{ overflowY: "auto", height: "100vh" }}
			>
				<div className="flex items-center justify-between mb-l">
					<Flex
						align="center"
						className="cursor-pointer bg-black/10 p-2 rounded"
						gap="2"
						onClick={() => {
							window.location.href = "/";
						}}
						role="button"
						tabIndex={0}
					>
						<ArrowLeftIcon />
						Back
					</Flex>
					{authSnapshot.isAuthenticated ? (
						<button
							aria-label="Open account"
							className={styles.authAccountButton}
							onClick={() => {
								window.location.href = "/account";
							}}
							type="button"
						>
							<span aria-hidden="true" className={styles.authAccountAvatar}>
								{authSnapshot.avatarUrl ? (
									<img
										alt=""
										className={styles.authAccountAvatarImage}
										src={authSnapshot.avatarUrl}
									/>
								) : (
									authSnapshot.initial
								)}
							</span>
							<span className={styles.authAccountLabel}>
								{authSnapshot.displayName}
							</span>
						</button>
					) : (
						<CascadeButton
							buttonText="SIGN IN"
							handleOnClick={() => {
								void handleSignIn();
							}}
							size="3"
							variant="outline"
						/>
					)}
				</div>
				<div>
					<Text as="label" className="block mb-2" size="2" weight="medium">
						Search Suppliers
					</Text>
					<input
						className="w-full px-3 py-2 border border-[#D2D2D2] rounded-md focus:outline-none focus:ring-2 focus:ring-[#32b2c3] focus:border-transparent"
						onChange={(e) => setSupplierSearchText(e.target.value)}
						placeholder="Search by supplier name..."
						type="text"
						value={supplierSearchText}
					/>
				</div>

				<div style={{ marginTop: "1rem" }}>
					<MuiMultiSelectDropdown
						items={industryList}
						label="Industry"
						onChange={(ids) =>
							setSelectedIndustryNames(
								ids
									.map((id) => allIndustries[id as number])
									.filter(Boolean) as string[],
							)
						}
						placeholder="Select industries..."
						selectedIds={selectedIndustryNames.map((name) =>
							allIndustries.indexOf(name),
						)}
					/>
				</div>

				<div style={{ marginTop: "1rem" }}>
					<Text as="label" className="block mb-2" size="2" weight="medium">
						Number of Workers
					</Text>
					<div style={{ paddingLeft: "0.5rem", paddingRight: "0.5rem" }}>
						<Slider
							marks={[
								{ value: 0, label: "0" },
								{ value: 5000, label: "5K" },
								{ value: 10000, label: "10K" },
								{ value: 15000, label: "15K" },
								{ value: 20000, label: "20K" },
							]}
							max={20000}
							min={0}
							onChange={(_, value) => {
								if (Array.isArray(value)) {
									setWorkerRange([value[0], value[1]]);
								}
							}}
							size="small"
							step={50}
							value={workerRange}
						/>
					</div>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							marginTop: "0.75rem",
							fontSize: "12px",
							color: "#666",
						}}
					>
						<span>Min: {workerRange[0].toLocaleString()}</span>
						<span>Max: {workerRange[1].toLocaleString()}</span>
					</div>
				</div>

				{/* Urgent privacy request: hide Find / More filters controls.
				<div className={styles.controls}>
					<button
						className="btn btn-primary"
						onClick={() => {
							// find button currently just focuses map area; data already filtered via selected checkboxes
							setActiveTab("summary");
						}}
					>
						Find
					</button>
					<button
						className={styles.moreFiltersToggle}
						onClick={() => setMoreFilters((s) => !s)}
						type="button"
					>
						{moreFilters ? "Hide filters" : "More filters"}
					</button>
				</div>

				{moreFilters && (
					<div className="mt-3">
						<div className={styles.filterLabel}>Extra filters</div>
						<div className="text-sm text-slate-600">
							(placeholder for range, status, etc.)
						</div>
					</div>
				)}
				*/}

				<div className={styles.results}>
					<Badge className="text-red-900">Search Results</Badge>
					<div className={styles.tabs} role="tablist">
						<button
							className={`${styles.tabButton} ${activeTab === "summary" ? styles.tabActive : ""}`}
							onClick={() => setActiveTab("summary")}
							role="tab"
						>
							Summary
						</button>
						<button
							className={`${styles.tabButton} ${activeTab === "suppliers" ? styles.tabActive : ""}`}
							onClick={() => setActiveTab("suppliers")}
							role="tab"
						>
							Suppliers
						</button>
					</div>

					{activeTab === "summary" && (
						<div className={styles.summaryChart}>
							{/* Simple summary counts (replace with chart lib if desired) */}
							<DoughnutChart
								data={chartData}
								subtitle="Total Suppliers"
								title={filteredSuppliers.length.toLocaleString()}
							/>
							<hr className="my-4 opacity-10" />
							<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
								{Object.keys(summaryData).length === 0 && (
									<div className="text-sm text-slate-500">
										No data to summarize
									</div>
								)}
								{(() => {
									const maxValue = Math.max(...Object.values(summaryData));
									return Object.entries(summaryData).map(([k, v]) => (
										<div
											key={k}
											style={{ display: "flex", alignItems: "center", gap: 8 }}
										>
											<div
												className="text-sm"
												style={{ width: 120, fontWeight: 700 }}
											>
												{k}
											</div>
											<div
												style={{
													height: 10,
													flex: 1,
													background: "#e5e5e5",
													borderRadius: 100,
													alignItems: "center",
													display: "flex",
													paddingLeft: 4,
												}}
											>
												<div
													style={{
														width: `${(v / maxValue) * 100}%`,
														height: "50%",
														background: "#32b2c3",
														borderRadius: 6,
													}}
												/>
											</div>
											<div style={{ width: 40, textAlign: "right" }}>{v}</div>
										</div>
									));
								})()}
							</div>
						</div>
					)}

					{activeTab === "suppliers" && (
						<div className={styles.supplierList}>
							{loading ? (
								<p className="text-center text-slate-500">
									Loading suppliers...
								</p>
							) : (
								<p className="font-bold text-center">
									{filteredSuppliers.length} Suppliers Found
								</p>
							)}
							{/* <hr className="mb-2 opacity-10" /> */}
							<div className="overflow-y-auto max-h-[40vh] space-y-2">
								{filteredSuppliers.map((s) => (
									<div
										className={styles.supplierCard}
										key={s.supplier_id}
										onClick={() => handleSupplierCardClick(s)}
										style={{
											cursor: "pointer",
											background:
												selectedSupplierId === s.supplier_id
													? "#e0f2f4"
													: undefined,
											border:
												selectedSupplierId === s.supplier_id
													? "2px solid #32b2c3"
													: undefined,
											transition: "all 0.2s ease",
										}}
									>
										<div style={{ fontWeight: 700 }}>{s.supplier_name}</div>
										<div style={{ fontSize: 12, color: "#475569" }}>
											{s.industry}
										</div>
									</div>
								))}
							</div>
							{filteredSuppliers?.length === 0 && !loading && (
								<div className="text-sm text-slate-500">
									No suppliers match.
								</div>
							)}
						</div>
					)}
				</div>
			</aside>

			{/* Info Icon Button */}

			<main
				aria-label="Map view"
				className={`${styles.mapArea} w-full md:flex-1`}
				style={{
					position: "relative",
					height: "100vh",
					width: "100%",
				}}
			>
				{/* Mobile Filter Button - Visible only on small screens */}
				<Flex
					justify={"center"}
					position={"absolute"}
					top={"1rem"}
					width={"100%"}
				>
					<button
						aria-label="Open filters"
						className="absolute md:hidden z-20"
						onClick={() => setShowMobileFilterModal(true)}
						style={{
							background: statusColorPalette[5],
							color: "white",
							border: "none",
							borderRadius: "6px",
							padding: "0.5rem 1rem",
							cursor: "pointer",
							fontSize: "16px",
							fontWeight: 600,
							boxShadow: "0 4px 12px rgba(50, 178, 195, 0.3)",
							transition: "all 0.2s ease",
							zIndex: 1000,
						}}
						type="button"
					>
						☰ Filters
					</button>
				</Flex>
				<button
					aria-label="Map information"
					onClick={() => setShowInfoModal(true)}
					onMouseEnter={(e) => {
						e.currentTarget.style.transform = "scale(1.1)";
						e.currentTarget.style.boxShadow =
							"0 8px 24px rgba(15, 23, 42, 0.12)";
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.transform = "scale(1)";
						e.currentTarget.style.boxShadow =
							"0 6px 18px rgba(15, 23, 42, 0.06)";
					}}
					style={{
						position: "absolute",
						top: "1rem",
						right: "1rem",
						background: "white",
						border: "none",
						borderRadius: "50%",
						width: "44px",
						height: "44px",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						cursor: "pointer",
						boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
						zIndex: 1000,
						transition: "all 0.2s ease",
					}}
					type="button"
				>
					<InfoCircledIcon color="#32b2c3" height={24} width={24} />
				</button>
				{!showMapLoading && (
					<div className={styles.legend}>
						<Flex align={"center"} gap={"2"} mb={"2"}>
							<img alt="member-marker" src={industryMarker} width={25} />
							Member
						</Flex>
						<Flex align={"center"} gap={"2"}>
							<img
								alt="non-member-marker"
								src={industryMarkerGrey}
								width={25}
							/>
							Non-Member
						</Flex>
					</div>
				)}
				{/* Map: using @react-google-maps/api with marker clustering */}
				{showMapLoading ? (
					<div className={styles.mapPlaceholder}>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: "1rem",
							}}
						>
							<div
								style={{
									width: "40px",
									height: "40px",
									border: "4px solid #f3f3f3",
									borderTop: "4px solid #32b2c3",
									borderRadius: "50%",
									animation: "spin 1s linear infinite",
								}}
							/>
							<div style={{ color: "#666", fontSize: "14px" }}>
								Loading suppliers and preparing map clusters...
							</div>
						</div>
						<style>{`
							@keyframes spin {
								0% { transform: rotate(0deg); }
								100% { transform: rotate(360deg); }
							}
						`}</style>
					</div>
				) : (
					<MapContainer
						center={[13.736717, 100.523186]}
						maxZoom={20}
						minZoom={3}
						ref={mapRef}
						style={{ width: "100%", height: "100%" }}
						zoom={6}
					>
						{/* CARTO Voyager renders English place names; see ChoroplethMap. */}
						<TileLayer
							attribution="&copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, TomTom"
							url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
						/>
						<MapController center={mapCenter} zoom={mapZoom} />
						<MarkerClusterGroup
							chunkedLoading
							iconCreateFunction={(cluster) => {
								const count = cluster.getChildCount();
								let size = 40;
								let className = "marker-cluster-small";

								if (count > 100) {
									size = 60;
									className = "marker-cluster-large";
								} else if (count > 10) {
									size = 50;
									className = "marker-cluster-medium";
								}

								return L.divIcon({
									html: `<div><span>${count}</span></div>`,
									className: `marker-cluster ${className}`,
									iconSize: L.point(size, size),
								});
							}}
							maxClusterRadius={80}
							showCoverageOnHover={false}
							spiderfyOnMaxZoom={true}
							zoomToBoundsOnClick={true}
						>
							{filteredSuppliers?.map((s) => {
								const isSelected = selectedSupplierId === s.supplier_id;
								const icon = s.supply_chain_member
									? isSelected
										? memberIconSelected
										: memberIcon
									: isSelected
										? nonMemberIconSelected
										: nonMemberIcon;

								return (
									<Marker
										eventHandlers={{
											click: () => handleMarkerClick(s.supplier_id),
										}}
										icon={icon}
										key={s.supplier_id}
										position={[s.lat, s.lng]}
									>
										<Popup autoPan={false}>
											<div style={{ padding: "8px", maxWidth: "300px" }}>
												<div
													onClick={() =>
														setDetailPanelSupplierId(s.supplier_id)
													}
													style={{
														fontWeight: 700,
														fontSize: "16px",
														marginBottom: "4px",
														color: "#1a1a1a",
														textDecoration: "underline",
														cursor: "pointer",
													}}
												>
													{s.supplier_name}
												</div>
												<div
													style={{
														fontSize: "12px",
														color: "#666",
													}}
												>
													{s.industry}
												</div>
												{s.workers > 0 && (
													<div
														style={{
															fontSize: "12px",
															color: "#666",
															marginTop: "4px",
														}}
													>
														Workers: {s.workers.toLocaleString()}
													</div>
												)}
											</div>
										</Popup>
									</Marker>
								);
							})}
						</MarkerClusterGroup>
					</MapContainer>
				)}
			</main>
			<SupplierDetailPanel
				industriesData={industriesData}
				isLoading={isLoadingDetail}
				onClose={() => {
					setDetailPanelSupplierId(null);
					setSelectedSupplierId(null);
				}}
				supplierDetail={supplierDetail}
			/>

			{/* Info Modal */}
			{showInfoModal && (
				<>
					{/* Modal Backdrop */}
					<div
						className="fixed inset-0 bg-black/50 z-[999]"
						onClick={() => setShowInfoModal(false)}
						style={{ transition: "opacity 0.3s ease" }}
					/>

					{/* Modal Content */}
					<div
						aria-modal="true"
						role="dialog"
						style={{
							position: "fixed",
							top: "50%",
							left: "50%",
							transform: "translate(-50%, -50%)",
							width: "90%",
							maxWidth: "600px",
							maxHeight: "90vh",
							background: "white",
							borderRadius: "12px",
							boxShadow:
								"0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
							zIndex: 1000,
							overflowY: "auto",
							transition: "all 0.3s ease",
						}}
					>
						<div style={{ padding: "2rem" }}>
							<Flex align="center" justify="between" mb="4">
								<Flex align="center" gap="2">
									<InfoCircledIcon color="#32b2c3" height={24} width={24} />
									<Text size="6" weight="bold">
										Interactive Map Guide
									</Text>
								</Flex>
								<button
									onClick={() => setShowInfoModal(false)}
									onMouseEnter={(e) => {
										e.currentTarget.style.background = "#f3f4f6";
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.background = "none";
									}}
									style={{
										background: "none",
										border: "none",
										cursor: "pointer",
										padding: "0.5rem",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										borderRadius: "4px",
										transition: "background 0.2s",
									}}
									type="button"
								>
									<span style={{ fontSize: "24px", lineHeight: 1 }}>×</span>
								</button>
							</Flex>

							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "1.5rem",
								}}
							>
								<div className="bg-gray-100 p-m rounded border border-[#D2D2D2]">
									<Text as="div" mb="2" size="4" weight="bold">
										Navigation
									</Text>
									<ul
										style={{
											margin: 0,
											paddingLeft: "1.5rem",
											lineHeight: 1.8,
										}}
									>
										<li>
											<Text size="3">Click and drag to pan the map</Text>
										</li>
										<li>
											<Text size="3">Scroll to zoom in/out</Text>
										</li>
										<li>
											<Text size="3">Use +/- buttons to zoom</Text>
										</li>
									</ul>
								</div>

								<div className="bg-gray-100 p-m rounded border border-[#D2D2D2]">
									<Text as="div" mb="2" size="4" weight="bold">
										Markers & Clusters
									</Text>
									<ul
										style={{
											margin: 0,
											paddingLeft: "1.5rem",
											lineHeight: 1.8,
										}}
									>
										<li>
											<Text size="3">
												<strong>Blue markers:</strong> Member suppliers
											</Text>
										</li>
										<li>
											<Text size="3">
												<strong>Gray markers:</strong> Non-member suppliers
											</Text>
										</li>
										<li>
											<Text size="3">
												<strong>Circular clusters:</strong> Groups of nearby
												suppliers (click to expand)
											</Text>
										</li>
										<li>
											<Text size="3">
												Click any marker to view supplier details
											</Text>
										</li>
									</ul>
								</div>

								<div className="bg-gray-100 p-m rounded border border-[#D2D2D2]">
									<Text as="div" mb="2" size="4" weight="bold">
										Filters
									</Text>
									<ul
										style={{
											margin: 0,
											paddingLeft: "1.5rem",
											lineHeight: 1.8,
										}}
									>
										<li>
											<Text size="3">
												<strong>Search:</strong> Find suppliers by name
											</Text>
										</li>
										<li>
											<Text size="3">
												<strong>Industry:</strong> Filter by industry type
											</Text>
										</li>
										<li>
											<Text size="3">
												<strong>Workers:</strong> Filter by number of workers
												(0-20,000)
											</Text>
										</li>
									</ul>
								</div>

								<div className="bg-gray-100 p-m rounded border border-[#D2D2D2]">
									<Text as="div" mb="2" size="4" weight="bold">
										Tabs
									</Text>
									<ul
										style={{
											margin: 0,
											paddingLeft: "1.5rem",
											lineHeight: 1.8,
										}}
									>
										<li>
											<Text size="3">
												<strong>Summary:</strong> View industry distribution
												chart
											</Text>
										</li>
										<li>
											<Text size="3">
												<strong>Suppliers:</strong> Browse list of filtered
												suppliers
											</Text>
										</li>
									</ul>
								</div>

								<div
									style={{
										padding: "1rem",
										background: "#f8fafc",
										borderRadius: "8px",
										border: "1px solid #e2e8f0",
									}}
								>
									<Text size="2" style={{ color: "#64748b" }}>
										<strong>Tip:</strong> Click on a supplier card in the
										sidebar to zoom to its location on the map
									</Text>
								</div>
							</div>
						</div>
					</div>
				</>
			)}

			{/* Mobile Filter Modal */}
			{/* Urgent privacy request: hidden mobile filter controls previously used:
			moreFilters={moreFilters}
			onFindClick={() => setActiveTab("summary")}
			onMoreFiltersToggle={() => setMoreFilters((s) => !s)}
			*/}
			<MobileFilterModal
				allIndustries={allIndustries}
				industryList={industryList}
				isOpen={showMobileFilterModal}
				onClose={() => setShowMobileFilterModal(false)}
				onIndustryChange={(ids) =>
					setSelectedIndustryNames(
						ids
							.map((id) => allIndustries[id as number])
							.filter(Boolean) as string[],
					)
				}
				onSupplierSearchChange={setSupplierSearchText}
				onWorkerRangeChange={setWorkerRange}
				selectedIndustryNames={selectedIndustryNames}
				supplierSearchText={supplierSearchText}
				workerRange={workerRange}
			/>
			<TermsAcceptModal
				error={termsGate.error}
				isSubmitting={termsGate.isSubmitting}
				onAccept={termsGate.onAccept}
				onDecline={termsGate.onDecline}
				open={termsGate.open}
			/>
		</div>
	);
}
