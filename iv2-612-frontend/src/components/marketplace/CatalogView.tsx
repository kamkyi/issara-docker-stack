import * as Icons from "@mui/icons-material";
import { Button, Dialog } from "@radix-ui/themes";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useActiveLanguage } from "$src/hooks/useActiveLanguage";
import { useTranslateBatch } from "$src/queries/useTranslateBatch";
import { ensureArray } from "$src/utils/ensureArray";
import { getUserIdentifiers } from "$src/utils/getUserIdentifiers";
// Use a small generated list of suppliers for the modal (Supplier A, B, ...)
import { SolutionTable } from "./SolutionTable";

interface Partner {
	id: number;
	name: string;
	code?: string;
	country?: string;
}

interface SupplierEntry {
	id: number;
	name: string;
	status?: string;
	country?: string;
	popularity?: number;
}

interface CatalogViewProps {
	isSupplierContext?: boolean;
	mock?: boolean;
	onAdd: (
		solution: any,
		meta?: { action?: "self" | "sponsor" | "recommend"; partners?: Partner[] },
	) => void;
	planIds: number[];
	supplierScores?: Array<{ supplier_id: number; score: number }>;
}

interface Solution {
	id: number;
	title: string;
	type: string;
	category: string;
	cost: string;
	description: string;
	impact: number;
	icon?: string;
	comingSoon?: boolean;
	thematic_tags?: string[];
	partners?: string[];
	languages?: number[];
	solution_languages?: Array<{
		language_id: number;
		id: number;
		training_dates?: Array<{
			id: number;
			training_date: string;
			contract_detail?: string | null;
		}>;
	}>;
}

