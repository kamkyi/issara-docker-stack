import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import flagsmith from "flagsmith";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DynamicTranslationsEditor } from "$src/components/dev/DynamicTranslationsEditor";
import { SolutionTranslationsEditor } from "$src/components/dev/SolutionTranslationsEditor";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "$src/i18n/config";
import {
	type LocaleMetadataMap,
	loadLocales,
	saveLocale,
} from "$src/services/i18nLocalesService";
import { translateText } from "$src/services/translationService";

// Adding brand-new keys and deleting keys are gated behind a Flagsmith flag so
// they can be enabled per-environment without a redeploy. Editing existing
// values is always available.
const CAN_MANAGE_KEYS_FLAG = "i18n_editor_manage_keys";

type LocaleTree = Record<string, unknown>;
type LocaleData = Record<SupportedLanguage, LocaleTree>;

const REFERENCE_LANGUAGE: SupportedLanguage = "en";
const PAGE_SIZE = 100;

// "." can't join/split path segments: plenty of leaf keys are literal
// English strings that contain periods (e.g. "2. Information Collection"),
// which would otherwise get misread as nesting on the way back apart and
// corrupt the tree on save. U+001F (the ASCII "unit separator") can't appear
// in translation text, so it's used as the real delimiter instead — matches
// cascade-backend's i18nLocalesService.ts, though this copy never leaves the
// browser (the full nested tree is what's sent to/from the backend).
const PATH_SEP = "\u001F";

// Cosmetic only — turns the internal PATH_SEP-joined key back into a
// readable "."-joined label for display.
const formatKey = (key: string) => key.split(PATH_SEP).join(".");

const fixArrays = (node: unknown): unknown => {
	if (!node || typeof node !== "object") return node;
	if (Array.isArray(node)) return node.map(fixArrays);
	const keys = Object.keys(node);
	const isNumericArray =
		keys.length > 0 && keys.every((k, i) => k === String(i));
	if (isNumericArray) {
		return keys.map((k) => fixArrays((node as Record<string, unknown>)[k]));
	}
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(node)) {
		out[k] = fixArrays(v);
	}
	return out;
};

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

// Removes a key and prunes any now-empty parent objects left behind.
const deleteDeep = (obj: LocaleTree, path: string) => {
	const parts = path.split(PATH_SEP);
	const cursors: LocaleTree[] = [obj];
	let cursor = obj;
	for (let i = 0; i < parts.length - 1; i++) {
		const next = cursor[parts[i]];
		if (typeof next !== "object" || next === null) return;
		cursor = next as LocaleTree;
		cursors.push(cursor);
	}
	delete cursor[parts[parts.length - 1]];
	// Walk back up, dropping parents that became empty.
	for (let i = cursors.length - 1; i > 0; i--) {
		if (Object.keys(cursors[i]).length === 0) {
			delete cursors[i - 1][parts[i - 1]];
		} else break;
	}
};

type EditorTab = "ui-strings" | "dynamic-content" | "solutions";
const STORAGE_TAB_KEY = "i18n_editor_tab";

const getInitialTab = (): EditorTab => {
	if (typeof window !== "undefined") {
		const params = new URLSearchParams(window.location.search);
		const urlTab = params.get("tab") as EditorTab;
		if (
			urlTab === "ui-strings" ||
			urlTab === "dynamic-content" ||
			urlTab === "solutions"
		) {
			return urlTab;
		}
		const savedTab = localStorage.getItem(STORAGE_TAB_KEY) as EditorTab;
		if (
			savedTab === "ui-strings" ||
			savedTab === "dynamic-content" ||
			savedTab === "solutions"
		) {
			return savedTab;
		}
	}
	return "ui-strings";
};

