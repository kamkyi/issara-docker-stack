import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { sunrisepalette } from "$src/assets/mock/common-data";
import { useTranslateBatch } from "$src/queries/useTranslateBatch";
import { useWorkplaceStats } from "$src/queries/useWorkplaceStats";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";
import styles from "./supplier-dashboard.module.css";

interface Slice {
	label: string;
	value: number;
	color: string;
}

const GENDER_COLOR_MAP: Record<string, string> = {
	"Non-binary": "#FB8379",
	Nonbinary: "#FB8379",
	NB: "#FB8379",
	Male: "#148696",
	Female: "#FDDA61",
};

const NATIONALITY_COLORS = sunrisepalette;

const toSlices = (
	raw: Array<{ name?: string; label?: string; value: number }> | undefined,
	colors: string[] | ((label: string) => string),
): Slice[] =>
	(raw || [])
		.filter((d) => (d?.value ?? 0) > 0)
		.map((d, i) => {
			const label = d.name ?? d.label ?? "";
			const color =
				typeof colors === "function"
					? colors(label)
					: colors[i % colors.length];
			return { label, value: d.value, color: color as string };
		});

const sortSlicesWithOtherLast = (slices: Slice[]): Slice[] =>
	[...slices].sort((a, b) => {
		const aLabel = a.label.trim().toLowerCase();
		const bLabel = b.label.trim().toLowerCase();
		const aIsOther = aLabel === "other";
		const bIsOther = bLabel === "other";

		if (aIsOther !== bIsOther) {
			return aIsOther ? 1 : -1;
		}

		return a.label.localeCompare(b.label);
	});

// Solid pie (ECharts), slices from 12 o'clock — matches the design.
const pieOption = (data: Slice[]) => ({
	tooltip: {
		trigger: "item",
		formatter: (p: { name: string; value: number; percent: number }) =>
			`${p.name}: ${p.value.toLocaleString()} (${p.percent}%)`,
	},
	series: [
		{
			type: "pie",
			radius: "96%",
			center: ["50%", "50%"],
			startAngle: 90,
			avoidLabelOverlap: true,
			label: { show: false },
			labelLine: { show: false },
			emphasis: { scale: false },
			data: data.map((d) => ({
				name: d.label,
				value: d.value,
				itemStyle: { color: d.color },
			})),
		},
	],
});

function PieChart({ data, size = 240 }: { data: Slice[]; size?: number }) {
	return (
		<div className={styles.pieSvg} style={{ width: size, height: size }}>
			<ReactECharts
				notMerge
				option={pieOption(data)}
				style={{ width: "100%", height: "100%" }}
			/>
		</div>
	);
}

function LegendRow({ data }: { data: Slice[] }) {
	return (
		<div className={styles.legendRow}>
			{sortSlicesWithOtherLast(data).map((d) => (
				<div className={styles.legendRowItem} key={d.label}>
					<span
						className={styles.legendRowSq}
						style={{ background: d.color }}
					/>
					<span className={styles.legendRowLabel}>{d.label}</span>
				</div>
			))}
		</div>
	);
}

function DemoCard({
	title,
	chartTitle,
	data,
	summary,
}: {
	title: string;
	chartTitle: string;
	data: Slice[];
	summary: string;
}) {
	const { t } = useTranslation();
	return (
		<article className={styles.demoCard}>
			<header className={styles.demoCardHead}>
				<h3 className="heading-display">{title}</h3>
				<span className={`${styles.pill} ${styles.pillSoft}`}>
					{t("supplierDashboard.demographics.pill")}
				</span>
			</header>
			<div className={styles.demoCardBody}>
				<h4 className={styles.demoChartTitle}>{chartTitle}</h4>
				<PieChart data={data} />
				<LegendRow data={data} />
				<div className={styles.demoRule} />
				<div className={styles.demoSummary}>{summary}</div>
			</div>
		</article>
	);
}

