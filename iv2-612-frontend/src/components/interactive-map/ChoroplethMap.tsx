import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	GeoJSON,
	MapContainer,
	Marker,
	Popup,
	TileLayer,
	useMap,
	useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "$components/interactive-map/ChoroplethMap.module.css";

export interface SupplierSite {
	id: number | string;
	country?: string;
	district?: string;
	districtName?: string;
	industry?: string;
	lat: number;
	lng: number;
	name?: string;
	strategicPartner?: string;
	strategicPartnerGrouping?: string;
	tier_id?: 1 | 2 | 3;
	workerVoiceStatusLabel?: string;
	worker_voice_status?:
		| "no_worker_voice"
		| "worker_voice_with_supplier_engagement"
		| "worker_voice_without_supplier_engagement";
}

export interface ChoroplethCountry {
	/** ISO 3166-1 alpha-2 code (e.g. "TH", "MM") */
	iso2: string;
	/** Value driving the fill colour (e.g. supplier count) */
	value: number;
}

interface ChoroplethMapProps {
	markers?: SupplierSite[];
	countryData?: ChoroplethCountry[];
	height?: string;
	className?: string;
	/** Supplier id currently hovered (e.g. from the data table); highlights the matching marker */
	hoveredSupplierId?: number | string | null;
	/** Supplier id clicked; triggers map zoom and opens popup */
	clickedSupplierId?: number | string | null;
	/** Fired when a marker is hovered (id) or unhovered (null), or clicked (id) */
	onMarkerActivate?: (id: number | string | null) => void;
	/** Fired when the map bounds change */
	onBoundsChange?: (bounds: {
		ne_lat: number;
		ne_lng: number;
		sw_lat: number;
		sw_lng: number;
	}) => void;
	/**
	 * Identity of the data table's active column search, or null when nothing is
	 * searched. Whenever it changes the map re-fits to the matching markers,
	 * returning to the default Asia-Pacific view once the search is cleared.
	 */
	searchSignature?: string | null;
}

const ASIA_CENTER: [number, number] = [15, 105];
const ASIA_ZOOM = 5;
const ASIA_PACIFIC_BOUNDS: [[number, number], [number, number]] = [
	[-50, 60], // south-west: below Australia, left of India
	[55, 180], // north-east: above China/Mongolia, Pacific edge
];

// Panning is clamped to a padded superset of the working region: without it
// Leaflet lets a drag run past the antimeridian into a repeated world copy,
// where the basemap still renders but every marker (drawn only at its true
// longitude) is gone.
const MAX_PAN_BOUNDS: [[number, number], [number, number]] = [
	[-60, 50],
	[65, 180],
];

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

function BoundsEmitter({
	onBoundsChange,
}: {
	onBoundsChange?: (bounds: {
		ne_lat: number;
		ne_lng: number;
		sw_lat: number;
		sw_lng: number;
	}) => void;
}) {
	const map = useMapEvents({
		zoomstart: () => {
			map.closePopup();
		},
		moveend: () => {
			if (!onBoundsChange) return;
			const bounds = map.getBounds();
			// Ensure minimum padding of 0.05 degrees (~5km) to prevent markers pushed by large popups at high zoom from escaping the query bounds
			const padLat = Math.max(
				(bounds.getNorthEast().lat - bounds.getSouthWest().lat) * 0.25,
				0.05,
			);
			const padLng = Math.max(
				(bounds.getNorthEast().lng - bounds.getSouthWest().lng) * 0.25,
				0.05,
			);

			onBoundsChange({
				// Clamped to real-world ranges: an out-of-range box matches no
				// supplier server-side and would blank the table.
				ne_lat: clamp(bounds.getNorthEast().lat + padLat, -90, 90),
				ne_lng: clamp(bounds.getNorthEast().lng + padLng, -180, 180),
				sw_lat: clamp(bounds.getSouthWest().lat - padLat, -90, 90),
				sw_lng: clamp(bounds.getSouthWest().lng - padLng, -180, 180),
			});
		},
	});
	return null;
}

