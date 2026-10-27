import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

interface RecruitmentCountry {
	name: string;
	lat: number;
	lng: number;
	/** "origin" = worker source country, "destination" = receiving country */
	type: "origin" | "destination";
}

const RECRUITMENT_COUNTRIES: RecruitmentCountry[] = [
	// Destination countries
	{ name: "Thailand", lat: 13.736, lng: 100.523, type: "destination" },
	{ name: "Malaysia", lat: 3.147, lng: 101.694, type: "destination" },
	{ name: "Japan", lat: 36.2048, lng: 138.2529, type: "destination" },
	// Origin countries
	{ name: "Myanmar", lat: 17.11, lng: 96.156, type: "origin" },
	{ name: "Cambodia", lat: 12.565, lng: 104.991, type: "origin" },
	{ name: "Vietnam", lat: 16.047, lng: 108.206, type: "origin" },
	{ name: "Laos", lat: 17.967, lng: 102.638, type: "origin" },
	{ name: "Indonesia", lat: -6.175, lng: 106.827, type: "origin" },
	{ name: "Bangladesh", lat: 23.685, lng: 90.356, type: "origin" },
	{ name: "Nepal", lat: 27.7, lng: 85.3, type: "origin" },
];

export const EthicalRecruitmentMap = () => (
	<div className="relative h-full w-full" style={{ minHeight: "380px" }}>
		{/* Map gets its own clipping so rounded corners work */}
		<div className="absolute inset-0 rounded-md overflow-hidden">
			<MapContainer
				attributionControl={false}
				center={[20, 110]}
				scrollWheelZoom={false}
				style={{ height: "100%", width: "100%" }}
				zoom={3}
				zoomControl={false}
			>
				<TileLayer
					attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
					url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
				/>
				{RECRUITMENT_COUNTRIES.map((country) => (
					<CircleMarker
						center={[country.lat, country.lng]}
						key={country.name}
						pathOptions={{
							fillColor: country.type === "destination" ? "#f5d020" : "#20b8ac",
							fillOpacity: 0.85,
							color: "#ffffff",
							weight: 2,
						}}
						radius={country.type === "destination" ? 18 : 13}
					>
						<Popup>
							<strong>{country.name}</strong>
							<br />
							{country.type === "destination"
								? "Destination country"
								: "Worker origin country"}
						</Popup>
					</CircleMarker>
				))}
			</MapContainer>
		</div>

		{/* Legend — sibling of map so overflow-hidden can't clip it */}
		<div
			className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 text-xs shadow-md border border-gray-100"
			style={{ pointerEvents: "none", zIndex: 1000 }}
		>
			<p className="font-semibold text-gray-800 mb-2 text-xs uppercase tracking-wide">
				Ethical Recruitment Coverage
			</p>
			<div className="flex items-start gap-2 mb-2">
				<span
					className="inline-block w-3 h-3 rounded-full border-2 border-white mt-0.5 shrink-0"
					style={{ background: "#20b8ac" }}
				/>
				<span className="text-gray-700 leading-tight">
					<strong>Worker origin</strong>
					<br />
					Countries workers migrate <em>from</em>
				</span>
			</div>
			<div className="flex items-start gap-2">
				<span
					className="inline-block w-3 h-3 rounded-full border-2 border-white mt-0.5 shrink-0"
					style={{ background: "#f5d020" }}
				/>
				<span className="text-gray-700 leading-tight">
					<strong>Destination</strong>
					<br />
					Countries workers migrate <em>to</em>
				</span>
			</div>
		</div>
	</div>
);
