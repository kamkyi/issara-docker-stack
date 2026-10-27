import { Link } from "@tanstack/react-router";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
	ImprovementTrack,
	TrackActivity,
	TrackStage,
} from "$src/queries/useImprovementTracks";
import { useTranslateBatch } from "$src/queries/useTranslateBatch";
import { CheckIcon, StageIcons } from "./stageIcons";
import styles from "./supplier-dashboard.module.css";

// Deep-link an activity to its CASCADE Marketplace solution. The marketplace
// reads these keys on mount to open the Solutions Catalog on the right solution.
const openInMarketplace = (activity: TrackActivity) => {
	try {
		localStorage.setItem("cascade-marketplace-target-tab", "catalog");
		if (activity.slug) {
			localStorage.setItem(
				"cascade-marketplace-target-solution",
				activity.slug,
			);
		} else {
			localStorage.removeItem("cascade-marketplace-target-solution");
		}
	} catch {
		/* ignore storage failures */
	}
};

const statusClass = (status: string) =>
	status === "done"
		? styles.statusDone
		: status === "progress"
			? styles.statusProgress
			: styles.statusTodo;

// Frontend palette override for track tabs. The backend currently returns the
// same teal for multiple tracks; this map keeps each track visually distinct
// regardless of the API/mock color.
// The 4th track is in flux — the team hasn't decided between "Gender" and
// "Living and Working Conditions". Both keys/labels map to coral so the tab
// renders correctly whichever the backend ends up returning.
const TRACK_COLOR_OVERRIDES: Record<string, string> = {
	grievance_mechanisms: "#148696",
	ethical_recruitment: "#FFEDAF",
	living_wages: "#6F2E97",
	gender: "#FB8379",
	living_and_working_conditions: "#FB8379",
	living_working_conditions: "#FB8379",
	working_conditions: "#FB8379",
	climate_resilience: "#A6DFDD",
};

const TRACK_COLOR_OVERRIDES_BY_LABEL: Record<string, string> = {
	"grievance mechanisms": "#148696",
	"ethical recruitment": "#FFEDAF",
	"living wages": "#6F2E97",
	gender: "#FB8379",
	"living and working conditions": "#FB8379",
	"climate resilience": "#A6DFDD",
};

const resolveTrackColor = (tr: { key: string; label: string; color: string }) =>
	TRACK_COLOR_OVERRIDES[tr.key] ??
	TRACK_COLOR_OVERRIDES_BY_LABEL[tr.label?.trim().toLowerCase()] ??
	tr.color;

function StageNode({ stage }: { stage: TrackStage }) {
	const { t } = useTranslation();
	const Ico = StageIcons[stage.key] ?? StageIcons.learning;
	return (
		<div className={`${styles.stageNode} ${statusClass(stage.status)}`}>
			<div className={styles.stageCircle}>
				{stage.status === "done" ? (
					<CheckIcon height={22} width={22} />
				) : (
					<Ico height={22} width={22} />
				)}
			</div>
			<div className={styles.stageMeta}>
				<span className={styles.stageLabel}>{stage.label}</span>
				<span className={styles.stageStatusPill}>
					{t(`supplierDashboard.tracks.stageStatus.${stage.status}`)}
				</span>
			</div>
		</div>
	);
}

function StageStrip({ stages }: { stages: TrackStage[] }) {
	const arrowId = useId();
	return (
		<div className={styles.stageStrip}>
			<svg
				aria-hidden
				className={styles.stageConnector}
				preserveAspectRatio="none"
				viewBox="0 0 100 12"
			>
				<defs>
					<marker
						id={arrowId}
						markerHeight="6"
						markerWidth="6"
						orient="auto-start-reverse"
						refX="7"
						refY="5"
						viewBox="0 0 10 10"
					>
						<path d="M0,0 L10,5 L0,10 z" fill="#2a3a40" />
					</marker>
				</defs>
				<path
					d="M 13 4 Q 20 10 30 4 T 50 4 T 70 4 T 87 4"
					fill="none"
					markerEnd={`url(#${arrowId})`}
					stroke="#2a3a40"
					strokeDasharray="4 3"
					strokeLinecap="round"
					strokeWidth="1.4"
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
			{stages.map((s) => (
				<StageNode key={s.key} stage={s} />
			))}
		</div>
	);
}

function ActivityColumn({
	stage,
	translateValue,
}: {
	stage: TrackStage;
	translateValue: (text?: string | null) => string;
}) {
	const { t } = useTranslation();
	const Ico = StageIcons[stage.key] ?? StageIcons.learning;
	return (
		<div className={styles.activityCol}>
			<header className={styles.activityHead}>
				<span className={styles.ahIco}>
					<Ico height={14} width={14} />
				</span>
				<h4>{translateValue(stage.label)}</h4>
			</header>
			<div className={styles.activityList}>
				{stage.activities.length === 0 && (
					<div className={styles.activityEmpty}>
						{t("supplierDashboard.tracks.noActivities")}
					</div>
				)}
				{stage.activities.map((a) => (
					<Link
						className={`${styles.activityItem} ${statusClass(a.status)}`}
						key={a.name}
						onClick={() => openInMarketplace(a)}
						title={translateValue(a.name)}
						to="/cascade-marketplace"
					>
						<span className={styles.statusDot} />
						<span className={styles.activityName}>
							{translateValue(a.name)}
						</span>
						<span className={styles.activityStatusLabel}>
							{t(`supplierDashboard.tracks.status.${a.status}`)}
						</span>
					</Link>
				))}
			</div>
		</div>
	);
}