export const I18nEditor = () => {
	const { i18n } = useTranslation();
	const queryClient = useQueryClient();
	const [tab, setTabState] = useState<EditorTab>(getInitialTab);

	const handleTabChange = (newTab: EditorTab) => {
		setTabState(newTab);
		if (typeof window !== "undefined") {
			localStorage.setItem(STORAGE_TAB_KEY, newTab);
			const url = new URL(window.location.href);
			url.searchParams.set("tab", newTab);
			window.history.replaceState({}, "", url.toString());
		}
	};
	const [data, setData] = useState<LocaleData | null>(null);
	const [metadata, setMetadata] = useState<LocaleMetadataMap | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [edits, setEdits] = useState<
		Record<SupportedLanguage, Record<string, string>>
	>(
		() =>
			Object.fromEntries(
				SUPPORTED_LANGUAGES.map((lang) => [lang, {}]),
			) as Record<SupportedLanguage, Record<string, string>>,
	);
	const [namespace, setNamespace] = useState<string>("");
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(0);
	const [selectedLanguage, setSelectedLanguage] = useState<
		SupportedLanguage | "all"
	>("all");
	const [saveState, setSaveState] = useState<
		Record<string, "saving" | "saved" | "error">
	>({});

	// ── "Add new key" form state ────────────────────────────────────────────
	const [newKey, setNewKey] = useState("");
	const [newValue, setNewValue] = useState("");
	const [autoTranslate, setAutoTranslate] = useState(true);
	const [addState, setAddState] = useState<
		"idle" | "adding" | "done" | "error"
	>("idle");
	const [addError, setAddError] = useState<string | null>(null);
	const [deletingKey, setDeletingKey] = useState<string | null>(null);

	// Gate add/delete behind a Flagsmith flag. Read once on mount (the SDK is
	// already initialised app-wide); if flags aren't ready yet, this stays false
	// and the panel/buttons simply don't render.
	const canManageKeys = flagsmith.hasFeature(CAN_MANAGE_KEYS_FLAG);

	useEffect(() => {
		loadLocales()
			.then((json) => {
				setData(json.locales);
				setMetadata(json.metadata);
			})
			.catch((err) => setLoadError(String(err)));
	}, []);

	const flatByLang = useMemo(() => {
		if (!data) return null;
		return Object.fromEntries(
			SUPPORTED_LANGUAGES.map((lang) => [lang, flatten(data[lang] ?? {})]),
		) as Record<SupportedLanguage, Record<string, string>>;
	}, [data]);

	const namespaces = useMemo(() => {
		if (!data) return [];
		const enData = (data[REFERENCE_LANGUAGE] as Record<string, unknown>) ?? {};
		return Object.keys(enData)
			.filter(
				(key) =>
					typeof enData[key] === "object" &&
					enData[key] !== null &&
					!Array.isArray(enData[key]),
			)
			.sort();
	}, [data]);

	const visibleLanguages = useMemo(() => {
		if (selectedLanguage === "all") return SUPPORTED_LANGUAGES;
		if (selectedLanguage === REFERENCE_LANGUAGE) return [REFERENCE_LANGUAGE];
		return [REFERENCE_LANGUAGE, selectedLanguage];
	}, [selectedLanguage]);

	const keys = useMemo(() => {
		if (!flatByLang) return [];
		const allKeys = Object.keys(flatByLang[REFERENCE_LANGUAGE]);

		let scoped = allKeys;
		if (namespace === "__root__") {
			scoped = allKeys.filter((k) => !k.includes(PATH_SEP));
		} else if (namespace) {
			scoped = allKeys.filter(
				(k) => k === namespace || k.startsWith(`${namespace}${PATH_SEP}`),
			);
		}

		// Split the query into whitespace-separated terms; a row matches only if
		// EVERY term is found somewhere (dotted key or any language value). This
		// makes searches like "hero title" or "tier factories" work regardless of
		// word order, and pasting a full "companyDashboard.hero.title" still works.
		const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
		if (terms.length === 0) return scoped;
		return scoped.filter((key) => {
			const dotted = formatKey(key).toLowerCase();
			const haystack = [
				dotted,
				dotted.replace(/\./g, " "),
				...SUPPORTED_LANGUAGES.map((lang) =>
					(edits[lang][key] ?? flatByLang[lang][key] ?? "").toLowerCase(),
				),
			].join("\n");
			return terms.every((term) => haystack.includes(term));
		});
	}, [flatByLang, namespace, search, edits]);

	useEffect(() => {
		setPage(0);
	}, [namespace, search]);

	const totalPages = Math.max(1, Math.ceil(keys.length / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages - 1);
	const visibleKeys = keys.slice(
		currentPage * PAGE_SIZE,
		currentPage * PAGE_SIZE + PAGE_SIZE,
	);

	const handleChange = (
		lang: SupportedLanguage,
		key: string,
		value: string,
	) => {
		setEdits((prev) => ({ ...prev, [lang]: { ...prev[lang], [key]: value } }));
	};

	const saveLang = async (lang: SupportedLanguage) => {
		if (!data || Object.keys(edits[lang]).length === 0) return;
		setSaveState((prev) => ({ ...prev, [lang]: "saving" }));

		const updated = structuredClone(data[lang] ?? {});
		for (const [key, value] of Object.entries(edits[lang])) {
			setDeep(updated, key, value);
		}
		const payload = fixArrays(updated) as LocaleTree;

		try {
			await saveLocale(lang, payload);

			try {
				i18n.reloadResources(lang);
				await queryClient.invalidateQueries({ queryKey: ["translate-batch"] });
			} catch (e) {
				console.warn("Failed to reload frontend cache", e);
			}

			setData((prev) => (prev ? { ...prev, [lang]: payload } : prev));
			setEdits((prev) => ({ ...prev, [lang]: {} }));
			setSaveState((prev) => ({ ...prev, [lang]: "saved" }));
		} catch (err) {
			console.error(err);
			setSaveState((prev) => ({ ...prev, [lang]: "error" }));
		}
	};

	// Adds a brand-new key to the DB. Because the editor only lists keys that
	// already exist in the `en` reference tree, new keys have to be created
	// here. When "auto-translate" is on, the English value is machine-translated
	// into every other language via the cascade-api proxy (the Google key stays
	// server-side), then each language tree is saved to the DB.
	const handleAddKey = async () => {
		if (!data || !flatByLang) return;
		const dottedKey = newKey.trim().replace(/^\.+|\.+$/g, "");
		const value = newValue;
		if (!dottedKey) {
			setAddError("Enter a key, e.g. navigation.hrddOverview");
			return;
		}
		if (!value.trim()) {
			setAddError("Enter the English value");
			return;
		}
		const internalPath = dottedKey.split(".").join(PATH_SEP);
		if (internalPath in flatByLang[REFERENCE_LANGUAGE]) {
			setAddError(`Key "${dottedKey}" already exists`);
			return;
		}

		setAddState("adding");
		setAddError(null);
		try {
			const nextData = structuredClone(data);
			const failedLangs: SupportedLanguage[] = [];

			for (const lang of SUPPORTED_LANGUAGES as readonly SupportedLanguage[]) {
				let langValue = value;
				if (lang !== REFERENCE_LANGUAGE && autoTranslate) {
					try {
						langValue = await translateText(value, lang);
					} catch (err) {
						// Fall back to the English value for this language rather than
						// aborting the whole add; it can be corrected inline afterwards.
						console.error(`translate ${lang} failed`, err);
						failedLangs.push(lang);
						langValue = value;
					}
				}
				setDeep(nextData[lang] ?? {}, internalPath, langValue);
			}

			if (autoTranslate && failedLangs.length > 0) {
				setAddError(
					`Saved, but auto-translate failed for: ${failedLangs.join(
						", ",
					)} (kept English — edit inline below). Check the /translate proxy is reachable in this environment.`,
				);
			}

			// Persist each language tree to the DB (PUT replaces the whole tree).
			for (const lang of SUPPORTED_LANGUAGES as readonly SupportedLanguage[]) {
				const payload = fixArrays(nextData[lang] ?? {}) as LocaleTree;
				await saveLocale(lang, payload);
				nextData[lang] = payload;
			}

			setData(nextData);
			setNewKey("");
			setNewValue("");
			setAddState("done");
		} catch (err) {
			console.error(err);
			setAddError(String(err));
			setAddState("error");
		}
	};

	// Deletes a key from every language tree and persists each to the DB. The
	// PUT replaces the whole tree, so the key is gone for all users; running
	// i18next instances keep it until the next reload (addResourceBundle merges,
	// it can't unset), which is fine for a rename/cleanup.
	const handleDeleteKey = async (key: string) => {
		if (!data) return;
		if (
			!window.confirm(
				`Delete "${formatKey(key)}" from all ${SUPPORTED_LANGUAGES.length} languages? This can't be undone.`,
			)
		) {
			return;
		}
		setDeletingKey(key);
		try {
			const nextData = structuredClone(data);
			for (const lang of SUPPORTED_LANGUAGES as readonly SupportedLanguage[]) {
				deleteDeep(nextData[lang] ?? {}, key);
				const payload = fixArrays(nextData[lang] ?? {}) as LocaleTree;
				await saveLocale(lang, payload);
				nextData[lang] = payload;
			}
			setData(nextData);
			setEdits((prev) => {
				const next = { ...prev };
				for (const lang of SUPPORTED_LANGUAGES) {
					if (key in next[lang]) {
						const { [key]: _drop, ...rest } = next[lang];
						next[lang] = rest;
					}
				}
				return next;
			});
		} catch (err) {
			console.error(err);
			window.alert(`Delete failed: ${String(err)}`);
		} finally {
			setDeletingKey(null);
		}
	};

	if (loadError) {
		return (
			<div className="p-6 text-red-600 font-mono text-sm">
				Failed to load translations: {loadError}
			</div>
		);
	}

	if (!data || !flatByLang) {
		return (
			<div className="p-6 text-gray-500 text-sm">Loading translations…</div>
		);
	}

	return (
		<div className="p-6 max-w-[1600px] mx-auto">
			<div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
				<div>
					<Link
						className="text-sm text-[#148696] hover:text-[#004A60] hover:underline"
						search={{ tab: "worker-voice" }}
						to="/internal-dashboard"
					>
						← Back to Internal Dashboard
					</Link>
					<h1 className="text-lg font-semibold mt-1">
						i18n Editor (Issara only)
					</h1>
					<p className="text-xs text-gray-500">
						Edits save straight to the database and go live for all users
						immediately — no deploy needed.
					</p>
				</div>
			</div>

			<div className="flex gap-2 mb-4 border-b">
				<button
					className={`px-3 py-1.5 text-sm border-b-2 -mb-px ${
						tab === "ui-strings"
							? "border-[#148696] text-[#148696] font-medium"
							: "border-transparent text-gray-500 hover:text-gray-700"
					}`}
					onClick={() => handleTabChange("ui-strings")}
					type="button"
				>
					UI Strings
				</button>
				<button
					className={`px-3 py-1.5 text-sm border-b-2 -mb-px ${
						tab === "dynamic-content"
							? "border-[#148696] text-[#148696] font-medium"
							: "border-transparent text-gray-500 hover:text-gray-700"
					}`}
					onClick={() => handleTabChange("dynamic-content")}
					type="button"
				>
					Dynamic Data & Demographics
				</button>
				<button
					className={`px-3 py-1.5 text-sm border-b-2 -mb-px ${
						tab === "solutions"
							? "border-[#148696] text-[#148696] font-medium"
							: "border-transparent text-gray-500 hover:text-gray-700"
					}`}
					onClick={() => handleTabChange("solutions")}
					type="button"
				>
					Solutions
				</button>
			</div>

			{tab === "dynamic-content" && <DynamicTranslationsEditor />}

			{tab === "solutions" && <SolutionTranslationsEditor />}

			{tab === "ui-strings" && (
				<>
					{canManageKeys && (
						<div className="mb-4 rounded border border-gray-200 bg-gray-50 p-3">
							<div className="mb-2 text-sm font-medium">Add new key</div>
							<div className="flex flex-wrap items-start gap-2">
								<input
									className="border rounded px-2 py-1.5 text-sm min-w-[240px] flex-1 max-w-[320px] font-mono"
									onChange={(e) => setNewKey(e.target.value)}
									placeholder="key path, e.g. navigation.hrddOverview"
									value={newKey}
								/>
								<input
									className="border rounded px-2 py-1.5 text-sm min-w-[240px] flex-1 max-w-[400px]"
									onChange={(e) => setNewValue(e.target.value)}
									placeholder="English value"
									value={newValue}
								/>
								<label className="flex items-center gap-1.5 text-xs text-gray-600 py-1.5">
									<input
										checked={autoTranslate}
										onChange={(e) => setAutoTranslate(e.target.checked)}
										type="checkbox"
									/>
									Auto-translate to all languages
								</label>
								<button
									className="px-3 py-1.5 border rounded bg-[#148696] text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed"
									disabled={addState === "adding"}
									onClick={handleAddKey}
									type="button"
								>
									{addState === "adding" ? "Adding…" : "Add key"}
								</button>
								{addState === "done" && (
									<span className="text-green-600 text-xs py-1.5">Added ✓</span>
								)}
							</div>
							{addError && (
								<div className="mt-1.5 text-xs text-red-600">{addError}</div>
							)}
							<p className="mt-1.5 text-xs text-gray-400">
								Use dot notation for nesting. Avoid keys whose value contains{" "}
								<code>{"{{variables}}"}</code> when auto-translating — the
								machine translation may alter the placeholder.
							</p>
						</div>
					)}

					<div className="flex gap-3 mb-4 flex-wrap">
						<select
							className="border rounded px-2 py-1.5 min-w-[200px] flex-1 max-w-[300px] text-sm"
							onChange={(e) => setNamespace(e.target.value)}
							value={namespace}
						>
							<option value="">All pages</option>
							<option value="__root__">General (Uncategorized)</option>
							{namespaces.map((ns) => (
								<option key={ns} value={ns}>
									{ns}
								</option>
							))}
						</select>
						<select
							className="border rounded px-2 py-1.5 min-w-[200px] flex-1 max-w-[300px] text-sm"
							onChange={(e) =>
								setSelectedLanguage(e.target.value as SupportedLanguage | "all")
							}
							value={selectedLanguage}
						>
							<option value="all">All languages</option>
							{SUPPORTED_LANGUAGES.map((lang) => (
								<option key={lang} value={lang}>
									{lang === REFERENCE_LANGUAGE ? `${lang} (Reference)` : lang}
								</option>
							))}
						</select>
						<input
							className="border rounded px-2 py-1.5 text-sm min-w-[200px] flex-1 max-w-[400px]"
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search key or value…"
							type="text"
							value={search}
						/>
					</div>

					<div className="flex w-full items-center justify-between mb-2 text-xs text-gray-500">
						<span>
							{keys.length === 0
								? "No matches"
								: `Showing ${currentPage * PAGE_SIZE + 1}-${Math.min(
										(currentPage + 1) * PAGE_SIZE,
										keys.length,
									)} of ${keys.length}`}
						</span>
						<div className="flex items-center gap-2">
							<button
								className="px-2 py-1 border rounded disabled:opacity-30 disabled:cursor-not-allowed"
								disabled={currentPage === 0}
								onClick={() => setPage((p) => Math.max(0, p - 1))}
								type="button"
							>
								Previous
							</button>
							<span>
								Page {currentPage + 1} of {totalPages}
							</span>
							<button
								className="px-2 py-1 border rounded disabled:opacity-30 disabled:cursor-not-allowed"
								disabled={currentPage >= totalPages - 1}
								onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
								type="button"
							>
								Next
							</button>
						</div>
					</div>

					<div className="overflow-x-auto border rounded w-full">
						<table className="text-sm border-collapse w-full">
							<thead className="bg-gray-50 sticky top-0 z-10">
								<tr>
									<th className="text-left p-2 border-b font-medium min-w-[200px] w-[20%]">
										Key
									</th>
									{visibleLanguages.map((lang) => (
										<th
											className="text-left p-2 border-b font-medium min-w-[300px]"
											key={lang}
										>
											{lang}
											{Object.keys(edits[lang]).length > 0 && (
												<span className="ml-1 text-amber-600">
													({Object.keys(edits[lang]).length})
												</span>
											)}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{visibleKeys.map((key) => (
									<tr className="odd:bg-white even:bg-gray-50/50" key={key}>
										<td className="p-2 border-b align-top font-mono text-xs text-gray-600 break-all w-[20%]">
											<div className="flex items-start justify-between gap-1">
												<span>{formatKey(key)}</span>
												{canManageKeys && (
													<button
														className="shrink-0 text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-1"
														disabled={deletingKey === key}
														onClick={() => handleDeleteKey(key)}
														title="Delete this key from all languages"
														type="button"
													>
														{deletingKey === key ? "…" : "✕"}
													</button>
												)}
											</div>
										</td>
										{visibleLanguages.map((lang) => {
											const original = flatByLang[lang][key] ?? "";
											const value = edits[lang][key] ?? original;
											const isDirty = key in edits[lang];

											const lineCount = value.split("\n").length;
											const charRows = Math.ceil(value.length / 50);
											const initialRows = Math.max(
												3,
												Math.min(
													10,
													lineCount +
														(charRows > 1 ? Math.floor(charRows * 0.7) : 0),
												),
											);

											const meta = metadata?.[lang]?.[key];
											return (
												<td className="p-2 border-b align-top" key={lang}>
													<textarea
														className={`w-full text-xs border rounded px-1.5 py-1 min-h-[60px] resize focus:outline-none focus:ring-1 focus:ring-[#148696] ${
															isDirty
																? "border-amber-400 bg-amber-50"
																: "border-transparent focus:border-gray-300"
														}`}
														onChange={(e) =>
															handleChange(lang, key, e.target.value)
														}
														rows={initialRows}
														value={value}
													/>
													{meta?.updated_by && meta?.updated_at && (
														<div className="text-[10px] text-gray-400 mt-1">
															Updated by {meta.updated_by} on{" "}
															{new Date(meta.updated_at).toLocaleDateString()}
														</div>
													)}
												</td>
											);
										})}
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="mt-4 flex gap-3 flex-wrap">
						{SUPPORTED_LANGUAGES.filter(
							(lang) =>
								visibleLanguages.includes(lang) ||
								Object.keys(edits[lang]).length > 0,
						).map((lang) => (
							<div className="text-xs flex items-center gap-1" key={lang}>
								<button
									className="px-2 py-1 border rounded disabled:opacity-30 disabled:cursor-not-allowed"
									disabled={Object.keys(edits[lang]).length === 0}
									onClick={() => saveLang(lang)}
									type="button"
								>
									Save {lang}
								</button>
								{saveState[lang] === "saving" && (
									<span className="text-gray-400">saving…</span>
								)}
								{saveState[lang] === "saved" && (
									<span className="text-green-600">saved</span>
								)}
								{saveState[lang] === "error" && (
									<span className="text-red-600">error</span>
								)}
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
};
