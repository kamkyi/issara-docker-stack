import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type LiveStatusKey = "noWorkerVoice" | "withoutEngagement" | "withEngagement";

interface LiveStatusItem {
	key: LiveStatusKey;
	label: string;
	percentage: number;
	supplierCount: number;
	suppliers: string[];
	barClassName: string;
	legendClassName: string;
	description: string;
}

interface WorkerVoiceSummary {
	no_wv_percentage?: number;
	non_wv_engagement_percentage?: number;
	wv_engagement_percentage?: number;
	no_worker_voice_suppliers?: number;
	no_worker_voice_suppliers_list?: Array<{ id: number; name: string } | string>;
	suppliers_without_engagement?: number;
	suppliers_without_engagement_list?: Array<
		{ id: number; name: string } | string
	>;
	suppliers_with_engagement?: number;
	suppliers_with_engagement_list?: Array<{ id: number; name: string } | string>;
	suppliers_with_active_wv_list?: Array<{ id: number; name: string } | string>;
}

interface LiveStatusBarProps {
	title: string;
	summary: WorkerVoiceSummary | undefined | null;
}

function toNames(
	raw: Array<{ id: number; name: string } | string> | undefined,
): string[] {
	if (!Array.isArray(raw)) return [];
	return raw
		.map((item) => {
			if (typeof item === "string") return item;
			if (item && typeof item.name === "string") return item.name;
			return "";
		})
		.filter((name) => name.length > 0);
}