/**
 * Suppliers whose coordinates were never set come back as 0/0 — a point in the
 * Gulf of Guinea. Including one in a fit drags the viewport off to Africa, so
 * treat null-island and out-of-range values as "no location".
 */
const hasUsableCoordinates = (site: SupplierSite) => {
	const { lat, lng } = site;
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
	if (lat === 0 && lng === 0) return false;
	return Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
};

/**
 * Re-frames the map on the markers that survive the data table's column search.
 *
 * Only reacts to a *change* of `searchSignature`, so the initial mount keeps the
 * default view, and a markers refresh that isn't search-driven (filter bar, map
 * pan) doesn't yank the viewport around.
 */
function SearchFitter({
	markers,
	searchSignature,
}: {
	markers: SupplierSite[];
	searchSignature?: string | null;
}) {
	const map = useMap();
	const previousSignatureRef = useRef<string | null | undefined>(undefined);
	const fitPendingRef = useRef(false);

	useEffect(() => {
		const signature = searchSignature ?? null;

		if (previousSignatureRef.current === undefined) {
			// First render: adopt the signature without moving the default view.
			previousSignatureRef.current = signature;
		} else if (previousSignatureRef.current !== signature) {
			previousSignatureRef.current = signature;
			fitPendingRef.current = true;
		}

		if (!fitPendingRef.current) return;

		if (!signature) {
			fitPendingRef.current = false;
			map.fitBounds(ASIA_PACIFIC_BOUNDS);
			return;
		}

		const allPoints = markers
			.filter(hasUsableCoordinates)
			.map((m) => [m.lat, m.lng] as [number, number]);
		// A single mis-geocoded supplier (wrong hemisphere, transposed sign) would
		// otherwise stretch the fit across half the globe and bury the real
		// cluster. Frame only what falls inside the map's working region; if the
		// whole result set is outside it, fit everything rather than refuse to move.
		const inRegion = allPoints.filter(
			([lat, lng]) =>
				lat >= ASIA_PACIFIC_BOUNDS[0][0] &&
				lat <= ASIA_PACIFIC_BOUNDS[1][0] &&
				lng >= ASIA_PACIFIC_BOUNDS[0][1] &&
				lng <= ASIA_PACIFIC_BOUNDS[1][1],
		);
		const points = inRegion.length > 0 ? inRegion : allPoints;
		// The markers query for this search may still be in flight; stay put and
		// fit on the next render once its results land.
		if (points.length === 0) return;

		fitPendingRef.current = false;
		map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 10 });
	}, [map, markers, searchSignature]);

	return null;
}

// TODO: re-enable once polygon design is finalized
const SHOW_CHOROPLETH_POLYGONS = false;

// 110m resolution — small file, loads fast
const GEOJSON_URL =
	"https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";

const LEGEND_STEPS = [
	{ label: "No Worker Voice", bgClass: "bg-[#FB8379]" },
	{
		label: "Worker Voice without Supplier Engagement",
		bgClass: "bg-[#148696]/20",
	},
	{
		label: "Worker Voice with Supplier Engagement",
		bgClass: "bg-[#148696]",
	},
];

const CHOROPLETH_LEGEND_STEPS = [
	{ label: "No data", color: "#e8e4dd" },
	{ label: "1 – 5", color: "rgba(20,134,150,0.25)" },
	{ label: "6 – 20", color: "rgba(20,134,150,0.45)" },
	{ label: "21 – 50", color: "rgba(20,134,150,0.65)" },
	{ label: "51 – 100", color: "rgba(20,134,150,0.82)" },
	{ label: "100+", color: "#148696" },
];

function getColor(value: number): string {
	if (value === 0) return "#e8e4dd";
	if (value <= 5) return "rgba(20,134,150,0.25)";
	if (value <= 20) return "rgba(20,134,150,0.45)";
	if (value <= 50) return "rgba(20,134,150,0.65)";
	if (value <= 100) return "rgba(20,134,150,0.82)";
	return "#148696";
}

