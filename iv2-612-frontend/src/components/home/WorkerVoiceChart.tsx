import { Flex } from "@radix-ui/themes";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import { useId, useMemo, useState } from "react";
import {
	statusColorPalette,
	sunrisepalette,
} from "$src/assets/mock/common-data";
import {
	useWorkerVoiceMonthly,
	type WorkerVoiceMonthlyItem,
} from "$src/hooks/useWorkerVoiceMonthly";

const channelLabels: Record<string, string> = {
	mm_hotline_total: "Burmese hotline in Thailand",
	mm_whatsapp_total: "Burmese WhatsApp in Thailand",
	mm_fb_total: "Burmese Facebook Messenger",
	burmese_titok_messages: "Burmese TikTok Messages",
	mm_line_total: "Burmese LINE",
	mm_viber_total: "Burmese Viber in Thailand",
	yangon_hotline_total: "Burmese hotline in Myanmar",
	yangon_whatsapp_total: "Burmese WhatsApp in Myanmar",
	yangon_viber_total: "Burmese Viber in Myanmar",
	my_burmese_hotline_total: "Burmese Hotline in Malaysia",
	my_burmese_whatsapp_total: "Burmese WhatsApp in Malaysia",
	my_burmese_viber_total: "Burmese Viber in Malaysia",
	cb_hotline_total: "Khmer hotline",
	cb_whatsapp_total: "Khmer WhatsApp",
	cb_fb_total: "Khmer Facebook Messenger",
	khmer_tiktok: "Khmer TikTok Messages",
	cb_line_total: "Khmer LINE",
	cb_viber_total: "Khmer Telegram",
	thai_hotline_total: "Thai Hotline",
	thai_whatsapp_total: "Thai WhatsApp",
	thai_fb_total: "Thai Facebook Messenger",
	thai_line_total: "Thai LINE",
	thai_viber_total: "Thai Viber",
	bangladeshi_hotline: "Bangladeshi Hotline",
	bangladeshi_whatsapp: "Bangladeshi WhatsApp",
	bangladeshi_facebook_messenger: "Bangladeshi Facebook Messenger",
	bangladeshi_tiktok_messages: "Bangladeshi TikTok Messages",
	bangladeshi_telegram_messages: "Bangladeshi Telegram",
	nepal_hotline_total: "Nepali Hotline",
	my_nepal_whatsapp_total: "Nepali WhatsApp",
	nepal_facebook_total: "Nepali Facebook Messenger",
	nepalese_tiktok_messages: "Nepali TikTok Messages",
	vietnamese_hotline_total: "Vietnamese Hotline",
	vietnamese_whatsapp_total: "Vietnamese WhatsApp",
	vietnamese_facebook_messenger: "Vietnamese Facebook Messenger",
	vietnamese_tiktok_messages: "Vietnamese TikTok Messages",
	vietnamese_zalo_messages: "Vietnamese Zalo Messages",
	hotline_in_taiwan: "Hotline in Taiwan",
	my_indonesia_hotline_total: "Indonesian Hotline in Malaysia",
	my_indonesian_whatsapp_total: "Indonesian WhatsApp in Malaysia",
};

const groupMappings: Record<string, string[]> = {
	All: Object.values(channelLabels),
	"Burmese - Thailand": [
		"Burmese hotline in Thailand",
		"Burmese WhatsApp in Thailand",
		"Burmese Facebook Messenger",
		"Burmese TikTok Messages",
		"Burmese LINE",
		"Burmese Viber in Thailand",
	],
	"Burmese - Myanmar": [
		"Burmese hotline in Myanmar",
		"Burmese WhatsApp in Myanmar",
		"Burmese Viber in Myanmar",
	],
	"Burmese - Malaysia": [
		"Burmese Hotline in Malaysia",
		"Burmese WhatsApp in Malaysia",
		"Burmese Viber in Malaysia",
	],
	"Khmer - Thailand": [
		"Khmer hotline",
		"Khmer WhatsApp",
		"Khmer Facebook Messenger",
		"Khmer TikTok Messages",
		"Khmer LINE",
		"Khmer Telegram",
	],
	"Thai - Thailand": [
		"Thai Hotline",
		"Thai WhatsApp",
		"Thai Facebook Messenger",
		"Thai LINE",
	],
	"Bangladeshi - Malaysia and Bangladesh": [
		"Bangladeshi Hotline",
		"Bangladeshi WhatsApp",
		"Bangladeshi Facebook Messenger",
		"Bangladeshi TikTok Messages",
		"Bangladeshi Telegram",
	],
	"Nepali - Malaysia and Nepal": [
		"Nepali Hotline",
		"Nepali WhatsApp",
		"Nepali Facebook Messenger",
		"Nepali TikTok Messages",
	],
	"Vietnamese - Vietnam": [
		"Vietnamese Hotline",
		"Vietnamese WhatsApp",
		"Vietnamese Facebook Messenger",
		"Vietnamese TikTok Messages",
		"Vietnamese Zalo Messages",
	],
};

