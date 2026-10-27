import type { GridPaginationModel } from "@mui/x-data-grid";
import { useEffect, useMemo, useRef, useState } from "react";
import ChoroplethMap from "$components/interactive-map/ChoroplethMap";
import ServerPaginatedDataTable from "$components/tables/ServerPaginatedDataTable";
import { useChoroplethData } from "$hooks/useChoroplethData";
import { useSupplyChainSuppliersTable } from "$hooks/useSupplyChainSuppliersTable";
import type { FilterBarFilters } from "$src/components/ui/FilterBar";
import LiveStatusBar from "../dashboard/LiveStatusBar";

interface SupplyChainCoverageProps {
	filters?: FilterBarFilters;
}

export default function SupplyChainCoverage({
	filters,
}: SupplyChainCoverageProps) {
	const showDataTable = true;
	const [tablePage, setTablePage] = useState(0);
	const [tablePageSize, setTablePageSize] = useState(20);
	const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});
	const [hoveredSupplierId, setHoveredSupplierId] = useState<
		number | string | null
	>(null);
	const [clickedSupplierId, setClickedSupplierId] = useState<
		number | string | null
	>(null);
	const [mapBounds, setMapBounds] = useState<{
		ne_lat: number;
		ne_lng: number;
		sw_lat: number;
		sw_lng: number;
	} | null>(null);
	const [debouncedMapBounds, setDebouncedMapBounds] = useState<{
		ne_lat: number;
		ne_lng: number;
		sw_lat: number;
		sw_lng: number;
	} | null>(null);

	useEffect(() => {
		setTablePage(0);
	}, [columnSearch]);

	useEffect(() => {
		const timer = setTimeout(() => {
			// Page reset is batched with the new bounds so the first query for the
			// new viewport can't still ask for a page the smaller result set no
			// longer has — that request comes back empty and blanks the table.
			setDebouncedMapBounds(mapBounds);
			setTablePage(0);
		}, 300);
		return () => clearTimeout(timer);
	}, [mapBounds]);

	const selectedCountries = (filters?.countries ?? []).filter(Boolean);
	const selectedProvinces = (filters?.provinces ?? []).filter(Boolean);
	const selectedDistricts = (filters?.districts ?? []).filter(Boolean);
	const selectedIndustries = (filters?.industries ?? [])
		.filter(Boolean)
		.map(String);
	const selectedStrategicPartnerGroupings = (
		filters?.strategicPartnerGroupings ?? []
	).filter(Boolean);
	const parsedPartnerIds = (filters?.strategicPartners ?? [])
		.filter(Boolean)
		.map((partnerId) => Number(partnerId))
		.filter((partnerId) => Number.isFinite(partnerId));
	const previousFilterSignatureRef = useRef<string | null>(null);

	const filterSignature = useMemo(
		() =>
			JSON.stringify({
				countries: [...selectedCountries].sort(),
				provinces: [...selectedProvinces].sort(),
				districts: [...selectedDistricts].sort(),
				industries: [...selectedIndustries].sort(),
				strategicPartnerGroupings: [
					...selectedStrategicPartnerGroupings,
				].sort(),
				partnerIds: [...parsedPartnerIds].sort((a, b) => a - b),
			}),
		[
			parsedPartnerIds,
			selectedCountries,
			selectedProvinces,
			selectedDistricts,
			selectedIndustries,
			selectedStrategicPartnerGroupings,
		],
	);

	useEffect(() => {
		if (previousFilterSignatureRef.current == null) {
			previousFilterSignatureRef.current = filterSignature;
			return;
		}

		if (previousFilterSignatureRef.current !== filterSignature) {
			setTablePage(0);
			previousFilterSignatureRef.current = filterSignature;
		}
	}, [filterSignature]);

	const { dashboardData, markers, searchSignature } = useChoroplethData({
		country:
			selectedCountries.length > 0 ? selectedCountries.join(",") : undefined,
		forceApi: true,
		province:
			selectedProvinces.length > 0 ? selectedProvinces.join(",") : undefined,
		district:
			selectedDistricts.length > 0 ? selectedDistricts.join(",") : undefined,
		industry:
			selectedIndustries.length > 0 ? selectedIndustries.join(",") : undefined,
		partnerId: parsedPartnerIds.length > 0 ? parsedPartnerIds : undefined,
		strategicPartnerGrouping:
			selectedStrategicPartnerGroupings.length > 0
				? selectedStrategicPartnerGroupings.join(",")
				: undefined,
		supplierId: undefined,
		allSuppliers: true,
		search: columnSearch,
	});

	const hasColumnSearch = useMemo(
		() => Object.values(columnSearch).some((value) => value?.trim()),
		[columnSearch],
	);

	// While a column search is active the search *is* the filter — the map is
	// following it, so feeding the map's viewport back in would double-filter
	// the table (and drop any match that has no coordinates). Once the search is
	// cleared, the map area governs the table again.
	const tableBounds = hasColumnSearch
		? {}
		: {
				ne_lat: debouncedMapBounds?.ne_lat,
				ne_lng: debouncedMapBounds?.ne_lng,
				sw_lat: debouncedMapBounds?.sw_lat,
				sw_lng: debouncedMapBounds?.sw_lng,
			};

	const { data: suppliersTableData } = useSupplyChainSuppliersTable({
		country: selectedCountries,
		province: selectedProvinces,
		district: selectedDistricts,
		industry: selectedIndustries,
		page: tablePage + 1,
		pageSize: tablePageSize,
		partnerId: parsedPartnerIds,
		spGrouping: selectedStrategicPartnerGroupings,
		search: columnSearch,
		enabled: showDataTable,
		...tableBounds,
	});

	const totalRows = suppliersTableData?.count ?? 0;

	const handleTablePaginationChange = (model: GridPaginationModel) => {
		setTablePage(model.page);
		setTablePageSize(model.pageSize);
	};

	const tableRows = useMemo(
		() =>
			(suppliersTableData?.results ?? []).map((row, index) => {
				const rawWorkerVoiceStatus =
					row.worker_voice_status_name ?? row.worker_voice_status ?? "-";
				return {
					id:
						row.id ??
						row.supplier_id ??
						`${row.supplier_name ?? "supplier"}-${index}`,
					// Every active partner for the supplier, search-matched one first
					// (the backend sorts them). De-duplicated by name because a
					// supplier can sit in several supply chains owned by the same
					// partner, which would otherwise repeat that name.
					strategicPartner:
						[
							...new Set(
								(row.strategic_partners ?? [])
									.map((partner) => partner.name)
									.filter(Boolean),
							),
						].join(", ") || "-",
					strategicPartnerGrouping:
						row.strategic_partner_grouping_name ??
						row.strategic_partner_grouping ??
						"-",
					supplierName: row.supplier_name ?? row.name ?? "-",
					country: row.country_name ?? "-",
					province: row.province_name ?? "-",
					district: row.district_name ?? "-",
					industries:
						(row.industries ?? [])
							.map((industry) => industry.name)
							.join(", ") ?? "-",
					tier:
						typeof row.tier_id === "number" || typeof row.tier_id === "string"
							? String(row.tier_id)
							: typeof row.tier === "number" || typeof row.tier === "string"
								? String(row.tier)
								: "-",
					workerVoiceStatus: rawWorkerVoiceStatus
						.toString()
						.replace(/_/g, " ")
						.replace(/\b\w/g, (char) => char.toUpperCase()),
				};
			}),
		[suppliersTableData],
	);

	const tableColumns = useMemo(
		() => [
			{
				field: "strategicPartner",
				headerName: "Strategic Partner",
				flex: 1.2,
				minWidth: 180,
			},
			{
				field: "strategicPartnerGrouping",
				headerName: "Strategic Partner Grouping",
				flex: 1.3,
				minWidth: 200,
			},
			{
				field: "supplierName",
				headerName: "Supplier Name",
				flex: 1.2,
				minWidth: 180,
			},
			{
				field: "country",
				headerName: "Country",
				flex: 0.8,
				minWidth: 120,
			},
			{
				field: "province",
				headerName: "Province",
				flex: 1,
				minWidth: 160,
			},
			{
				field: "district",
				headerName: "District",
				flex: 1,
				minWidth: 160,
			},
			{
				field: "industries",
				headerName: "Industry",
				flex: 1,
				minWidth: 150,
			},
			{
				field: "tier",
				headerName: "Tier",
				flex: 0.6,
				minWidth: 90,
			},
			{
				field: "workerVoiceStatus",
				headerName: "Worker Voice Status",
				flex: 1.4,
				minWidth: 220,
			},
		],
		[],
	);

	return (
		<div>
			{/* Live Status */}
			<section className="mb-10">
				<h5 className="text-sm  text-gray-600 mb-1">
					Worker Voice Roll-out and Ongoing Engagement
				</h5>
				<h2 className="heading-display mb-4">
					WORKER VOICE COVERAGE: LIVE STATUS MONITOR
				</h2>
				<div className="grid gap-8">
					<LiveStatusBar
						summary={(dashboardData as any)?.worker_voice_summary_tier1}
						title="Tier 1 – Export-level Factories"
					/>
					<LiveStatusBar
						summary={(dashboardData as any)?.worker_voice_summary_tier23}
						title="Tier 2 & 3 – Upstream Farms, Mills & Fishing Vessels"
					/>
				</div>
			</section>
			<hr className="my-5 border-gray-200" />
			{/* Interactive Map and Data Table - Side by Side */}
			<section>
				<h2 className="heading-display mb-4">Interactive Map</h2>
				<p className="text-gray-600 mb-6">
					Real-time monitoring of worker voice coverage across all multi-tier
					supplier sites in the global supply chains
				</p>

				<div className="flex flex-col gap-6">
					{/* Map, full width */}
					<ChoroplethMap
						clickedSupplierId={clickedSupplierId}
						height="60vh"
						hoveredSupplierId={hoveredSupplierId}
						markers={markers}
						onBoundsChange={setMapBounds}
						onMarkerActivate={setHoveredSupplierId}
						searchSignature={searchSignature}
					/>

					{/* Live data table, beneath the map */}
					{showDataTable && (
						<div className="flex flex-col">
							<div className="flex-1 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
								<ServerPaginatedDataTable
									columnSearch={columnSearch}
									columns={tableColumns}
									highlightedRowId={hoveredSupplierId}
									onColumnSearchChange={setColumnSearch}
									onPaginationModelChange={handleTablePaginationChange}
									onRowClick={setClickedSupplierId}
									onRowHover={setHoveredSupplierId}
									pageSizeOptions={[10, 20, 30, 50]}
									paginationModel={{ page: tablePage, pageSize: tablePageSize }}
									rowCount={totalRows}
									rows={tableRows}
								/>
							</div>
							<div className="mb-4 text-right mt-2">
								<p className="text-sm text-gray-600 font-semibold">
									Showing {tableRows.length} of {totalRows} suppliers
									{hasColumnSearch
										? " matching your search"
										: " within map area"}
								</p>
							</div>
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
