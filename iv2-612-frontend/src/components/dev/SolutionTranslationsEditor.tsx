import { useEffect, useMemo, useState } from "react";
import "$src/styles/message-board.css";
import { api } from "$src/api/axios";
import { RichTextEditor } from "$src/components/messageBoard/RichTextEditor";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "$src/i18n/config";
import {
	backfillAllSolutionTranslations,
	listSolutionTranslations,
	retranslateSolution,
	type SolutionTranslationRow,
	setSolutionTranslation,
	type TranslatableSolutionField,
} from "$src/services/solutionTranslationService";

const REFERENCE_LANGUAGE: SupportedLanguage = "en";

interface SolutionSummary {
	id: number;
	title: string;
	description: string | null;
}

const CASCADE_SOLUTIONS_URL = `${(
	import.meta.env.VITE_APP_CASCADE_API_URL as string
)?.replace(/\/+$/, "")}/solutions`;

// Solutions have no admin CRUD screen in this app, so this tab needs its own
// lightweight search-and-pick UI rather than linking off an existing list page.
export const SolutionTranslationsEditor = () => {
	const [solutions, setSolutions] = useState<SolutionSummary[] | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [selectedLanguage, setSelectedLanguage] = useState<
		SupportedLanguage | "all"
	>("all");
	const [selectedId, setSelectedId] = useState<number | null>(null);

	const [rows, setRows] = useState<SolutionTranslationRow[] | null>(null);
	const [rowsError, setRowsError] = useState<string | null>(null);
	const [edits, setEdits] = useState<Record<string, string>>({});
	const [saveState, setSaveState] = useState<
		Record<string, "saving" | "saved" | "error">
	>({});
	const [retranslateState, setRetranslateState] = useState<
		"idle" | "running" | "done" | "error"
	>("idle");
	const [backfillState, setBackfillState] = useState<
		"idle" | "running" | "done" | "error"
	>("idle");

	useEffect(() => {
		api
			.get<{ data: SolutionSummary[] } | SolutionSummary[]>(
				CASCADE_SOLUTIONS_URL,
			)
			.then(({ data }) => {
				const list = Array.isArray(data) ? data : data.data;
				setSolutions(list);
			})
			.catch((err) => setLoadError(String(err)));
	}, []);

	const filteredSolutions = useMemo(() => {
		if (!solutions) return [];
		const term = search.trim().toLowerCase();
		if (!term) return solutions;
		return solutions.filter(
			(s) =>
				s.title?.toLowerCase().includes(term) || String(s.id).includes(term),
		);
	}, [solutions, search]);

	const selectedSolution = useMemo(
		() => solutions?.find((s) => s.id === selectedId) ?? null,
		[solutions, selectedId],
	);

	const reloadRows = (solutionId: number) => {
		setRows(null);
		setRowsError(null);
		setEdits({});
		setSaveState({});
		listSolutionTranslations(solutionId)
			.then(setRows)
			.catch((err) => setRowsError(String(err)));
	};

	useEffect(() => {
		if (selectedId != null) reloadRows(selectedId);
	}, [selectedId]);

	const rowsByLangField = useMemo(() => {
		const map = new Map<string, SolutionTranslationRow>();
		for (const row of rows ?? []) {
			map.set(`${row.lang}:${row.field}`, row);
		}
		return map;
	}, [rows]);

	const handleChange = (
		lang: SupportedLanguage,
		field: TranslatableSolutionField,
		value: string,
	) => {
		setEdits((prev) => ({ ...prev, [`${lang}:${field}`]: value }));
	};

	const handleSave = async (
		lang: Exclude<SupportedLanguage, "en">,
		field: TranslatableSolutionField,
	) => {
		if (!selectedId) return;
		const key = `${lang}:${field}`;
		const value = edits[key];
		if (value === undefined) return;

		setSaveState((prev) => ({ ...prev, [key]: "saving" }));
		try {
			await setSolutionTranslation(selectedId, lang, field, value);
			setSaveState((prev) => ({ ...prev, [key]: "saved" }));
			reloadRows(selectedId);
		} catch (err) {
			console.error(err);
			setSaveState((prev) => ({ ...prev, [key]: "error" }));
		}
	};

	const handleRetranslate = async () => {
		if (!selectedId) return;
		setRetranslateState("running");
		try {
			await retranslateSolution(selectedId);
			reloadRows(selectedId);
			setRetranslateState("done");
		} catch (err) {
			console.error(err);
			setRetranslateState("error");
		}
	};

	const handleBackfillAll = async () => {
		if (
			!confirm(
				"This will trigger a background job to translate all missing solutions. Proceed?",
			)
		)
			return;
		setBackfillState("running");
		try {
			await backfillAllSolutionTranslations();
			setBackfillState("done");
		} catch (err) {
			console.error(err);
			setBackfillState("error");
		}
	};

	return (
		<div>
			<div className="flex justify-between items-start mb-3 gap-4">
				<p className="text-xs text-gray-500 max-w-[800px]">
					Solution title/description are auto-translated via Google Translate
					whenever a solution is created or edited. Manually editing a field
					below marks it as a permanent override — it will never be overwritten
					by a future auto-translation.
				</p>
				<div className="flex items-center gap-2 flex-shrink-0">
					<button
						className="px-3 py-1.5 bg-[#148696] text-white rounded text-xs font-medium hover:bg-[#00516a] transition-colors disabled:opacity-50"
						disabled={backfillState === "running"}
						onClick={handleBackfillAll}
						type="button"
					>
						{backfillState === "running"
							? "Starting..."
							: "Backfill All Solutions"}
					</button>
					{backfillState === "done" && (
						<span className="text-xs text-green-600">Started ✓</span>
					)}
					{backfillState === "error" && (
						<span className="text-xs text-red-600">Failed</span>
					)}
				</div>
			</div>

			{loadError && (
				<div className="text-red-600 text-sm mb-3">
					Failed to load solutions: {loadError}
				</div>
			)}

			<div className="flex gap-3 mb-4 flex-wrap items-center">
				<input
					className="border rounded px-2 py-1.5 text-sm min-w-[200px] flex-1 max-w-[400px]"
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search solutions by title or id…"
					type="text"
					value={search}
				/>
				<select
					className="border rounded px-2 py-1.5 min-w-[200px] flex-1 max-w-[300px] text-sm bg-white"
					onChange={(e) =>
						setSelectedLanguage(e.target.value as SupportedLanguage | "all")
					}
					value={selectedLanguage}
				>
					<option value="all">All languages</option>
					{SUPPORTED_LANGUAGES.filter(
						(lang) => lang !== REFERENCE_LANGUAGE,
					).map((lang) => (
						<option key={lang} value={lang}>
							{lang}
						</option>
					))}
				</select>
			</div>

			<div className="flex gap-4 items-start flex-wrap">
				<div className="border rounded max-h-[400px] overflow-y-auto w-full max-w-[320px]">
					{!solutions && !loadError && (
						<div className="p-2 text-xs text-gray-400">Loading solutions…</div>
					)}
					{filteredSolutions.map((s) => (
						<button
							className={`block w-full text-left px-2 py-1.5 text-xs border-b last:border-b-0 hover:bg-gray-50 ${
								selectedId === s.id ? "bg-[#148696]/10 font-medium" : ""
							}`}
							key={s.id}
							onClick={() => setSelectedId(s.id)}
							type="button"
						>
							#{s.id} — {s.title}
						</button>
					))}
					{solutions && filteredSolutions.length === 0 && (
						<div className="p-2 text-xs text-gray-400">No matches</div>
					)}
				</div>

				<div className="flex-1 min-w-[320px]">
					{!selectedSolution && (
						<div className="text-sm text-gray-400">
							Select a solution to view/edit its translations.
						</div>
					)}

					{selectedSolution && (
						<div>
							<div className="flex items-center justify-between mb-3 gap-2">
								<h2 className="text-sm font-semibold">
									#{selectedSolution.id} — {selectedSolution.title}
								</h2>
								<button
									className="px-2 py-1 border rounded text-xs disabled:opacity-40 disabled:cursor-not-allowed"
									disabled={retranslateState === "running"}
									onClick={handleRetranslate}
									type="button"
								>
									{retranslateState === "running"
										? "Retranslating…"
										: "Re-run auto-translate"}
								</button>
								{retranslateState === "done" && (
									<span className="text-green-600 text-xs">Done ✓</span>
								)}
								{retranslateState === "error" && (
									<span className="text-red-600 text-xs">Failed</span>
								)}
							</div>

							{rowsError && (
								<div className="text-red-600 text-sm mb-3">
									Failed to load translations: {rowsError}
								</div>
							)}

							{!rows && !rowsError && (
								<div className="text-xs text-gray-400">
									Loading translations…
								</div>
							)}

							{rows && (
								<div className="overflow-x-auto border rounded w-full">
									<table className="text-sm border-collapse w-full">
										<thead className="bg-gray-50">
											<tr>
												<th className="text-left p-2 border-b font-medium w-[60px]">
													Lang
												</th>
												<th className="text-left p-2 border-b font-medium min-w-[200px]">
													Fields (Title & Description)
												</th>
												<th className="text-left p-2 border-b font-medium w-[90px]">
													Source
												</th>
												<th className="text-left p-2 border-b font-medium w-[150px]">
													Updated By
												</th>
												<th className="text-left p-2 border-b font-medium w-[80px]" />
											</tr>
										</thead>
										<tbody>
											{(() => {
												const englishTitle =
													(
														selectedSolution as unknown as Record<
															string,
															string | null
														>
													)["title"] ?? "";
												const englishDesc =
													(
														selectedSolution as unknown as Record<
															string,
															string | null
														>
													)["description"] ?? "";

												return (
													SUPPORTED_LANGUAGES.filter(
														(l) =>
															l !== REFERENCE_LANGUAGE &&
															(selectedLanguage === "all" ||
																l === selectedLanguage),
													) as Exclude<SupportedLanguage, "en">[]
												).map((lang) => {
													const titleKey = `${lang}:title`;
													const descKey = `${lang}:description`;

													const titleRow = rowsByLangField.get(titleKey);
													const descRow = rowsByLangField.get(descKey);

													const originalTitle = titleRow?.value ?? englishTitle;
													const originalDesc = descRow?.value ?? englishDesc;

													const titleValue = edits[titleKey] ?? originalTitle;
													const descValue = edits[descKey] ?? originalDesc;

													const isTitleDirty = titleKey in edits;
													const isDescDirty = descKey in edits;
													const isDirty = isTitleDirty || isDescDirty;

													return (
														<tr
															className="odd:bg-white even:bg-gray-50/50"
															key={lang}
														>
															<td className="p-2 border-b align-top text-xs text-gray-600 font-medium pt-3">
																{lang}
															</td>
															<td className="p-2 border-b align-top text-xs pt-3">
																<div className="mb-4">
																	<div className="flex items-center justify-between mb-1">
																		<label
																			className="block text-[#148696] font-medium"
																			htmlFor={`solution-translation-${lang}-title`}
																		>
																			Title
																		</label>
																		<span className="text-[10px] uppercase font-bold text-gray-400">
																			English Source
																		</span>
																	</div>
																	{englishTitle && (
																		<div
																			className="text-xs p-2 bg-gray-50 text-gray-600 rounded border border-gray-100 mb-2 break-words rich-text"
																			dangerouslySetInnerHTML={{
																				__html: englishTitle,
																			}}
																		/>
																	)}
																	<textarea
																		className={`w-full text-xs border rounded px-1.5 py-1 min-h-[40px] resize focus:outline-none focus:ring-1 focus:ring-[#148696] ${
																			isTitleDirty
																				? "border-amber-400 bg-amber-50"
																				: "border-transparent focus:border-gray-300"
																		}`}
																		id={`solution-translation-${lang}-title`}
																		onChange={(e) =>
																			handleChange(
																				lang,
																				"title",
																				e.target.value,
																			)
																		}
																		rows={2}
																		value={titleValue}
																	/>
																</div>
																<div>
																	<div className="flex items-center justify-between mb-1">
																		<label
																			className="block text-[#148696] font-medium"
																			htmlFor={`solution-translation-${lang}-description`}
																		>
																			Description
																		</label>
																		<span className="text-[10px] uppercase font-bold text-gray-400">
																			English Source
																		</span>
																	</div>
																	{englishDesc && (
																		<div
																			className="text-xs p-2 bg-gray-50 text-gray-600 rounded border border-gray-100 mb-2 break-words rich-text"
																			dangerouslySetInnerHTML={{
																				__html: englishDesc,
																			}}
																		/>
																	)}
																	<div
																		className={`mb-root ${isDescDirty ? "border-amber-400 bg-amber-50 rounded" : ""}`}
																	>
																		<RichTextEditor
																			id={`solution-translation-${lang}-description`}
																			onChange={(value) =>
																				handleChange(lang, "description", value)
																			}
																			value={descValue}
																		/>
																	</div>
																</div>
															</td>
															<td className="p-2 border-b align-top text-[10px] text-gray-500 pt-3">
																<div className="mb-3 h-[40px] flex items-center">
																	{titleRow?.source ?? "none"}
																</div>
																<div className="h-[60px] flex items-center">
																	{descRow?.source ?? "none"}
																</div>
															</td>
															<td className="p-2 border-b align-top text-[10px] text-gray-500 pt-3">
																<div className="mb-3 h-[40px] flex items-center">
																	{titleRow?.updated_by ? (
																		<span>
																			{titleRow.updated_by}
																			<br />
																			{new Date(
																				titleRow.updatedAt,
																			).toLocaleDateString()}
																		</span>
																	) : (
																		"-"
																	)}
																</div>
																<div className="h-[60px] flex items-center">
																	{descRow?.updated_by ? (
																		<span>
																			{descRow.updated_by}
																			<br />
																			{new Date(
																				descRow.updatedAt,
																			).toLocaleDateString()}
																		</span>
																	) : (
																		"-"
																	)}
																</div>
															</td>
															<td className="p-2 border-b align-top pt-3">
																<button
																	className="px-2 py-1 border rounded text-xs disabled:opacity-30 disabled:cursor-not-allowed"
																	disabled={!isDirty}
																	onClick={() => {
																		if (isTitleDirty) handleSave(lang, "title");
																		if (isDescDirty)
																			handleSave(lang, "description");
																	}}
																	type="button"
																>
																	Save {lang}
																</button>
																{(saveState[titleKey] === "saving" ||
																	saveState[descKey] === "saving") && (
																	<div className="text-[10px] text-gray-400 mt-1">
																		saving…
																	</div>
																)}
																{(saveState[titleKey] === "error" ||
																	saveState[descKey] === "error") && (
																	<div className="text-[10px] text-red-600 mt-1">
																		error
																	</div>
																)}
																{!saveState[titleKey]?.includes("saving") &&
																	!saveState[descKey]?.includes("saving") &&
																	(saveState[titleKey] === "saved" ||
																		saveState[descKey] === "saved") && (
																		<div className="text-[10px] text-green-600 mt-1">
																			saved
																		</div>
																	)}
															</td>
														</tr>
													);
												});
											})()}
										</tbody>
									</table>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