/**
 * Channels whose colour is fixed by request rather than derived from the
 * palette. These are the visually dominant series in the stacked bar, so
 * Senior Management picked their hues from the Issara Sunrise palette.
 */
const PINNED_CHANNEL_COLORS: Record<string, string> = {
	"Burmese Facebook Messenger": "#148696",
	"Khmer Facebook Messenger": "#FDDA61",
};

const PINNED_HEXES = new Set(
	Object.values(PINNED_CHANNEL_COLORS).map((hex) => hex.toLowerCase()),
);

const SUNRISE_PALETTE_ORDER = [
	"#004A60",
	"#148696",
	"#A6DFDD",
	"#6F2E97",
	"#FFEDAF",
	"#FDDA61",
	"#FB8379",
];

const UNUSABLE_HEXES = new Set(["#000000", "#c4c7cc", "#d9e5d6"]);

/** Issara brand colours, sunrise first, minus the pinned and unusable hues. */
const BASE_PALETTE = Array.from(
	new Set(
		[...SUNRISE_PALETTE_ORDER, ...sunrisepalette, ...statusColorPalette].map(
			(hex) => hex.toLowerCase(),
		),
	),
).filter((hex) => !PINNED_HEXES.has(hex) && !UNUSABLE_HEXES.has(hex));

/** Blends `hex` toward `target` (0 = black, 255 = white) by `ratio`. */
const blend = (hex: string, target: number, ratio: number) => {
	const value = Number.parseInt(hex.slice(1), 16);
	const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(
		(channel) => Math.round(channel + (target - channel) * ratio),
	);
	return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
};

/**
 * There are far more channels than brand colours, so once the palette is
 * exhausted we keep cycling it at shifted lightness instead of repeating the
 * exact same hex — otherwise two series in the same view render identically.
 */
const shiftForCycle = (hex: string, cycle: number) => {
	if (cycle === 0) return hex;
	if (cycle % 2 === 1) return blend(hex, 255, 0.38);
	return blend(hex, 0, 0.32);
};

const ALL_LABELS = Object.values(channelLabels);

const PALETTE_LABELS = ALL_LABELS.filter(
	(label) => !(label in PINNED_CHANNEL_COLORS),
);

const colorForChannel = (label: string) => {
	const pinned = PINNED_CHANNEL_COLORS[label];
	if (pinned) return pinned;

	const idx = PALETTE_LABELS.indexOf(label);
	if (idx < 0) return BASE_PALETTE[0];

	return shiftForCycle(
		BASE_PALETTE[idx % BASE_PALETTE.length],
		Math.floor(idx / BASE_PALETTE.length),
	);
};