/**
 * Ray-casting point-in-polygon (no external library).
 * GeoJSON ring coords are [lng, lat] pairs.
 */
function raycast(lng: number, lat: number, ring: number[][]): boolean {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const xi = ring[i][0];
		const yi = ring[i][1];
		const xj = ring[j][0];
		const yj = ring[j][1];
		const intersect =
			yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
		if (intersect) inside = !inside;
	}
	return inside;
}

function pointInFeature(lng: number, lat: number, feature: any): boolean {
	const geom = feature?.geometry;
	if (!geom) return false;
	if (geom.type === "Polygon") return raycast(lng, lat, geom.coordinates[0]);
	if (geom.type === "MultiPolygon")
		return (geom.coordinates as number[][][][]).some((poly) =>
			raycast(lng, lat, poly[0]),
		);
	return false;
}
function getMarkerIconByStatus(
	status?: string,
	name?: string,
	isHovered?: boolean,
): L.DivIcon {
	let bgColor = "#FB8379"; // default: no worker voice

	if (status === "worker_voice_without_supplier_engagement") {
		bgColor = "rgba(20, 134, 150, 0.2)";
	} else if (status === "worker_voice_with_supplier_engagement") {
		bgColor = "#148696";
	}

	const dotSize = isHovered ? 16 : 10;
	const dotBorder = isHovered ? "3px solid #004A60" : "2px solid #fff";

	return L.divIcon({
		html: `
			<div style="
				display:flex;
				align-items:center;
				gap:6px;
				white-space:nowrap;
			">
				<div style="
					width:${dotSize}px;
					height:${dotSize}px;
					background:${bgColor};
					border-radius:50%;
					border:${dotBorder};
					box-shadow:0 1px 4px rgba(0,0,0,0.35);
					flex-shrink:0;
				"></div>

				<span style="
					font-size:12px;
					font-weight:${isHovered ? 700 : 500};
					color:#333;
					background:rgba(255,255,255,0.85);
					padding:0 4px;
					border-radius:3px;
					${isHovered ? "box-shadow:0 0 0 2px #148696;" : ""}
				">
					${name ?? ""}
				</span>
			</div>
		`,
		className: "",
		iconSize: [120, 20], // increase width for text
		iconAnchor: [5, 10], // anchor at the circle
		popupAnchor: [0, -10],
	});
}

function buildClusterIcon(cluster: { getChildCount: () => number }): L.DivIcon {
	const count = cluster.getChildCount();
	const size = count > 100 ? 60 : count > 10 ? 50 : 40;
	return L.divIcon({
		html: `<div style="
			width:${size}px;
			height:${size}px;
			border-radius:999px;
			background:rgba(20,134,150,0.85);
			border:3px solid #148696;
			display:flex;
			align-items:center;
			justify-content:center;
			color:#fff;
			font-weight:700;
			font-size:14px;
			line-height:1;
			box-sizing:border-box;
		"><span>${count}</span></div>`,
		className: "",
		iconSize: L.point(size, size),
	});
}

