import * as Icons from "@mui/icons-material";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { Badge } from "@radix-ui/themes";
import { AnimatePresence, motion } from "framer-motion";
import { Fragment, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import WorldFlag from "react-world-flags";
import { useLanguages } from "$hooks/useLanguages";
import CascadeButton from "$src/components/button/button";
import { ensureArray } from "$src/utils/ensureArray";
import { SolutionTitle } from "./SolutionTitle";

export interface Solution {
	id: number;
	title: string;
	type: string;
	category: string;
	cost: string;
	description: string;
	impact: number;
	icon?: string;
	recommended?: boolean;
	comingSoon?: boolean;
	thematic_tags?: string[];
	partners?: string[];
	languages?: number[];
	solution_languages?: Array<{
		language_id: number;
		id: number;
		language?: {
			id: number;
			code: string;
			name: string;
			name_en: string;
		} | null;
		training_dates?: Array<{
			id: number;
			training_date: string;
			contract_detail?: string | null;
		}>;
	}>;
}

interface SolutionTableProps {
	solutions: Solution[];
	planIds: number[];
	onAdd: (solution: Solution) => void;
	highlightId?: number | null;
	translations?: Record<string, string>;
}

type SortKey = "title" | "type" | "cost";
type SortDir = "asc" | "desc";

const PAID_BUYERS_FUNDED = "Paid (Buyers-Funded)";

const COST_RANK: Record<string, number> = {
	Free: 0,
	"Paid Training": 1,
	Subscription: 2,
	Paid: 3,
	"Paid (Service)": 4,
	Service: 4,
	Investment: 5,
	[PAID_BUYERS_FUNDED]: 0,
};

const getCostLabel = (
	t: (key: string) => string,
	cost?: string | null,
): string => {
	if (!cost) return "";
	if (cost.startsWith("Free")) return t("cascadeMarketplace.shared.cost.free");
	if (cost.startsWith("Paid Training"))
		return t("cascadeMarketplace.shared.cost.training");
	if (cost.includes("Service"))
		return t("cascadeMarketplace.shared.cost.service");
	if (cost.startsWith("Investment"))
		return t("cascadeMarketplace.shared.cost.investment");
	if (cost === "Subscription")
		return t("cascadeMarketplace.shared.cost.subscription");
	if (cost === "Paid") return t("cascadeMarketplace.shared.cost.paid");
	return cost;
};

const costBadgeColor = (cost?: string | null): any => {
	if (!cost) return "gray";
	if (cost.startsWith("Free")) return "green";
	if (cost.startsWith("Paid Training")) return "orange";
	if (cost.includes("Service")) return "violet";
	if (cost.startsWith("Investment")) return "crimson";
	if (cost === "Subscription") return "blue";
	if (cost === PAID_BUYERS_FUNDED) return "tomato";
	if (cost === "Paid") return "gray";
	return "gray";
};

const costSortValue = (cost?: string | null): number => {
	if (!cost) return 99;
	if (cost in COST_RANK) return COST_RANK[cost];
	if (cost.startsWith("Free")) return 0;
	if (cost.startsWith("Paid Training")) return 1;
	if (cost.includes("Service")) return 4;
	if (cost.startsWith("Investment")) return 5;
	return 99;
};

interface SortHeaderProps {
	label: string;
	sortKey: SortKey;
	activeKey: SortKey;
	activeDir: SortDir;
	onClick: (key: SortKey) => void;
	className?: string;
}

const SortHeader = ({
	label,
	sortKey,
	activeKey,
	activeDir,
	onClick,
	className,
}: SortHeaderProps) => {
	const isActive = activeKey === sortKey;
	return (
		<th
			aria-sort={
				isActive ? (activeDir === "asc" ? "ascending" : "descending") : "none"
			}
			className={`px-3 py-3 cursor-pointer select-none hover:text-[#148696] ${className ?? ""}`}
			onClick={() => onClick(sortKey)}
			scope="col"
		>
			<span className="inline-flex items-center gap-1">
				{label}
				{isActive ? (
					activeDir === "asc" ? (
						<Icons.ArrowUpward fontSize="inherit" />
					) : (
						<Icons.ArrowDownward fontSize="inherit" />
					)
				) : (
					<Icons.UnfoldMore className="opacity-30" fontSize="inherit" />
				)}
			</span>
		</th>
	);
};

export const SolutionTable = ({
	solutions,
	planIds,
	onAdd,
	highlightId,
	translations = {},
}: SolutionTableProps) => {
	const { i18n, t } = useTranslation();
	const { data: languages = [] } = useLanguages();
	const translateValue = (text?: string | null) =>
		text ? (translations[text] ?? text) : "";

	const [expanded, setExpanded] = useState<Set<number>>(new Set());
	const [sortKey, setSortKey] = useState<SortKey>("title");
	const [sortDir, setSortDir] = useState<SortDir>("asc");

	const today = new Date().toISOString().split("T")[0];

	const sorted = useMemo(() => {
		const dir = sortDir === "asc" ? 1 : -1;
		const list = [...solutions];
		list.sort((a, b) => {
			const aRec = a.recommended === true;
			const bRec = b.recommended === true;
			if (aRec && !bRec) return -1;
			if (!aRec && bRec) return 1;

			const aComing = a.comingSoon === true;
			const bComing = b.comingSoon === true;
			if (aComing && !bComing) return 1;
			if (!aComing && bComing) return -1;

			let av: string | number;
			let bv: string | number;
			if (sortKey === "title") {
				av = (a.title ?? "").toLowerCase();
				bv = (b.title ?? "").toLowerCase();
			} else if (sortKey === "type") {
				av = (a.type ?? "").toLowerCase();
				bv = (b.type ?? "").toLowerCase();
			} else {
				av = costSortValue(a.cost);
				bv = costSortValue(b.cost);
			}
			if (av < bv) return -1 * dir;
			if (av > bv) return 1 * dir;
			return (a.title ?? "").localeCompare(b.title ?? "");
		});
		return list;
	}, [solutions, sortKey, sortDir]);

	const cycleSort = (key: SortKey) => {
		if (sortKey !== key) {
			setSortKey(key);
			setSortDir("asc");
		} else {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		}
	};

	const toggle = (id: number) =>
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	return (
		<RadixTooltip.Provider delayDuration={250}>
			<div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-gray-50 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
							<th className="w-10 px-3 py-3" scope="col" />
							<SortHeader
								activeDir={sortDir}
								activeKey={sortKey}
								label={t("cascadeMarketplace.catalog.card.solutionColumn")}
								onClick={cycleSort}
								sortKey="title"
							/>
							<SortHeader
								activeDir={sortDir}
								activeKey={sortKey}
								className="w-44 hidden md:table-cell"
								label={t("cascadeMarketplace.catalog.card.typeColumn")}
								onClick={cycleSort}
								sortKey="type"
							/>
							<SortHeader
								activeDir={sortDir}
								activeKey={sortKey}
								className="w-52 text-left"
								label={t("cascadeMarketplace.catalog.card.costColumn")}
								onClick={cycleSort}
								sortKey="cost"
							/>
							<th className="w-16 px-3 py-3" scope="col">
								<span className="sr-only">
									{t("cascadeMarketplace.catalog.card.addToPlan")}
								</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{sorted.map((solution) => {
							const isOpen = expanded.has(solution.id);
							const isInPlan = planIds.includes(solution.id);
							const isComingSoon = solution.comingSoon === true;
							const IconComponent = solution.icon
								? (Icons as any)[solution.icon] || Icons.Help
								: Icons.Help;
							const hasTraining =
								solution.solution_languages &&
								solution.solution_languages.length > 0;
							const disabled = isComingSoon || isInPlan;
							const isHighlighted = highlightId === solution.id;

							return (
								<Fragment key={solution.id}>
									<tr
										className={`border-t border-gray-100 transition-colors cursor-pointer ${
											isOpen ? "bg-[#f5fafb]" : "hover:bg-gray-50"
										} ${isComingSoon ? "bg-gray-50/60" : ""} ${isHighlighted ? "ring-2 ring-inset ring-[#148696]" : ""}`}
										id={`solution-card-${solution.id}`}
										onClick={() => toggle(solution.id)}
									>
										<td className="w-10 px-3 py-3 text-gray-400 align-middle">
											<motion.span
												animate={{ rotate: isOpen ? 90 : 0 }}
												className="inline-flex"
												transition={{ duration: 0.15 }}
											>
												<Icons.ChevronRight fontSize="small" />
											</motion.span>
										</td>
										<td className="px-3 py-3 align-middle max-w-0">
											<div
												className={`flex items-center gap-3 min-w-0 ${isComingSoon ? "opacity-60" : ""}`}
											>
												<div
													className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
														isComingSoon
															? "bg-gray-100 text-gray-400"
															: "bg-blue-50 text-[#148696]"
													}`}
												>
													<IconComponent fontSize="small" />
												</div>
												<div
													className={`min-w-0 flex flex-1 items-center gap-2 flex-wrap ${isComingSoon ? "text-gray-500" : "text-[#004A60]"}`}
												>
													<SolutionTitle title={solution.title} />
													{solution.recommended && (
														<RadixTooltip.Root>
															<RadixTooltip.Trigger asChild>
																<Icons.Star
																	className="text-[#148696] shrink-0"
																	fontSize="small"
																/>
															</RadixTooltip.Trigger>
															<RadixTooltip.Portal>
																<RadixTooltip.Content
																	className="bg-[#148696] text-white text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-lg z-50"
																	sideOffset={4}
																>
																	{t(
																		"cascadeMarketplace.catalog.card.mostRecommended",
																	)}
																	<RadixTooltip.Arrow className="fill-[#148696]" />
																</RadixTooltip.Content>
															</RadixTooltip.Portal>
														</RadixTooltip.Root>
													)}
													{isComingSoon && (
														<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wide shrink-0">
															<Icons.HourglassTop fontSize="inherit" />
															{t(
																"cascadeMarketplace.dashboard.actions.comingSoon",
															)}
														</span>
													)}
													{isInPlan && (
														<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wide shrink-0">
															<Icons.Check fontSize="inherit" />
															{t("cascadeMarketplace.catalog.card.inPlan")}
														</span>
													)}
												</div>
											</div>
										</td>
										<td
											className={`w-44 px-3 py-3 align-middle hidden md:table-cell ${isComingSoon ? "opacity-60" : ""}`}
										>
											<Badge
												className="text-[10px] uppercase"
												color="blue"
												variant="soft"
											>
												{translateValue(solution.type)}
											</Badge>
										</td>
										<td
											className={`w-52 px-3 py-3 align-middle text-left ${isComingSoon ? "opacity-60" : ""}`}
										>
											<Badge
												className="whitespace-nowrap"
												color={costBadgeColor(solution.cost)}
												variant="surface"
											>
												{solution.cost === PAID_BUYERS_FUNDED ? (
													<>
														<span style={{ textDecoration: "line-through" }}>
															{t(
																"cascadeMarketplace.shared.cost.paidWithStruck",
															)}
														</span>
														<span>
															{" "}
															{t("cascadeMarketplace.shared.cost.free")}
															{" ("}
															{t(
																"cascadeMarketplace.shared.cost.paidWithSuffix",
															)}
															{")"}
														</span>
													</>
												) : (
													getCostLabel(t, solution.cost)
												)}
											</Badge>
										</td>
										<td className="w-16 px-3 py-3 align-middle text-right">
											<button
												aria-label={
													disabled
														? t("cascadeMarketplace.catalog.card.inPlan")
														: t("cascadeMarketplace.catalog.card.addToPlan")
												}
												className={`w-8 h-8 rounded-full inline-flex items-center justify-center transition-all ${
													disabled
														? "bg-gray-100 text-gray-300 cursor-not-allowed"
														: "bg-[#004A60] hover:bg-[#148696] text-white shadow-sm"
												}`}
												disabled={disabled}
												onClick={(e) => {
													e.stopPropagation();
													if (!disabled) onAdd(solution);
												}}
												type="button"
											>
												{isInPlan ? (
													<Icons.Check fontSize="small" />
												) : (
													<Icons.Add fontSize="small" />
												)}
											</button>
										</td>
									</tr>
									<AnimatePresence initial={false}>
										{isOpen && (
											<tr>
												<td className="p-0" colSpan={5}>
													<motion.div
														animate={{ height: "auto", opacity: 1 }}
														className="overflow-hidden"
														exit={{ height: 0, opacity: 0 }}
														initial={{ height: 0, opacity: 0 }}
														transition={{ duration: 0.2 }}
													>
														<div className="px-6 py-6 bg-[#fbfcfd] border-t border-gray-100 space-y-5">
															{/* Tags + partners + (mobile) type */}
															<div className="flex flex-wrap gap-2 items-center md:hidden">
																<Badge
																	className="text-[10px] uppercase"
																	color="blue"
																	variant="soft"
																>
																	{translateValue(solution.type)}
																</Badge>
															</div>
															{(() => {
																const tags = ensureArray(
																	solution.thematic_tags,
																);
																const partners = ensureArray(solution.partners);
																if (
																	tags.length === 0 &&
																	partners.length === 0
																) {
																	return null;
																}
																return (
																	<div className="flex flex-wrap gap-2 items-center">
																		{tags.map((tag) => (
																			<Badge
																				className="text-[10px] uppercase"
																				color="purple"
																				key={tag}
																				variant="soft"
																			>
																				{translateValue(tag)}
																			</Badge>
																		))}
																		{partners.map((p) => {
																			const label =
																				typeof p === "string"
																					? p
																					: (p as any)?.name || String(p);
																			return (
																				<div
																					className="px-2 py-1 rounded-md bg-yellow-100 text-yellow-800 text-[10px] font-bold border border-yellow-300"
																					key={label}
																				>
																					{translateValue(label)}
																				</div>
																			);
																		})}
																	</div>
																);
															})()}

															{/* Description */}
															{solution.description?.trim() ? (
																<p
																	className="text-gray-600 text-sm leading-relaxed"
																	dangerouslySetInnerHTML={{
																		__html: solution.description,
																	}}
																/>
															) : null}

															{/* Training availability */}
															{hasTraining && (
																<div className="border border-[#d4eff3] rounded-xl bg-[#f7fbff] px-4 py-3 space-y-2.5">
																	<div className="flex items-center gap-2 text-[11px] font-bold text-[#148696] uppercase tracking-wide">
																		<Icons.School fontSize="inherit" />
																		<span className="text-[#148696]">
																			{t(
																				"cascadeMarketplace.catalog.card.trainingAvailableIn",
																			)}
																		</span>
																	</div>
																	<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 border-t border-[#d4eff3] pt-2">
																		{(solution.solution_languages ?? []).map(
																			(solutionLang) => {
																				const lang =
																					solutionLang.language ||
																					languages.find(
																						(l) =>
																							l.id ===
																							Number(solutionLang.language_id),
																					);
																				const langUpcoming = (
																					solutionLang.training_dates || []
																				)
																					.map((d) => d.training_date)
																					.filter(
																						(dateStr): dateStr is string =>
																							!!dateStr && dateStr >= today,
																					)
																					.sort()
																					.slice(0, 5);
																				return (
																					<div
																						className="flex items-start gap-2"
																						key={solutionLang.language_id}
																					>
																						<div
																							className="w-6 h-6 rounded-full overflow-hidden border border-[#858585] shrink-0 mt-0.5"
																							title={lang?.name}
																						>
																							<WorldFlag
																								alt={
																									lang?.name ??
																									String(
																										solutionLang.language_id,
																									)
																								}
																								className="w-full h-full object-cover"
																								code={
																									lang?.code === "en"
																										? "gb"
																										: lang?.code || "xx"
																								}
																							/>
																						</div>
																						<div className="flex flex-col gap-1">
																							<span className="text-[11px] font-semibold text-[#148696]">
																								{lang?.name ??
																									`Language ${solutionLang.language_id}`}
																							</span>
																							{langUpcoming.length > 0 ? (
																								<div className="flex flex-wrap gap-1">
																									{langUpcoming.map((date) => (
																										<span
																											className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#e8f7f9] text-[#148696] border border-[#b8e8ef]"
																											key={date}
																										>
																											<Icons.CalendarToday fontSize="inherit" />
																											{new Date(
																												date,
																											).toLocaleDateString(
																												i18n.language,
																												{
																													month: "short",
																													day: "numeric",
																													year: "numeric",
																												},
																											)}
																										</span>
																									))}
																								</div>
																							) : (
																								<p className="text-[10px] text-gray-400">
																									{t(
																										"cascadeMarketplace.catalog.card.datesToBeConfirmed",
																									)}
																								</p>
																							)}
																						</div>
																					</div>
																				);
																			},
																		)}
																	</div>
																</div>
															)}

															{/* CI Impact + Add to Plan */}
															<div className="flex justify-between items-center pt-2 border-t border-gray-100">
																<div className="flex flex-col gap-1">
																	<span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">
																		{t(
																			"cascadeMarketplace.catalog.card.ciScoreImpact",
																		)}
																	</span>
																	<Badge
																		className="w-fit"
																		color="green"
																		variant="soft"
																	>
																		{t("cascadeMarketplace.plan.item.points", {
																			count: solution.impact,
																		})}
																	</Badge>
																</div>
																<CascadeButton
																	buttonText={
																		isComingSoon
																			? t(
																					"cascadeMarketplace.dashboard.actions.comingSoon",
																				)
																			: isInPlan
																				? t(
																						"cascadeMarketplace.catalog.card.inPlan",
																					)
																				: t(
																						"cascadeMarketplace.catalog.card.addToPlan",
																					)
																	}
																	className={`rounded-lg font-bold transition-all ${
																		disabled
																			? "bg-gray-100 text-gray-400 cursor-not-allowed"
																			: "bg-[#6F2E97] hover:bg-[#5A2479] text-white shadow-sm hover:shadow-md"
																	}`}
																	disabled={disabled}
																	handleOnClick={() => {
																		if (!disabled) onAdd(solution);
																	}}
																	size="2"
																/>
															</div>
														</div>
													</motion.div>
												</td>
											</tr>
										)}
									</AnimatePresence>
								</Fragment>
							);
						})}
					</tbody>
				</table>
			</div>
		</RadixTooltip.Provider>
	);
};