export default function LiveStatusBar({ title, summary }: LiveStatusBarProps) {
	const { t } = useTranslation();
	const [hoveredKey, setHoveredKey] = useState<LiveStatusKey | null>(null);
	const [tooltip, setTooltip] = useState<{
		visible: boolean;
		x: number;
		y: number;
		key: LiveStatusKey | null;
	}>({ visible: false, x: 0, y: 0, key: null });

	const isTooltipHoveredRef = useRef(false);
	const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Build segments
	const segments = useMemo(() => {
		const noWv = Number(summary?.no_wv_percentage ?? 0);
		const withoutEng = Number(summary?.non_wv_engagement_percentage ?? 0);
		const withEng = Number(summary?.wv_engagement_percentage ?? 0);
		const normalized = [noWv, withoutEng, withEng].map((v) =>
			Number.isFinite(v) && v >= 0 ? v : 0,
		);
		const total = normalized.reduce((s, v) => s + v, 0);
		if (total <= 0) return [0, 0, 0];
		return normalized.map((v) => Math.round((v / total) * 100));
	}, [summary]);

	const items: LiveStatusItem[] = useMemo(
		() => [
			{
				key: "noWorkerVoice",
				label: t("companyDashboard.liveStatus.labels.noWorkerVoice"),
				percentage: segments[0],
				supplierCount: Number(summary?.no_worker_voice_suppliers ?? 0),
				suppliers: toNames(summary?.no_worker_voice_suppliers_list),
				barClassName: "bg-[#FB8379] text-gray-800",
				legendClassName: "bg-[#FB8379]",
				description: t(
					"companyDashboard.liveStatus.descriptions.noWorkerVoice",
				),
			},
			{
				key: "withoutEngagement",
				label: t("companyDashboard.liveStatus.labels.withoutEngagement"),
				percentage: segments[1],
				supplierCount: Number(summary?.suppliers_without_engagement ?? 0),
				suppliers: toNames(summary?.suppliers_without_engagement_list),
				barClassName: "bg-[#148696]/20 text-gray-800",
				legendClassName: "bg-[#148696]/20",
				description: t(
					"companyDashboard.liveStatus.descriptions.withoutEngagement",
				),
			},
			{
				key: "withEngagement",
				label: t("companyDashboard.liveStatus.labels.withEngagement"),
				percentage: segments[2],
				supplierCount: Number(summary?.suppliers_with_engagement ?? 0),
				suppliers:
					toNames(summary?.suppliers_with_engagement_list).length > 0
						? toNames(summary?.suppliers_with_engagement_list)
						: toNames(summary?.suppliers_with_active_wv_list),
				barClassName: "bg-[#148696] text-white",
				legendClassName: "bg-[#148696]",
				description: t(
					"companyDashboard.liveStatus.descriptions.withEngagement",
				),
			},
		],
		[summary, segments, t],
	);

	const tooltipItem = items.find((i) => i.key === tooltip.key);

	const tooltipStyle = useMemo(() => {
		const tooltipWidth = 320;
		const margin = 12;
		const cursorOffset = 16;
		if (typeof window === "undefined") {
			return {
				left: `${tooltip.x + cursorOffset}px`,
				top: `${tooltip.y + cursorOffset}px`,
				maxHeight: "380px",
			};
		}
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const maxH = Math.min(380, vh - margin * 2);
		let left = tooltip.x + cursorOffset;
		let top = tooltip.y + cursorOffset;
		if (left + tooltipWidth > vw - margin)
			left = tooltip.x - tooltipWidth - cursorOffset;
		left = Math.max(margin, Math.min(left, vw - tooltipWidth - margin));
		if (top + maxH > vh - margin) top = vh - maxH - margin;
		top = Math.max(margin, top);
		return { left: `${left}px`, top: `${top}px`, maxHeight: `${maxH}px` };
	}, [tooltip]);

	const show = (key: LiveStatusKey, x: number, y: number) => {
		if (hideTimeoutRef.current) {
			clearTimeout(hideTimeoutRef.current);
			hideTimeoutRef.current = null;
		}
		setHoveredKey(key);
		setTooltip({ visible: true, x, y, key });
	};

	const hide = () => {
		if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
		hideTimeoutRef.current = setTimeout(() => {
			if (isTooltipHoveredRef.current) return;
			setHoveredKey(null);
			setTooltip((prev) => ({ ...prev, visible: false, key: null }));
			hideTimeoutRef.current = null;
		}, 220);
	};

	useEffect(
		() => () => {
			if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
		},
		[],
	);

	return (
		<div>
			<h6 className="text-sm font-semibold text-gray-700 mb-2">{title}</h6>
			<div className="relative h-14 w-full flex rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
				{segments.reduce((a, b) => a + b, 0) === 0 ? (
					<div className="w-full flex items-center justify-center text-sm font-medium text-gray-400 italic">
						{t("companyDashboard.liveStatus.noSuppliersAvailable")}
					</div>
				) : (
					items.map((item) => (
						<div
							className={`h-full text-sm font-semibold flex items-center justify-center transition-all duration-200 cursor-default ${item.barClassName} ${
								hoveredKey === item.key
									? "ring-2 ring-inset ring-[#004A60]"
									: ""
							}`}
							key={item.key}
							onMouseEnter={(e) => show(item.key, e.clientX, e.clientY)}
							onMouseLeave={hide}
							style={{ width: `${item.percentage}%` }}
							title={`${item.label}: ${item.percentage}%`}
						>
							{item.percentage >= 3 ? (
								`${item.percentage}%`
							) : item.percentage > 0 ? (
								<span
									className="text-xs font-semibold whitespace-nowrap"
									style={{
										writingMode: "vertical-rl",
										transform: "rotate(180deg)",
									}}
								>
									{item.percentage}%
								</span>
							) : null}
						</div>
					))
				)}
			</div>

			<div className="flex flex-wrap items-center gap-6 mt-3">
				{items.map((item) => (
					<div
						className="flex items-center gap-2 cursor-default"
						key={item.key}
						onMouseEnter={(e) => show(item.key, e.clientX, e.clientY)}
						onMouseLeave={hide}
						title={`${item.label}: ${item.percentage}% (${t("companyDashboard.liveStatus.suppliers", { count: item.supplierCount })})`}
					>
						<div
							className={`w-4 h-4 rounded ${item.legendClassName} ${
								hoveredKey === item.key ? "ring-2 ring-[#004A60]" : ""
							}`}
						/>
						<span
							className={`text-sm ${
								hoveredKey === item.key
									? "text-[#004A60] font-semibold"
									: "text-gray-600"
							}`}
						>
							{item.label} ({item.percentage}%)
						</span>
					</div>
				))}
			</div>

			{tooltip.visible && tooltipItem && (
				<div
					className="fixed z-50 w-80 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-xl pointer-events-auto overflow-hidden"
					onMouseEnter={() => {
						isTooltipHoveredRef.current = true;
						if (hideTimeoutRef.current) {
							clearTimeout(hideTimeoutRef.current);
							hideTimeoutRef.current = null;
						}
					}}
					onMouseLeave={() => {
						isTooltipHoveredRef.current = false;
						hide();
					}}
					style={tooltipStyle}
				>
					<p className="text-sm font-semibold text-gray-900">
						{tooltipItem.label}
					</p>
					<p className="text-sm text-gray-600 mt-1">
						{tooltipItem.description}
					</p>
					<p className="text-sm text-gray-700 mt-2">
						{tooltipItem.percentage}%{" ("}
						{t("companyDashboard.liveStatus.suppliers", {
							count: tooltipItem.supplierCount,
						})}
						)
					</p>
					<div className="mt-2 max-h-44 overflow-auto rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
						{tooltipItem.suppliers.length > 0 ? (
							<ul className="list-disc pl-4 text-sm text-gray-700 space-y-1">
								{tooltipItem.suppliers.map((name) => (
									<li key={name}>{name}</li>
								))}
							</ul>
						) : (
							<p className="text-sm text-gray-500">
								{t("companyDashboard.liveStatus.noSupplierListAvailable")}
							</p>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