export const CatalogView = ({
	isSupplierContext = false,
	mock = false,
	onAdd,
	planIds,
	supplierScores = [],
}: CatalogViewProps) => {
	const { t } = useTranslation();
	const [filter, setFilter] = useState("Worker Voice");
	const [solutionsData, setSolutionsData] = useState<Solution[]>([]);
	const [loading, setLoading] = useState(false);

	const [modalOpen, setModalOpen] = useState(false);
	const [selectedSolution, setSelectedSolution] = useState<any>(null);
	const [action, setAction] = useState<"self" | "sponsor" | "recommend">(
		"self",
	);
	const [selectedSuppliers, setSelectedSuppliers] = useState<number[]>([]);
	const [realSuppliers, setRealSuppliers] = useState<SupplierEntry[]>([]);
	const [suppliersLoading, setSuppliersLoading] = useState(false);
	const [highlightId, setHighlightId] = useState<number | null>(null);

	const DEFAULT_FILTERS = [
		"Worker Voice",
		"Ethical Recruitment",
		"Living and Working Conditions",
		"Living Wages",
		"Climate Resilient Supply Chains",
		"Company Policies & Systems",
	];

	const BUILT_IN_CATEGORY_KEYS: Record<string, string> = {
		"Worker Voice": "cascadeMarketplace.catalog.categories.workerVoice",
		"Ethical Recruitment":
			"cascadeMarketplace.catalog.categories.ethicalRecruitment",
		"Living and Working Conditions":
			"cascadeMarketplace.catalog.categories.livingAndWorkingConditions",
		"Living Wages": "cascadeMarketplace.catalog.categories.livingWages",
		"Climate Resilient Supply Chains":
			"cascadeMarketplace.catalog.categories.climateResilientSupplyChains",
		"Company Policies & Systems":
			"cascadeMarketplace.catalog.categories.companyPoliciesSystems",
	};

	const getCategoryLabel = (category: string) => {
		const key = BUILT_IN_CATEGORY_KEYS[category];
		if (key) return t(key);
		return category;
	};

	const isBuiltInCategory = (category: string) =>
		Object.keys(BUILT_IN_CATEGORY_KEYS).includes(category);

	const [filters, setFilters] = useState<string[]>(DEFAULT_FILTERS);

	const catalogTexts = useMemo(() => {
		const values: string[] = [];

		for (const filterName of filters) {
			if (!isBuiltInCategory(filterName)) values.push(filterName);
		}

		// title/description are already localized server-side (GET /solutions?lang=xx
		// reads solution_translations) — only type/category/tags/partners, which come
		// from lookup tables with no translation storage yet, still need live translation.
		for (const solution of ensureArray(solutionsData)) {
			if (solution.type) values.push(solution.type);
			if (solution.category && !isBuiltInCategory(solution.category)) {
				values.push(solution.category);
			}
			ensureArray(solution.thematic_tags).forEach((tag) => {
				if (typeof tag === "string") values.push(tag);
			});
			ensureArray(solution.partners).forEach((partner) => {
				if (typeof partner === "string") {
					values.push(partner);
				} else if (partner?.name) {
					values.push(partner.name);
				}
			});
		}

		return values;
	}, [filters, solutionsData]);

	const activeLanguage = useActiveLanguage();
	const { translations } = useTranslateBatch(catalogTexts);
	const translateValue = (text?: string | null) =>
		text ? (translations[text] ?? text) : "";

	useEffect(() => {
		let cancelled = false;

		const API_BASE = (import.meta.env.VITE_APP_CASCADE_API_URL as string) || "";
		const url = API_BASE
			? `${API_BASE.replace(/\/$/, "")}/solution-categories`
			: "/api/v1/solution-categories";

		// Always fetch fresh categories from the database (no localStorage caching)
		try {
			localStorage.removeItem("cache_solution_categories");
		} catch (_) {}

		fetch(url, { credentials: "include" })
			.then((res) => {
				if (!res.ok) throw new Error(`status ${res.status}`);
				return res.json();
			})
			.then((data) => {
				if (cancelled) return;
				const items = Array.isArray(data)
					? data
					: data.records || data.data || [];
				if (items.length > 0) {
					const names = items.map(
						(it: any) => it.name || it.title || String(it),
					);
					setFilters(names);
				}
			})
			.catch(() => {
				// keep defaults on error only when using mock mode
				if (mock) {
					setFilters(DEFAULT_FILTERS);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [mock]);

	// Keep the active category valid once the real categories load (the initial
	// "Worker Voice" default may not exist in the backend category list).
	useEffect(() => {
		const first = filters[0];
		if (first && !filters.includes(filter)) {
			setFilter(first);
		}
	}, [filters, filter]);

	useEffect(() => {
		const API_BASE = import.meta.env.VITE_APP_CASCADE_API_URL as string;
		const fetchUrl = API_BASE
			? `${API_BASE.replace(/\/$/, "")}/solutions?lang=${activeLanguage}`
			: `/api/v1/solutions?lang=${activeLanguage}`;

		let cancelled = false;
		setLoading(true);
		fetch(fetchUrl, { credentials: "include" })
			.then((res) => {
				if (!res.ok) throw new Error(`Fetch error ${res.status}`);
				return res.json();
			})
			.then((data) => {
				if (cancelled) return;
				const items = Array.isArray(data)
					? data
					: data.data || data.items || [];
				if (items.length > 0) {
					setSolutionsData(items as Solution[]);
				}
			})
			.catch((err) => {
				console.error("Failed to load solutions from backend:", err);
			})
			.finally(() => setLoading(false));

		return () => {
			cancelled = true;
		};
	}, [activeLanguage]);

	// Deep-link: when arriving from the Company Dashboard, scroll to (and briefly
	// highlight) the requested solution once the catalog has loaded — no modal.
	useEffect(() => {
		if (solutionsData.length === 0) return;
		let targetSlug: string | null = null;
		try {
			targetSlug = localStorage.getItem("cascade-marketplace-target-solution");
		} catch {
			targetSlug = null;
		}
		if (!targetSlug) return;
		try {
			localStorage.removeItem("cascade-marketplace-target-solution");
		} catch {
			/* ignore */
		}
		const match = solutionsData.find((s) => (s as any).slug === targetSlug);
		if (match) {
			if (match.category) setFilter(match.category);
			setHighlightId(match.id);
		}
	}, [solutionsData]);

	// Scroll the highlighted solution card into view, then fade the ring out.
	useEffect(() => {
		if (highlightId == null) return;
		const raf = requestAnimationFrame(() => {
			document
				.getElementById(`solution-card-${highlightId}`)
				?.scrollIntoView({ behavior: "smooth", block: "center" });
		});
		const tmo = setTimeout(() => setHighlightId(null), 2500);
		return () => {
			cancelAnimationFrame(raf);
			clearTimeout(tmo);
		};
	}, [highlightId, filter]);

	useEffect(() => {
		if (mock) {
			return;
		}
		// Suppliers don't have a supplier picker — skip the dropdown fetch.
		if (isSupplierContext) {
			return;
		}

		const rawBase = (
			import.meta.env.VITE_APP_CASCADE_API_URL as string
		)?.replace(/\/$/, "");
		if (!rawBase) return;
		// Force HTTP for localhost — the dev API doesn't terminate TLS, and the
		// browser may auto-upgrade due to HSTS or mixed-content rules.
		const CASCADE_BASE = /^https:\/\/(localhost|127\.0\.0\.1)/i.test(rawBase)
			? rawBase.replace(/^https:/i, "http:")
			: rawBase;

		const token = localStorage.getItem("auth_token");
		const headers: Record<string, string> = token
			? { Authorization: `Bearer ${token}` }
			: {};

		// Pass partner_id so the API filters to this partner's supply chain only
		const { partnerId } = getUserIdentifiers();

		let cancelled = false;
		setSuppliersLoading(true);

		// Upgrade http → https on pagination URLs returned by the API to avoid
		// mixed-content blocks when the app is served over HTTPS. Skip for
		// localhost/127.0.0.1 since the dev API doesn't terminate TLS.
		const toHttps = (url: string) => {
			try {
				const host = new URL(url).hostname;
				if (host === "localhost" || host === "127.0.0.1") return url;
			} catch {
				return url;
			}
			return url.replace(/^http:\/\//i, "https://");
		};

		const fetchAll = (
			url: string,
			acc: SupplierEntry[] = [],
		): Promise<SupplierEntry[]> =>
			fetch(toHttps(url), { headers })
				.then((res) => {
					if (!res.ok) throw new Error(`status ${res.status}`);
					return res.json();
				})
				.then((data) => {
					const items = [...acc, ...(data.results || [])];
					return data.next ? fetchAll(data.next, items) : items;
				});

		const filteredUrl = partnerId
			? `${CASCADE_BASE}/supplier_list_dropdown/?partner_id=${partnerId}`
			: `${CASCADE_BASE}/supplier_list_dropdown/`;

		fetchAll(filteredUrl)
			.then((items) => {
				if (cancelled) return;
				console.log(
					`[CatalogView] supplier_list_dropdown partner_id=${partnerId} returned ${items.length} items`,
				);
				if (items.length === 0 && partnerId) {
					console.warn(
						`[CatalogView] No suppliers for partner_id=${partnerId}; falling back to unfiltered list`,
					);
					return fetchAll(`${CASCADE_BASE}/supplier_list_dropdown/`).then(
						(all) => {
							console.log(
								`[CatalogView] unfiltered fallback returned ${all.length} items`,
							);
							if (!cancelled) setRealSuppliers(all);
						},
					);
				}
				setRealSuppliers(items);
			})
			.catch((err) => console.error("Failed to load suppliers:", err))
			.finally(() => {
				if (!cancelled) setSuppliersLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [isSupplierContext, mock]);

	const filteredSolutions = ensureArray(solutionsData).filter(
		(s) => s.category === filter,
	);

	// Simple mock suppliers (Supplier A, Supplier B, ...)
	const mockSuppliers: SupplierEntry[] = [
		{ id: 1, name: "Supplier A", country: "Vietnam", popularity: 68 },
		{ id: 2, name: "Supplier B", country: "Bangladesh", popularity: 72 },
		{ id: 3, name: "Supplier C", country: "Thailand", popularity: 65 },
		{ id: 4, name: "Supplier D", country: "India", popularity: 70 },
	];

	const activeSuppliers = mock ? mockSuppliers : realSuppliers;
	const getSupplierDisplayName = (supplier: SupplierEntry) =>
		supplier.status === "inactive"
			? `${supplier.name} (inactive)`
			: supplier.name;

	const SelectedIcon = selectedSolution
		? (Icons as any)[selectedSolution.icon] || Icons.Help
		: Icons.Help;

	const onAddRequest = (solution: any) => {
		// Suppliers add directly to their own plan — no sponsor/recommend flow.
		if (isSupplierContext) {
			onAdd(solution, { action: "self", partners: [] });
			return;
		}
		setSelectedSolution(solution);
		setAction("self");
		setSelectedSuppliers([]);
		setModalOpen(true);
	};

	const handleConfirm = () => {
		if (!selectedSolution) return;
		// map selected supplier ids to partner objects
		const partners = selectedSuppliers.map((id) => {
			const p = activeSuppliers.find((m) => m.id === id);
			return {
				id,
				name: p
					? getSupplierDisplayName(p)
					: `S-${String(id).padStart(3, "0")}`,
				country: p?.country,
				code: `S-${String(id).padStart(3, "0")}`,
			} as Partner;
		});

		// Send selected solution plus action and partner objects to parent
		onAdd(selectedSolution, { action, partners });
		if (action !== "self") {
			console.log(`${action} for suppliers:`, partners);
		}
		setModalOpen(false);
		setSelectedSolution(null);
	};

	const toggleSupplier = (id: number) => {
		setSelectedSuppliers((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	};

	return (
		<div className="space-y-8">
			{/* Filter Tabs */}
			<div className="flex bg-white p-1 rounded-xl w-full">
				{filters.map((f) => (
					<button
						className={`flex-1 px-6 py-2 rounded-lg text-sm font-bold text-center transition-all text-[#004A60] ${
							filter === f ? "bg-[#A6DFDD] shadow-sm" : "hover:bg-[#FFF8DE]"
						}`}
						key={f}
						onClick={() => setFilter(f)}
					>
						{isBuiltInCategory(f) ? getCategoryLabel(f) : translateValue(f)}
					</button>
				))}
			</div>

			{/* Solutions table */}
			{loading ? (
				<div className="text-center text-gray-500 py-10">
					{t("cascadeMarketplace.catalog.loading")}
				</div>
			) : (
				<SolutionTable
					highlightId={highlightId}
					onAdd={onAddRequest}
					planIds={planIds}
					solutions={filteredSolutions}
					translations={translations}
				/>
			)}

			{/* Add to Plan Modal */}
			<Dialog.Root onOpenChange={(o) => setModalOpen(o)} open={modalOpen}>
				<Dialog.Content>
					<div className="relative">
						<div className="flex items-start justify-between">
							<div className="flex items-start gap-4">
								<div className="w-12 h-12 bg-blue-50 text-[#148696] rounded-lg flex items-center justify-center">
									<SelectedIcon />
								</div>
								<div>
									<div className="text-lg font-bold">
										{t("cascadeMarketplace.catalog.modal.title")}{" "}
										<span className="font-normal">
											{selectedSolution?.title}
										</span>
									</div>
									<div className="text-sm text-gray-600 mt-1">
										{t("cascadeMarketplace.catalog.modal.subtitle")}
									</div>
								</div>
							</div>
							<button
								aria-label="Close"
								className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800 text-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#148696]"
								onClick={() => setModalOpen(false)}
							>
								<Icons.Close fontSize="small" />
							</button>
						</div>

						<div className="mt-6 space-y-4">
							<div className="grid gap-3">
								{/* For Myself (no leading icon) */}
								<label
									className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer ${action === "self" ? "ring-2 ring-[#148696]" : ""}`}
									onClick={() => setAction("self")}
								>
									<input
										checked={action === "self"}
										className="sr-only"
										name="add-action"
										onChange={() => setAction("self")}
										type="radio"
									/>
									<div className="flex items-center gap-3">
										{/* custom radio indicator */}
										<div className="w-5 h-5 flex items-center justify-center">
											<div
												className={`w-3 h-3 rounded-full ${action === "self" ? "bg-[#148696]" : "border-2 border-gray-300"}`}
											></div>
										</div>
										<div>
											<div className="font-bold">
												{t("cascadeMarketplace.catalog.modal.forMyselfTitle")}
											</div>
											<div className="text-xs text-gray-500">
												{t("cascadeMarketplace.catalog.modal.forMyselfBody")}
											</div>
										</div>
									</div>
								</label>

								{/* Sponsor (no leading icon) */}
								<label
									className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer ${action === "sponsor" ? "ring-2 ring-[#148696]" : ""}`}
									onClick={() => setAction("sponsor")}
								>
									<input
										checked={action === "sponsor"}
										className="sr-only"
										name="add-action"
										onChange={() => setAction("sponsor")}
										type="radio"
									/>
									<div className="flex items-center gap-3">
										<div className="w-5 h-5 flex items-center justify-center">
											<div
												className={`w-3 h-3 rounded-full ${action === "sponsor" ? "bg-[#148696]" : "border-2 border-gray-300"}`}
											></div>
										</div>
										<div>
											<div className="font-bold">
												{t("cascadeMarketplace.catalog.modal.sponsorTitle")}
											</div>
											<div className="text-xs text-gray-500">
												{t("cascadeMarketplace.catalog.modal.sponsorBody")}
											</div>
										</div>
									</div>
									<div className="ml-4">
										<span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-semibold border border-green-100">
											<Icons.AttachMoney fontSize="small" />
											{t("cascadeMarketplace.catalog.modal.youPay")}
										</span>
									</div>
								</label>

								{/* Recommend (no leading icon) */}
								<label
									className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer ${action === "recommend" ? "ring-2 ring-[#148696]" : ""}`}
									onClick={() => setAction("recommend")}
								>
									<input
										checked={action === "recommend"}
										className="sr-only"
										name="add-action"
										onChange={() => setAction("recommend")}
										type="radio"
									/>
									<div className="flex items-center gap-3">
										<div className="w-5 h-5 flex items-center justify-center">
											<div
												className={`w-3 h-3 rounded-full ${action === "recommend" ? "bg-[#148696]" : "border-2 border-gray-300"}`}
											></div>
										</div>
										<div>
											<div className="font-bold">
												{t("cascadeMarketplace.catalog.modal.recommendTitle")}
											</div>
											<div className="text-xs text-gray-500">
												{t("cascadeMarketplace.catalog.modal.recommendBody")}
											</div>
										</div>
									</div>
									<div className="ml-4">
										<span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
											<Icons.Send fontSize="small" />
											{t("cascadeMarketplace.catalog.modal.theyPay")}
										</span>
									</div>
								</label>
							</div>

							{action === "self" && (
								<div className="mt-2 p-3 rounded-lg bg-blue-50 text-sm text-[#133e47]">
									{t("cascadeMarketplace.catalog.modal.selfHint")}
								</div>
							)}

							{(action === "sponsor" || action === "recommend") && (
								<div className="mt-2">
									<div className="font-semibold mb-2">
										{t("cascadeMarketplace.catalog.modal.selectSuppliers", {
											count: selectedSuppliers.length,
										})}
									</div>
									<div className="max-h-56 overflow-auto border rounded-md p-2">
										{suppliersLoading ? (
											<div className="text-center text-gray-400 py-4 text-sm">
												{t("cascadeMarketplace.catalog.modal.loadingSuppliers")}
											</div>
										) : activeSuppliers.length === 0 ? (
											<div className="text-center text-gray-400 py-4 text-sm">
												{t("cascadeMarketplace.catalog.modal.noSuppliersFound")}
											</div>
										) : (
											activeSuppliers.map((s) => {
												const wvEntry = supplierScores.find(
													(e) => e.supplier_id === s.id,
												);
												const score =
													wvEntry != null
														? Math.round(wvEntry.score)
														: (s.popularity ?? null);
												const scoreClass =
													score == null
														? "bg-gray-50 text-gray-500 border-gray-100"
														: score < 40
															? "bg-red-50 text-red-700 border-red-100"
															: score < 70
																? "bg-orange-50 text-orange-700 border-orange-100"
																: "bg-green-50 text-green-700 border-green-100";
												const selected = selectedSuppliers.includes(s.id);
												return (
													<label
														className={`flex items-center justify-between gap-4 p-3 border-b last:border-b-0 cursor-pointer ${
															selected ? "bg-[#eafafc]" : "hover:bg-gray-50"
														}`}
														key={s.id}
													>
														<div className="flex items-center gap-3">
															<input
																aria-label={`Select ${getSupplierDisplayName(s)}`}
																checked={selected}
																className="w-4 h-4 text-[#148696] border-gray-300 rounded"
																onChange={() => toggleSupplier(s.id)}
																type="checkbox"
															/>
															<div>
																<div className="font-bold">
																	{getSupplierDisplayName(s)}
																</div>
																<div className="text-xs text-gray-400">
																	{s.country ? `${s.country} • ` : ""}S-
																	{String(s.id).padStart(3, "0")}
																</div>
															</div>
														</div>
														<div
															className={`text-xs px-2 py-1 rounded border ${scoreClass} font-semibold whitespace-nowrap`}
														>
															{score != null
																? t(
																		"cascadeMarketplace.catalog.modal.scoreLabel",
																		{
																			score,
																		},
																	)
																: t("cascadeMarketplace.catalog.modal.noScore")}
														</div>
													</label>
												);
											})
										)}
									</div>
									{selectedSuppliers.length === 0 && (
										<div className="text-sm text-orange-500 mt-2">
											{t(
												"cascadeMarketplace.catalog.modal.selectSupplierValidation",
											)}
										</div>
									)}
								</div>
							)}

							{/* Summary */}
							<div className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-100">
								<div className="font-semibold mb-3">
									{t("cascadeMarketplace.catalog.modal.summary")}
								</div>
								<div className="flex justify-between text-sm text-gray-600">
									<div>{t("cascadeMarketplace.catalog.modal.activity")}:</div>
									<div className="font-bold text-gray-800">
										{selectedSolution?.title}
									</div>
								</div>
								<div className="flex justify-between text-sm text-gray-600 mt-2">
									<div>
										{t("cascadeMarketplace.catalog.modal.scoreImpact")}:
									</div>
									<div className="font-bold text-green-600">
										{t("cascadeMarketplace.plan.item.points", {
											count: selectedSolution?.impact ?? 0,
										})}
									</div>
								</div>

								{(action === "sponsor" || action === "recommend") && (
									<div className="flex justify-between text-sm text-gray-600 mt-2">
										<div>
											{t("cascadeMarketplace.catalog.modal.suppliers")}:
										</div>
										<div className="flex items-center gap-2">
											{selectedSuppliers.length === 0 ? (
												<div className="text-sm text-orange-500">
													{t("cascadeMarketplace.catalog.modal.noneSelected")}
												</div>
											) : (
												activeSuppliers
													.filter((s) => selectedSuppliers.includes(s.id))
													.map((s) => (
														<span
															className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-semibold"
															key={s.id}
														>
															{getSupplierDisplayName(s)}
														</span>
													))
											)}
										</div>
									</div>
								)}
							</div>
						</div>

						<div className="flex justify-end gap-3 mt-4">
							<Button
								color="gray"
								onClick={() => setModalOpen(false)}
								variant="soft"
							>
								{t("common.cancel")}
							</Button>
							<Button
								disabled={action !== "self" && selectedSuppliers.length === 0}
								onClick={handleConfirm}
							>
								{action === "self"
									? t("cascadeMarketplace.catalog.card.addToPlan")
									: action === "sponsor"
										? t("cascadeMarketplace.catalog.modal.sponsorTitle")
										: t("cascadeMarketplace.catalog.modal.recommendTitle")}
							</Button>
						</div>
					</div>
				</Dialog.Content>
			</Dialog.Root>
		</div>
	);
};
