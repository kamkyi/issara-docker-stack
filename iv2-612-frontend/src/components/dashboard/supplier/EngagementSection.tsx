import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { EngagementRow } from "$src/queries/useImprovementTracks";
import { useTranslateBatch } from "$src/queries/useTranslateBatch";
import { ArrowRightIcon } from "./stageIcons";
import styles from "./supplier-dashboard.module.css";

const csvEscape = (value: string | undefined) =>
	`"${String(value ?? "").replace(/"/g, '""')}"`;

type SortKey = "activity" | "track" | "location" | "date" | "user";
const COL_KEYS: SortKey[] = ["activity", "track", "location", "date", "user"];
const PAGE_SIZES = [10, 20, 30, 50];

// The "user" column shows "user (role)", so search both.
const colValue = (r: EngagementRow, key: SortKey) =>
	key === "user" ? `${r.user} ${r.role}` : String(r[key] ?? "");

export default function EngagementSection({ rows }: { rows: EngagementRow[] }) {
	const { t } = useTranslation();
	const [colSearch, setColSearch] = useState<Record<SortKey, string>>({
		activity: "",
		track: "",
		location: "",
		date: "",
		user: "",
	});
	const [sortKey, setSortKey] = useState<SortKey>("date");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
	const [pageSize, setPageSize] = useState(10);
	const [page, setPage] = useState(0);

	const engagementTexts = useMemo(() => {
		const values: string[] = [];
		for (const row of rows) {
			values.push(row.activity, row.track, row.location, row.user, row.role);
		}
		return values;
	}, [rows]);

	const { translations } = useTranslateBatch(engagementTexts);
	const translateValue = (text?: string | null) =>
		text ? (translations[text] ?? text) : "";

	const processed = useMemo(() => {
		const filtered = rows.filter((r) =>
			COL_KEYS.every((key) => {
				const q = colSearch[key].trim().toLowerCase();
				return !q || colValue(r, key).toLowerCase().includes(q);
			}),
		);
		const sorted = [...filtered].sort((a, b) => {
			const av = String(a[sortKey] ?? "").toLowerCase();
			const bv = String(b[sortKey] ?? "").toLowerCase();
			if (av < bv) return sortDir === "asc" ? -1 : 1;
			if (av > bv) return sortDir === "asc" ? 1 : -1;
			return 0;
		});
		return sorted;
	}, [rows, colSearch, sortKey, sortDir]);

	const total = processed.length;
	const pageCount = Math.max(1, Math.ceil(total / pageSize));
	const safePage = Math.min(page, pageCount - 1);
	const start = safePage * pageSize;
	const pageRows = processed.slice(start, start + pageSize);

	const toggleSort = (key: SortKey) => {
		if (key === sortKey) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(key);
			setSortDir("asc");
		}
		setPage(0);
	};

	const sortArrow = (key: SortKey) =>
		sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

	const columns: { key: SortKey; label: string; roleHint?: boolean }[] = [
		{
			key: "activity",
			label: t("supplierDashboard.engagement.columns.activity"),
		},
		{ key: "track", label: t("supplierDashboard.engagement.columns.track") },
		{
			key: "location",
			label: t("supplierDashboard.engagement.columns.location"),
		},
		{ key: "date", label: t("supplierDashboard.engagement.columns.date") },
		{
			key: "user",
			label: t("supplierDashboard.engagement.columns.user"),
			roleHint: true,
		},
	];

	const handleExport = () => {
		const headers = [
			t("supplierDashboard.engagement.columns.activity"),
			t("supplierDashboard.engagement.columns.track"),
			t("supplierDashboard.engagement.columns.location"),
			t("supplierDashboard.engagement.columns.date"),
			t("supplierDashboard.engagement.columns.user"),
			"Role",
		];
		const lines = [
			headers.map(csvEscape).join(","),
			...processed.map((r) =>
				[r.activity, r.track, r.location, r.date, r.user, r.role]
					.map(csvEscape)
					.join(","),
			),
		];
		const blob = new Blob([`﻿${lines.join("\n")}`], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "cascade-engagement.csv";
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	};

	return (
		<section className={styles.dashSection}>
			<div className={styles.sectionHeadRow}>
				<h2 className="heading-display">
					{t("supplierDashboard.engagement.title")}
				</h2>
				<div className={styles.headActions}>
					<button
						className={styles.ghostPill}
						onClick={handleExport}
						type="button"
					>
						{t("supplierDashboard.engagement.export")}
					</button>
				</div>
			</div>

			<div className={styles.engagementCard}>
				<div className={styles.engagementTable}>
					<div className={`${styles.row} ${styles.head}`}>
						{columns.map((c) => (
							<div key={c.key}>
								<button
									className={styles.sortHeader}
									onClick={() => toggleSort(c.key)}
									type="button"
								>
									{c.label}
									{c.roleHint ? (
										<small>
											{" "}
											{t("supplierDashboard.engagement.columns.roleHint")}
										</small>
									) : null}
									<span className={styles.sortArrow}>{sortArrow(c.key)}</span>
								</button>
							</div>
						))}
					</div>

					{/* Per-column search, one input under each column header */}
					<div className={`${styles.row} ${styles.colSearchRow}`}>
						{columns.map((c) => (
							<div key={c.key}>
								<input
									aria-label={c.label}
									className={styles.colSearchInput}
									onChange={(e) => {
										setColSearch((s) => ({ ...s, [c.key]: e.target.value }));
										setPage(0);
									}}
									placeholder={t("supplierDashboard.engagement.searchColumn")}
									type="search"
									value={colSearch[c.key]}
								/>
							</div>
						))}
					</div>

					{pageRows.length === 0 && (
						<div className={styles.searchRow}>
							<span className={styles.cellMuted}>
								{t("supplierDashboard.engagement.noResults")}
							</span>
						</div>
					)}

					{pageRows.map((r, i) => (
						<div className={styles.row} key={`${r.activity}-${r.date}-${i}`}>
							<div className={styles.activityCell}>
								<a className={styles.activityLink} href="/cascade-marketplace">
									{translateValue(r.activity)}
									<ArrowRightIcon height={12} width={12} />
								</a>
							</div>
							<div className={styles.trackCell}>{translateValue(r.track)}</div>
							<div className={styles.cellMuted}>
								{r.location ? translateValue(r.location) : "—"}
							</div>
							<div className={styles.cellMono}>{r.date}</div>
							<div>
								<span className={styles.userName}>
									{r.user ? translateValue(r.user) : "—"}
								</span>
								{r.role ? (
									<span className={styles.userRole}>
										({translateValue(r.role)})
									</span>
								) : null}
							</div>
						</div>
					))}
				</div>

				<footer className={styles.tableFoot}>
					<span>
						{t("supplierDashboard.engagement.showingRange", {
							from: total === 0 ? 0 : start + 1,
							to: start + pageRows.length,
							total,
						})}
					</span>
					<div className={styles.pageControls}>
						<label className={styles.pageSizeLabel}>
							{t("supplierDashboard.engagement.rowsPerPageLabel")}
							<select
								className={styles.pageSelect}
								onChange={(e) => {
									setPageSize(Number(e.target.value));
									setPage(0);
								}}
								value={pageSize}
							>
								{PAGE_SIZES.map((n) => (
									<option key={n} value={n}>
										{n}
									</option>
								))}
							</select>
						</label>
						<button
							aria-label="Previous page"
							className={styles.pageBtn}
							disabled={safePage === 0}
							onClick={() => setPage((p) => Math.max(0, p - 1))}
							type="button"
						>
							‹
						</button>
						<span className={styles.mono}>
							{safePage + 1} / {pageCount}
						</span>
						<button
							aria-label="Next page"
							className={styles.pageBtn}
							disabled={safePage >= pageCount - 1}
							onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
							type="button"
						>
							›
						</button>
					</div>
				</footer>
			</div>
		</section>
	);
}