export default function ChoroplethMap({
	markers = [],
	countryData = [],
	height = "460px",
	className = "",
	hoveredSupplierId = null,
	clickedSupplierId = null,
	onMarkerActivate,
	onBoundsChange,
	searchSignature = null,
}: ChoroplethMapProps) {
	const [geoJson, setGeoJson] = useState<any>(null);
	const [spatialCounts, setSpatialCounts] = useState<Record<string, number>>(
		{},
	);
	const markerRefs = useRef<Map<string, L.Marker>>(new Map());
	// react-leaflet-cluster's L.MarkerClusterGroup type doesn't expose the
	// leaflet.markercluster runtime API (e.g. zoomToShowLayer), hence `any`
	const clusterGroupRef = useRef<any>(null);

	// Reveal + open the clicked supplier's popup
	useEffect(() => {
		if (clickedSupplierId == null) return;
		const marker = markerRefs.current.get(String(clickedSupplierId));
		if (!marker) return;
		const group = clusterGroupRef.current;

		let isMounted = true;
		const safeOpen = () => {
			if (!isMounted) return;
			try {
				// Only open if map is available and not in middle of a zoom animation
				if ((marker as any)._map) {
					marker.openPopup();
				}
			} catch (e) {
				console.warn("Failed to open popup", e);
			}
		};

		if (group && typeof group.zoomToShowLayer === "function") {
			group.zoomToShowLayer(marker, () => {
				// Delay slightly to let leaflet cluster complete DOM updates
				setTimeout(safeOpen, 50);
			});
		} else {
			safeOpen();
		}
		return () => {
			isMounted = false;
			try {
				marker.closePopup();
			} catch (e) {
				// ignore if already destroyed
			}
		};
	}, [clickedSupplierId]);

	// Load GeoJSON (cached in sessionStorage to avoid re-fetching)
	useEffect(() => {
		if (!SHOW_CHOROPLETH_POLYGONS) return;
		const cached = sessionStorage.getItem("__choropleth_geojson");
		if (cached) {
			try {
				setGeoJson(JSON.parse(cached));
				return;
			} catch {}
		}
		fetch(GEOJSON_URL)
			.then((res) => res.json())
			.then((data) => {
				sessionStorage.setItem("__choropleth_geojson", JSON.stringify(data));
				setGeoJson(data);
			})
			.catch(() => {});
	}, []);

	// Spatial join: use ray-casting to count suppliers per country polygon
	useEffect(() => {
		if (!geoJson) return;
		if (!markers.length) {
			setSpatialCounts({});
			return;
		}
		const counts: Record<string, number> = {};
		for (const m of markers) {
			for (const feature of geoJson.features) {
				const iso2: string = feature.properties?.ISO_A2 ?? "";
				if (!iso2 || iso2 === "-99") continue;
				if (pointInFeature(m.lng, m.lat, feature)) {
					counts[iso2] = (counts[iso2] ?? 0) + 1;
					break;
				}
			}
		}
		setSpatialCounts(counts);
	}, [geoJson, markers]);

	// Merge spatial counts with countryData prop (spatial counts take priority)
	const effectiveCounts = useMemo(() => {
		if (Object.keys(spatialCounts).length > 0) return spatialCounts;
		const map: Record<string, number> = {};
		for (const c of countryData) map[c.iso2.toUpperCase()] = c.value;
		return map;
	}, [spatialCounts, countryData]);

	// Stable references for react-leaflet to prevent cluster crashes and DOM thrashing
	const memoizedMarkers = useMemo(() => {
		return markers.filter(hasUsableCoordinates).map((m) => {
			const pos: [number, number] = [m.lat, m.lng];
			return {
				...m,
				_position: pos,
				_eventHandlers: {
					click: () => onMarkerActivate?.(m.id),
					mouseout: () => onMarkerActivate?.(null),
					mouseover: () => onMarkerActivate?.(m.id),
				},
			};
		});
	}, [markers, onMarkerActivate]);

	const geoJsonKey = useMemo(
		() =>
			Object.entries(effectiveCounts)
				.map(([k, v]) => `${k}:${v}`)
				.join(",") || "empty",
		[effectiveCounts],
	);

	const geoJsonStyle = useMemo(
		() =>
			(feature?: any): L.PathOptions => {
				const iso2: string = feature?.properties?.ISO_A2 ?? "";
				const value = effectiveCounts[iso2] ?? 0;
				return {
					fillColor: getColor(value),
					fillOpacity: value > 0 ? 0.7 : 0.35,
					color: "#ffffff",
					weight: 0.7,
					opacity: 0.8,
				};
			},
		[effectiveCounts],
	);
	return (
		<div
			className={`relative z-1 rounded-xl overflow-hidden border border-gray-100 shadow-sm ${className}`}
			style={{ height }}
		>
			<MapContainer
				attributionControl={false}
				bounds={ASIA_PACIFIC_BOUNDS}
				center={ASIA_CENTER}
				maxBounds={MAX_PAN_BOUNDS}
				maxBoundsViscosity={1.0}
				maxZoom={12}
				minZoom={4}
				style={{ width: "100%", height: "100%" }}
				zoom={ASIA_ZOOM}
			>
				{/*
				  CARTO Voyager rather than standard OSM tiles: OSM bakes local-script
				  place names (Thai, Burmese, Khmer) into the PNGs, while CARTO renders
				  the `name:en` tag where OSM provides one.
				*/}
				<TileLayer
					attribution="&copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, TomTom"
					url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
				/>
				<BoundsEmitter onBoundsChange={onBoundsChange} />
				<SearchFitter
					markers={memoizedMarkers}
					searchSignature={searchSignature}
				/>

				{SHOW_CHOROPLETH_POLYGONS && geoJson && (
					<GeoJSON data={geoJson} key={geoJsonKey} style={geoJsonStyle} />
				)}

				<MarkerClusterGroup
					chunkedLoading={false}
					iconCreateFunction={buildClusterIcon}
					maxClusterRadius={80}
					ref={clusterGroupRef}
					showCoverageOnHover={false}
					spiderfyOnMaxZoom
					zoomToBoundsOnClick
				>
					{memoizedMarkers.map((m) => {
						const isHovered =
							hoveredSupplierId != null &&
							String(m.id) === String(hoveredSupplierId);
						return (
							<Marker
								eventHandlers={m._eventHandlers}
								icon={getMarkerIconByStatus(
									m.worker_voice_status,
									m.name,
									isHovered,
								)}
								key={m.id}
								position={m._position}
								ref={(instance) => {
									const key = String(m.id);
									if (instance) markerRefs.current.set(key, instance);
									else markerRefs.current.delete(key);
								}}
							>
								{m.name && (
									<Popup>
										<strong>{m.name}</strong>
										<hr className="my-2 border-gray-200" />
										<div
											style={{
												fontSize: "12px",
												color: "#666",
												marginTop: "2px",
											}}
										>
											<b>Tier:</b> {m.tier_id ? `Tier ${m.tier_id}` : "N/A"}
										</div>
										<div
											style={{
												fontSize: "12px",
												color: "#666",
												marginTop: "2px",
											}}
										>
											<b>Worker Voice:</b>{" "}
											{m.worker_voice_status
												?.split("_")
												.map(
													(word) =>
														word.charAt(0).toUpperCase() + word.slice(1),
												)
												.join(" ") || "N/A"}
										</div>
									</Popup>
								)}
							</Marker>
						);
					})}
				</MarkerClusterGroup>
			</MapContainer>

			{/* Worker Voice Status Legend - Left */}
			<div className="absolute bottom-4 left-3 z-[1000] bg-white/85 backdrop-blur-md rounded-xl border border-gray-200/80 shadow-md px-3.5 py-2.5 w-auto max-w-max">
				<p className="text-xs font-semibold text-gray-700 mb-1.5">
					Worker Voice Status
				</p>
				<div className="flex flex-col gap-1">
					{LEGEND_STEPS.map((step) => (
						<div className="flex items-center gap-2" key={step.label}>
							<div
								className={`w-3 h-3 rounded-full border border-gray-300 flex-shrink-0 ${step.bgClass}`}
							/>
							<span className="text-[11px] text-gray-600">{step.label}</span>
						</div>
					))}
				</div>
			</div>

			{/* Country Supplier Count Legend - Right */}
			{SHOW_CHOROPLETH_POLYGONS && (
				<div className="absolute bottom-4 right-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl border border-gray-100 shadow-sm px-3 py-2.5">
					<p className="text-xs font-semibold text-gray-700 mb-1.5">
						Supplier Count
					</p>
					<div className="flex flex-col gap-1">
						{CHOROPLETH_LEGEND_STEPS.map((step) => (
							<div className="flex items-center gap-2" key={step.label}>
								<div
									className="w-3.5 h-3.5 rounded-sm border border-gray-200 flex-shrink-0"
									style={{ backgroundColor: step.color }}
								/>
								<span className="text-[11px] text-gray-600">{step.label}</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
