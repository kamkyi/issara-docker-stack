import { useQueryClient } from "@tanstack/react-query";
import flagsmith from "flagsmith";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "$src/i18n/config";
import {
	type LocaleMetadataMap,
	loadLocales,
	saveLocale,
} from "$src/services/i18nLocalesService";
import { translateText } from "$src/services/translationService";

const CAN_MANAGE_KEYS_FLAG = "i18n_editor_manage_keys";
const REFERENCE_LANGUAGE: SupportedLanguage = "en";
const PATH_SEP = "\u001F";

type LocaleTree = Record<string, unknown>;
type LocaleData = Record<SupportedLanguage, LocaleTree>;

const formatKey = (key: string) => key.split(PATH_SEP).join(".");

const flatten = (obj: LocaleTree, prefix = ""): Record<string, string> => {
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(obj)) {
		const path = prefix ? `${prefix}${PATH_SEP}${key}` : key;
		if (Array.isArray(value)) {
			value.forEach((item, index) => {
				const itemPath = `${path}${PATH_SEP}${index}`;
				if (item && typeof item === "object") {
					Object.assign(out, flatten(item as LocaleTree, itemPath));
				} else {
					out[itemPath] = String(item ?? "");
				}
			});
		} else if (value && typeof value === "object") {
			Object.assign(out, flatten(value as LocaleTree, path));
		} else {
			out[path] = String(value ?? "");
		}
	}
	return out;
};

const setDeep = (obj: LocaleTree, path: string, value: string) => {
	const parts = path.split(PATH_SEP);
	let cursor = obj;
	for (let i = 0; i < parts.length - 1; i++) {
		const part = parts[i];
		if (typeof cursor[part] !== "object" || cursor[part] === null) {
			cursor[part] = {};
		}
		cursor = cursor[part] as LocaleTree;
	}
	cursor[parts[parts.length - 1]] = value;
};