export default function DemographicsSection() {
	const { t, i18n } = useTranslation();
	const ids = getUserIdentifiers();
	const { data } = useWorkplaceStats({
		supplierId: ids.supplierId || undefined,
		partnerId: ids.partnerId || undefined,
		// Single factory, not a supply chain: in mock mode use the supplier-scoped
		// fixture so the worker totals here are plausible for one workplace.
		supplierScopedMock: true,
	});
	const backendTotalWorkers = Number((data as any)?.demographics?.total ?? 0);
	const demographicTexts = useMemo(
		() => [
			...(
				((data as any)?.demographics?.gender ?? []) as Array<{
					name?: string;
					label?: string;
				}>
			).map((item) => item.name ?? item.label ?? ""),
			...(
				((data as any)?.demographics?.nationality ?? []) as Array<{
					name?: string;
					label?: string;
				}>
			).map((item) => item.name ?? item.label ?? ""),
		],
		[data],
	);
	const { translations } = useTranslateBatch(demographicTexts);
	const translateValue = (value: string) => {
		if (!value) return value;
		const trimmed = value.trim();
		const lower = trimmed.toLowerCase();
		const cap =
			trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();

		if (translations[value]) return translations[value];
		if (translations[trimmed]) return translations[trimmed];
		if (translations[cap]) return translations[cap];
		if (translations[lower]) return translations[lower];

		const langData =
			(i18n.store?.data?.[i18n.language]?.translation as any) ?? {};
		const direct =
			langData[value] ?? langData[trimmed] ?? langData[cap] ?? langData[lower];
		if (typeof direct === "string" && direct.trim() !== "") return direct;

		const res =
			i18n.getResource(i18n.language, "translation", value) ??
			i18n.getResource(i18n.language, "translation", trimmed) ??
			i18n.getResource(i18n.language, "translation", cap) ??
			i18n.getResource(i18n.language, "translation", lower);
		if (typeof res === "string" && res.trim() !== "") return res;

		return value;
	};

	const genderData = useMemo(
		() =>
			toSlices((data as any)?.demographics?.gender, (label: string) => {
				// normalize label keys
				const key = label?.trim();
				return GENDER_COLOR_MAP[key] ?? GENDER_COLOR_MAP[label] ?? "#148696";
			}),
		[data],
	);
	const nationalityData = useMemo(
		() =>
			toSlices((data as any)?.demographics?.nationality, NATIONALITY_COLORS),
		[data],
	);
	const displayGenderData = useMemo(
		() =>
			sortSlicesWithOtherLast(genderData).map((slice) => ({
				...slice,
				label: translateValue(slice.label),
			})),
		[genderData, translateValue],
	);
	const displayNationalityData = useMemo(
		() =>
			sortSlicesWithOtherLast(nationalityData).map((slice) => ({
				...slice,
				label: translateValue(slice.label),
			})),
		[nationalityData, translateValue],
	);
	const rawDisplayGenderData = useMemo(
		() => sortSlicesWithOtherLast(genderData),
		[genderData],
	);
	const totalWorkers = useMemo(
		() =>
			backendTotalWorkers > 0
				? backendTotalWorkers
				: rawDisplayGenderData.reduce((s, d) => s + d.value, 0),
		[backendTotalWorkers, rawDisplayGenderData],
	);
	const demographicSummaryCount = totalWorkers;
	const nationalitySummary = t("supplierDashboard.demographics.totalWorkers", {
		count: totalWorkers,
	});

	return (
		<section className={styles.dashSection}>
			<div className={styles.sectionHeadRow}>
				<h2 className="heading-display">
					{t("supplierDashboard.demographics.title")}
				</h2>
			</div>
			<div className={styles.demoGrid}>
				<DemoCard
					chartTitle={t("supplierDashboard.demographics.byGender")}
					data={displayGenderData}
					summary={t("supplierDashboard.demographics.totalWorkers", {
						count: demographicSummaryCount,
					})}
					title={t("supplierDashboard.demographics.byGenderCard")}
				/>
				<DemoCard
					chartTitle={t("supplierDashboard.demographics.byNationality")}
					data={displayNationalityData}
					summary={nationalitySummary}
					title={t("supplierDashboard.demographics.byNationalityCard")}
				/>
			</div>
		</section>
	);
}