export default function ImprovementTracksSection({
	tracks,
}: {
	tracks: ImprovementTrack[];
}) {
	const { t } = useTranslation();
	const [activeKey, setActiveKey] = useState(tracks[0]?.key);
	const trackTexts = useMemo(() => {
		const values: string[] = [];
		for (const track of tracks) {
			values.push(track.label);
			for (const stage of track.stages) {
				values.push(stage.label);
				for (const activity of stage.activities) {
					values.push(activity.name);
				}
			}
		}
		return values;
	}, [tracks]);
	const { translations } = useTranslateBatch(trackTexts);
	const translateValue = (text?: string | null) =>
		text ? (translations[text] ?? text) : "";
	const activeTrack = useMemo(
		() => tracks.find((tr) => tr.key === activeKey) ?? tracks[0],
		[tracks, activeKey],
	);

	if (!activeTrack) return null;

	const totals = activeTrack.totals;
	const pct = (n: number) => (totals.total > 0 ? (n / totals.total) * 100 : 0);

	return (
		<section className={styles.dashSection}>
			<div className={styles.sectionHeadRow}>
				<h2 className="heading-display">
					{t("supplierDashboard.tracks.title")}
				</h2>
				<span className={styles.headMeta}>
					{t("supplierDashboard.tracks.subtitle")}
				</span>
			</div>

			<div className={styles.trackCard}>
				<div className={styles.trackTabs} role="tablist">
					{tracks.map((tr) => {
						const active = tr.key === activeTrack.key;
						const trackColor = resolveTrackColor(tr);

						const hexToRgb = (hex: string) => {
							const h = hex.replace(/^#/, "");
							const bigint = parseInt(
								h.length === 3
									? h
											.split("")
											.map((c) => c + c)
											.join("")
									: h,
								16,
							);
							return {
								r: (bigint >> 16) & 255,
								g: (bigint >> 8) & 255,
								b: bigint & 255,
							};
						};

						const luminance = (r: number, g: number, b: number) => {
							const srgb = [r, g, b]
								.map((v) => v / 255)
								.map((c) =>
									c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
								);
							return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
						};

						const contrastColorForHex = (hex: string) => {
							try {
								const { r, g, b } = hexToRgb(hex);
								const L = luminance(r, g, b);
								// WCAG recommends contrast; choose white for dark backgrounds
								return L < 0.5 ? "#ffffff" : "#000000";
							} catch {
								return "#ffffff";
							}
						};

						const onColor = contrastColorForHex(trackColor || "#148696");

						return (
							<button
								aria-selected={active}
								className={styles.trackTab}
								key={tr.key}
								onClick={() => setActiveKey(tr.key)}
								role="tab"
								style={
									active
										? ({
												background: trackColor,
												borderColor: trackColor,
												// set CSS variable so the CSS rule can apply color with !important
												"--track-active-color": onColor,
											} as any)
										: undefined
								}
								type="button"
							>
								<span
									className={styles.trackTabDot}
									style={{ background: active ? onColor : trackColor }}
								/>
								{translateValue(tr.label)}
							</button>
						);
					})}
				</div>

				<StageStrip stages={activeTrack.stages} />

				<div className={styles.activityGrid}>
					{activeTrack.stages.map((s) => (
						<ActivityColumn
							key={s.key}
							stage={s}
							translateValue={translateValue}
						/>
					))}
				</div>

				<div className={styles.trackSummaryRow}>
					<div className={styles.trackSummary}>
						<span className={styles.tsLabel}>
							{t("supplierDashboard.tracks.statusAcross")}{" "}
							<b>{translateValue(activeTrack.label)}</b>
						</span>
						<div className={styles.tsBar}>
							<div
								className={`${styles.tsSeg} ${styles.tsSegDone}`}
								style={{ width: `${pct(totals.done)}%` }}
							/>
							<div
								className={`${styles.tsSeg} ${styles.tsSegProgress}`}
								style={{ width: `${pct(totals.progress)}%` }}
							/>
							<div
								className={`${styles.tsSeg} ${styles.tsSegTodo}`}
								style={{ width: `${pct(totals.todo)}%` }}
							/>
						</div>
					</div>
					<div className={styles.tsLegend}>
						<span className={`${styles.tsLeg} ${styles.tsDone}`}>
							<span />
							{t("supplierDashboard.tracks.legend.completed", {
								count: totals.done,
							})}
						</span>
						<span className={`${styles.tsLeg} ${styles.tsProgress}`}>
							<span />
							{t("supplierDashboard.tracks.legend.inProgress", {
								count: totals.progress,
							})}
						</span>
						<span className={`${styles.tsLeg} ${styles.tsTodo}`}>
							<span />
							{t("supplierDashboard.tracks.legend.notStarted", {
								count: totals.todo,
							})}
						</span>
					</div>
				</div>
			</div>
		</section>
	);
}