export const DynamicTranslationsEditor = () => {
	const { i18n } = useTranslation();
	const queryClient = useQueryClient();
	const [data, setData] = useState<LocaleData | null>(null);
	const [metadata, setMetadata] = useState<LocaleMetadataMap | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [selectedLanguage, setSelectedLanguage] = useState<
		SupportedLanguage | "all"
	>("all");
	const [edits, setEdits] = useState<
		Record<SupportedLanguage, Record<string, string>>
	>(
		() =>
			Object.fromEntries(
				SUPPORTED_LANGUAGES.map((lang) => [lang, {}]),
			) as Record<SupportedLanguage, Record<string, string>>,
	);
	const [saveState, setSaveState] = useState<
		Record<string, "saving" | "saved" | "error">
	>({});

	// Form state for adding new dynamic terms (e.g. new demographics or feedback terms)
	const [newTerm, setNewTerm] = useState("");
	const [newTermTranslation, setNewTermTranslation] = useState("");
	const [newTermLang, setNewTermLang] = useState<SupportedLanguage>("th");
	const [isAdding, setIsAdding] = useState(false);

	const refreshData = () => {
		loadLocales()
			.then((res) => {
				setData(res.locales);
				setMetadata(res.metadata);
			})
			.catch((err) => setLoadError(String(err)));
	};

	useEffect(() => {
		refreshData();
	}, []);

	// Flatten all languages into key -> string maps
	const flatLocales = useMemo(() => {
		if (!data) return null;
		return Object.fromEntries(
			SUPPORTED_LANGUAGES.map((lang) => [lang, flatten(data[lang] ?? {})]),
		) as Record<SupportedLanguage, Record<string, string>>;
	}, [data]);

	// Filter keys that represent dynamic content (or keys auto-translated by backend)
	const dynamicKeys = useMemo(() => {
		if (!flatLocales) return [];
		const allKeys = new Set<string>([
			"Female",
			"Male",
			"Non-binary",
			"PreferNotToSay",
			"Burmese",
			"Cambodian",
			"Lao",
			"Thai",
			"Other",
			"Myanmar",
			"Cambodia",
			"Thailand",
			"Vietnam",
			"Nepal",
			"Japan",
			"Workers by Nationality",
			"Demographics",
			"By Nationality",
		]);

		// Collect keys that have 'auto-translate' metadata OR non-nested top-level terms (e.g. Demographics, Gender, Countries)
		for (const lang of SUPPORTED_LANGUAGES) {
			const langMeta = metadata?.[lang] ?? {};
			const langFlat = flatLocales[lang] ?? {};
			for (const [key, value] of Object.entries(langFlat)) {
				const lowerKey = key.toLowerCase();
				const isAutoTranslated = langMeta[key]?.updated_by === "auto-translate";
				const isDemographicsKey =
					lowerKey.includes("gender") ||
					lowerKey.includes("demographic") ||
					lowerKey.includes("nationality") ||
					lowerKey.includes("country");
				const isDynamicTerm =
					!key.includes(PATH_SEP) || isAutoTranslated || isDemographicsKey;
				if (isDynamicTerm && value) {
					allKeys.add(key);
				}
			}
		}

		let list = Array.from(allKeys);
		if (search.trim()) {
			const term = search.toLowerCase();
			list = list.filter((k) => {
				if (k.toLowerCase().includes(term)) return true;
				return SUPPORTED_LANGUAGES.some((lang) =>
					flatLocales[lang]?.[k]?.toLowerCase().includes(term),
				);
			});
		}

		return list.sort();
	}, [flatLocales, metadata, search]);

	const handleFieldChange = (
		lang: SupportedLanguage,
		key: string,
		val: string,
	) => {
		setEdits((prev) => ({
			...prev,
			[lang]: {
				...prev[lang],
				[key]: val,
			},
		}));
	};

	const handleSave = async (lang: SupportedLanguage) => {
		if (!data) return;
		setSaveState((prev) => ({ ...prev, [lang]: "saving" }));

		try {
			const treeCopy: LocaleTree = JSON.parse(JSON.stringify(data[lang] ?? {}));
			const langEdits = edits[lang] ?? {};
			for (const [key, val] of Object.entries(langEdits)) {
				setDeep(treeCopy, key, val);
			}

			await saveLocale(lang, treeCopy);

			try {
				i18n.reloadResources(lang);
				await queryClient.invalidateQueries({ queryKey: ["translate-batch"] });
			} catch (e) {
				console.warn("Failed to reload frontend cache", e);
			}

			setSaveState((prev) => ({ ...prev, [lang]: "saved" }));
			setEdits((prev) => ({ ...prev, [lang]: {} }));
			refreshData();
		} catch (err) {
			console.error(err);
			setSaveState((prev) => ({ ...prev, [lang]: "error" }));
		}
	};

	const [autoTranslateState, setAutoTranslateState] = useState<
		"idle" | "running" | "done" | "error"
	>("idle");

	const handleAutoTranslateAllMissing = async () => {
		if (!data || !flatLocales) return;
		setAutoTranslateState("running");
		try {
			const targetLangs = SUPPORTED_LANGUAGES.filter(
				(l) => l !== REFERENCE_LANGUAGE,
			);

			for (const lang of targetLangs) {
				const treeCopy: LocaleTree = JSON.parse(
					JSON.stringify(data[lang] ?? {}),
				);
				const langFlat = flatLocales[lang] ?? {};
				let updated = false;

				for (const key of dynamicKeys) {
					const existing = langFlat[key];
					if (!existing || existing === key) {
						try {
							const translation = await translateText(key, lang);
							if (translation && translation !== key) {
								setDeep(treeCopy, key, translation);
								updated = true;
							}
						} catch (err) {
							console.warn(
								`Failed auto-translate for key "${key}" (${lang})`,
								err,
							);
						}
					}
				}

				if (updated) {
					await saveLocale(lang, treeCopy);
				}
			}

			setAutoTranslateState("done");
			refreshData();
		} catch (err) {
			console.error("Auto-translate error", err);
			setAutoTranslateState("error");
		}
	};

	const handleAddTerm = async () => {
		if (!newTerm.trim() || !data) return;
		setIsAdding(true);
		try {
			const term = newTerm.trim();
			let translation = newTermTranslation.trim();

			if (!translation) {
				translation = await translateText(term, newTermLang);
			}

			const treeCopy: LocaleTree = JSON.parse(
				JSON.stringify(data[newTermLang] ?? {}),
			);
			setDeep(treeCopy, term, translation);
			await saveLocale(newTermLang, treeCopy);

			setNewTerm("");
			setNewTermTranslation("");
			refreshData();
		} catch (err) {
			console.error("Failed to add dynamic term", err);
		} finally {
			setIsAdding(false);
		}
	};

	const canManageKeys = flagsmith.hasFeature(CAN_MANAGE_KEYS_FLAG);

	return (
		<div>
			<div className="flex justify-between items-start mb-4 gap-4">
				<div>
					<h3 className="text-base font-semibold text-[#004A60]">
						Dynamic Content & Demographics Translations
					</h3>
					<p className="text-xs text-gray-500 max-w-[800px] mt-1">
						These translations back dynamic API data such as gender names
						("Female", "Male"), nationality labels ("Myanmar", "Thailand"), and
						worker feedback text. Values are stored in MySQL and auto-populated
						via Google Translate API. Editing any term below saves a manual
						override that will be preserved permanently.
					</p>
				</div>
				<div className="flex items-center gap-2 flex-shrink-0">
					<button
						className="px-3 py-1.5 bg-[#148696] text-white rounded text-xs font-medium hover:bg-[#00516a] transition-colors disabled:opacity-50"
						disabled={autoTranslateState === "running" || !data}
						onClick={handleAutoTranslateAllMissing}
						type="button"
					>
						{autoTranslateState === "running"
							? "Translating Missing Terms..."
							: "Auto-Translate Missing Terms"}
					</button>
					{autoTranslateState === "done" && (
						<span className="text-xs text-green-600 font-medium">Done ✓</span>
					)}
					{autoTranslateState === "error" && (
						<span className="text-xs text-red-600 font-medium">Failed</span>
					)}
				</div>
			</div>

			{loadError && (
				<div className="text-red-600 text-sm mb-3">
					Failed to load dynamic translations: {loadError}
				</div>
			)}

			{/* Add New Term Form */}
			{canManageKeys && (
				<div className="mb-4 rounded border border-gray-200 bg-gray-50 p-3">
					<div className="mb-2 text-sm font-medium text-[#004A60]">
						Add / Override Dynamic Term
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<input
							className="border rounded px-2.5 py-1.5 text-sm min-w-[200px] flex-1 max-w-[300px]"
							onChange={(e) => setNewTerm(e.target.value)}
							placeholder="English string, e.g. Female or Myanmar"
							value={newTerm}
						/>
						<select
							className="border rounded px-2 py-1.5 text-sm bg-white"
							onChange={(e) =>
								setNewTermLang(e.target.value as SupportedLanguage)
							}
							value={newTermLang}
						>
							{SUPPORTED_LANGUAGES.filter((l) => l !== REFERENCE_LANGUAGE).map(
								(lang) => (
									<option key={lang} value={lang}>
										{lang}
									</option>
								),
							)}
						</select>
						<input
							className="border rounded px-2.5 py-1.5 text-sm min-w-[200px] flex-1 max-w-[350px]"
							onChange={(e) => setNewTermTranslation(e.target.value)}
							placeholder="Translation (leave blank to auto-translate)"
							value={newTermTranslation}
						/>
						<button
							className="px-3 py-1.5 bg-[#148696] text-white rounded text-xs font-medium hover:bg-[#00516a] transition-colors disabled:opacity-50"
							disabled={!newTerm.trim() || isAdding}
							onClick={handleAddTerm}
							type="button"
						>
							{isAdding ? "Saving..." : "Add Term"}
						</button>
					</div>
				</div>
			)}

			{/* Filter bar */}
			<div className="flex gap-3 mb-4 flex-wrap items-center">
				<input
					className="border rounded px-2 py-1.5 text-sm min-w-[240px] flex-1 max-w-[400px]"
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search dynamic terms (e.g. Female, Male, Myanmar)..."
					type="text"
					value={search}
				/>
				<select
					className="border rounded px-2 py-1.5 min-w-[180px] text-sm bg-white"
					onChange={(e) =>
						setSelectedLanguage(e.target.value as SupportedLanguage | "all")
					}
					value={selectedLanguage}
				>
					<option value="all">All target languages</option>
					{SUPPORTED_LANGUAGES.filter((l) => l !== REFERENCE_LANGUAGE).map(
						(lang) => (
							<option key={lang} value={lang}>
								{lang}
							</option>
						),
					)}
				</select>
			</div>

			{/* Table of Dynamic Strings */}
			{!data && !loadError && (
				<div className="text-xs text-gray-400 p-4">
					Loading dynamic database translations...
				</div>
			)}

			{data && (
				<div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
					<table className="text-sm border-collapse w-full table-fixed">
						<thead className="bg-gray-50 border-b">
							<tr>
								<th
									className={`text-left p-3 font-semibold text-xs text-gray-700 ${
										selectedLanguage !== "all" ? "w-1/2" : "w-1/4 min-w-[240px]"
									}`}
								>
									English Source String (Key)
								</th>
								{(selectedLanguage === "all"
									? SUPPORTED_LANGUAGES.filter((l) => l !== REFERENCE_LANGUAGE)
									: [selectedLanguage]
								).map((lang) => (
									<th
										className={`text-left p-3 font-semibold text-xs text-gray-700 ${
											selectedLanguage !== "all" ? "w-1/2" : "min-w-[220px]"
										}`}
										key={lang}
									>
										<div className="flex items-center justify-between">
											<span>{lang.toUpperCase()}</span>
											<button
												className="px-2 py-0.5 border rounded text-[11px] font-normal text-[#148696] border-[#148696] hover:bg-[#148696]/10 disabled:opacity-30"
												disabled={
													!Object.keys(edits[lang] ?? {}).length ||
													saveState[lang] === "saving"
												}
												onClick={() => handleSave(lang)}
												type="button"
											>
												{saveState[lang] === "saving" ? "Saving..." : "Save"}
											</button>
										</div>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{dynamicKeys.length === 0 ? (
								<tr>
									<td
										className="p-4 text-xs text-gray-400 text-center"
										colSpan={8}
									>
										No matching dynamic terms found in database.
									</td>
								</tr>
							) : (
								dynamicKeys.map((key) => {
									const englishVal = flatLocales?.en?.[key] ?? key;
									return (
										<tr
											className="border-b last:border-b-0 hover:bg-gray-50/60 transition-colors"
											key={key}
										>
											<td className="p-3 align-top text-xs font-medium text-[#004A60] break-words">
												<div>{formatKey(key)}</div>
												{englishVal !== key && (
													<div className="text-[11px] text-gray-500 font-normal mt-0.5">
														{englishVal}
													</div>
												)}
											</td>
											{(selectedLanguage === "all"
												? SUPPORTED_LANGUAGES.filter(
														(l) => l !== REFERENCE_LANGUAGE,
													)
												: [selectedLanguage]
											).map((lang) => {
												const originalVal = flatLocales?.[lang]?.[key] ?? "";
												const currentEdit = edits[lang]?.[key];
												const val = currentEdit ?? originalVal;
												const isDirty = currentEdit !== undefined;
												const meta = metadata?.[lang]?.[key];

												return (
													<td className="p-2.5 align-top" key={lang}>
														<textarea
															className={`w-full text-xs border rounded px-2.5 py-2 min-h-[50px] focus:outline-none focus:ring-1 focus:ring-[#148696] ${
																isDirty
																	? "border-amber-400 bg-amber-50"
																	: "border-gray-200"
															}`}
															onChange={(e) =>
																handleFieldChange(lang, key, e.target.value)
															}
															rows={2}
															value={val}
														/>
														{meta && (
															<div className="text-[10px] text-gray-400 mt-1 flex justify-between">
																<span>
																	{meta.updated_by === "auto-translate"
																		? "auto-translated"
																		: (meta.updated_by ?? "manual")}
																</span>
															</div>
														)}
													</td>
												);
											})}
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};