const normalizeMonthKey = (month: string) => {
	const d = new Date(month);
	if (Number.isNaN(d.getTime())) return month;
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

const buildStackedBar = (
	selectedGroup: string,
	items?: WorkerVoiceMonthlyItem[],
) => {
	const input = Array.isArray(items) ? items : [];
	const monthKeys = Array.from(
		new Set(input.map((i) => normalizeMonthKey(i.month))),
	).sort(
		(a, b) => new Date(`${a}-01`).getTime() - new Date(`${b}-01`).getTime(),
	);
	const monthLabels = monthKeys.map((m) => {
		const [year, month] = m.split("-");
		const d = new Date(`${year}-${month}-01`);
		return d.toLocaleString(undefined, { month: "short", year: "numeric" });
	});

	const itemsByMonth = input.reduce((map, item) => {
		const key = normalizeMonthKey(item.month);
		map.set(key, [...(map.get(key) ?? []), item]);
		return map;
	}, new Map<string, WorkerVoiceMonthlyItem[]>());

	const activeLabels = Array.from(
		new Set(groupMappings[selectedGroup] || groupMappings.All),
	);

	const series = activeLabels
		?.map((label) => {
			const dbKeys = Object.entries(channelLabels)
				.filter(([_, l]) => l === label)
				.map(([k]) => k);

			const counts = monthKeys.map((monthKey) => {
				const matchingItems = itemsByMonth.get(monthKey) ?? [];
				return matchingItems
					.flatMap((item) => (Array.isArray(item.data) ? item.data : []))
					.filter((d) => dbKeys.includes(d.key))
					.reduce((acc, curr) => acc + curr.count, 0);
			});

			if (counts.every((c) => c === 0)) return null;

			return {
				name: label,
				type: "bar" as const,
				stack: "total",
				emphasis: { focus: "series" as const },
				data: counts,
				itemStyle: { color: colorForChannel(label) },
			};
		})
		.filter((s): s is NonNullable<typeof s> => s !== null);

	return { monthLabels, series, keys: activeLabels };
};

export const WorkerVoiceCallChart = ({
	from,
	to,
}: {
	from: string;
	to: string;
}) => {
	const [selectedGroup, setSelectedGroup] = useState("All");
	const nationalitySelectId = useId();
	const { data, isLoading, error } = useWorkerVoiceMonthly(from, to);

	const { monthLabels, series } = useMemo(
		() => buildStackedBar(selectedGroup, data?.data),
		[data, selectedGroup],
	);

	const option = {
		tooltip: {
			trigger: "axis" as const,
			axisPointer: { type: "shadow" as const },
			formatter: (params: any) => {
				const entries = Array.isArray(params) ? params : [params];
				const nonZeroEntries = entries.filter((entry) => {
					const value = Array.isArray(entry?.value)
						? entry.value[1]
						: entry?.value;
					return Number(value) !== 0;
				});

				if (nonZeroEntries.length === 0) {
					return entries?.[0]?.axisValueLabel ?? "";
				}

				const axisLabel = nonZeroEntries?.[0]?.axisValueLabel ?? "";
				const lines = nonZeroEntries?.map(
					(entry) => `${entry.marker}${entry.seriesName}: ${entry.value}`,
				);

				return [axisLabel, ...lines].join("<br/>");
			},
		},
		legend: {
			show: true,
			bottom: 0,
			left: "center",
			orient: "horizontal" as const,
			itemWidth: 12,
			itemHeight: 12,
			textStyle: { fontSize: 10 },
		},
		grid: { left: 50, right: 30, bottom: 120, top: 40, containLabel: true },
		xAxis: {
			type: "category" as const,
			data: monthLabels,
			axisLabel: { rotate: 45, fontSize: 10 },
		},
		yAxis: {
			type: "value" as const,
			axisLabel: { fontSize: 10 },
		},
		series,
	};

	return (
		<motion.div
			className="bg-white rounded-md p-6 md:p-8 mt-6 border border-gray-100 shadow-sm"
			initial={{ opacity: 0, y: 20 }}
			transition={{ duration: 0.6, delay: 0.2 }}
			viewport={{ once: true }}
			whileInView={{ opacity: 1, y: 0 }}
		>
			<Flex align="center" justify="between" mb="4" wrap="wrap">
				<div>
					<p className="">Calls and Messages to Worker Voice Channels</p>
				</div>
				<Flex align="center" gap="3" mt="4">
					<fieldset className="relative rounded-lg border border-gray-300 px-2 pb-1 pt-0.5 min-w-[200px] focus-within:border-[#148696] transition-colors">
						<legend className="px-1 text-xs text-gray-500">
							<label htmlFor={nationalitySelectId}>
								Filter by Nationality - Country
							</label>
						</legend>
						<select
							className="w-full appearance-none bg-transparent pr-6 py-0.5 text-sm font-medium text-gray-800 focus:outline-none cursor-pointer"
							id={nationalitySelectId}
							onChange={(e) => setSelectedGroup(e.target.value)}
							value={selectedGroup}
						>
							{Object.keys(groupMappings)?.map((group) => (
								<option key={group} value={group}>
									{group}
								</option>
							))}
						</select>
						<svg
							aria-hidden="true"
							className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
							viewBox="0 0 24 24"
						>
							<path
								d="M6 9l6 6 6-6"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</fieldset>
				</Flex>
			</Flex>

			<div style={{ height: "640px", width: "100%" }}>
				{isLoading ? (
					<div className="h-full w-full flex items-center justify-center text-gray-500 text-sm">
						Loading monthly data...
					</div>
				) : error ? (
					<div className="h-full w-full flex items-center justify-center text-red-600 text-sm">
						Failed to load data
					</div>
				) : monthLabels.length === 0 ? (
					<div className="h-full w-full flex items-center justify-center text-gray-500 text-sm">
						No data available
					</div>
				) : (
					<ReactECharts
						key={`${selectedGroup}-${series.length}`}
						notMerge={true}
						option={option}
						style={{ height: "100%", width: "100%" }}
					/>
				)}
			</div>
		</motion.div>
	);
};

export default WorkerVoiceCallChart;
