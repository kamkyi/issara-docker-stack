import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
	NACE_LEVEL,
	type NaceCode,
	type NaceLevel,
	naceTitleCase,
	useNaceCodes,
} from "$src/queries/naceCodes";

/**
 * NACE Rev. 2.1 as four dependent dropdowns — section → division → group →
 * class — one per level of the published classification.
 *
 * Unlike {@link NaceCascadingSelect}, which is a single drill-down menu for
 * picking several codes, this renders the levels side by side so a form can
 * show exactly how deep the respondent went. Only the section is ever
 * required; each finer level stays disabled until its parent is chosen, and
 * changing a parent clears everything below it.
 */

export interface NaceSelection {
	/** NACE notation as displayed: "A", "01", "01.1", "01.11". */
	section: string;
	division: string;
	group: string;
	class: string;
}

export const EMPTY_NACE_SELECTION: NaceSelection = {
	section: "",
	division: "",
	group: "",
	class: "",
};

interface NaceLevelSelectsProps {
	value: NaceSelection;
	onChange: (value: NaceSelection) => void;
	isDisabled?: boolean;
	/** Marks the Section dropdown as required in the label. */
	sectionRequired?: boolean;
}

/**
 * Divisions and below are numeric on their own ("01", "01.1"), so they carry
 * the section letter in front of them — "A01" — the way the classification
 * prints the path. Display only: the stored value stays the bare NACE code.
 */
function optionLabel(naceCode: NaceCode): string {
	if (naceCode.level === NACE_LEVEL.SECTION) {
		return `${naceCode.code} — ${naceTitleCase(naceCode.label)}`;
	}
	return `${naceCode.section_code}${naceCode.code} — ${naceCode.label}`;
}

const SELECT_CLASS =
	"w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#148696] disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed";

const NaceLevelSelects: React.FC<NaceLevelSelectsProps> = ({
	value,
	onChange,
	isDisabled = false,
	sectionRequired = true,
}) => {
	const { t } = useTranslation();
	const uid = useId();
	const { data, isLoading, error } = useNaceCodes();

	/** Children of each code, keyed by parent code ("" for the sections). */
	const byParent = useMemo(() => {
		const map = new Map<string, NaceCode[]>();
		for (const code of data ?? []) {
			const key = code.parent_code ?? "";
			const bucket = map.get(key) ?? [];
			bucket.push(code);
			map.set(key, bucket);
		}
		// The API returns official order already, so no re-sorting is needed.
		return map;
	}, [data]);

	/**
	 * Children of a picked parent. An empty `parentCode` means the level above
	 * has not been answered yet — it must not fall through to `byParent`, whose
	 * "" bucket holds the sections themselves.
	 */
	const childrenOf = (parentCode: string) =>
		parentCode ? (byParent.get(parentCode) ?? []) : [];

	if (error) {
		return (
			<p className="text-sm text-red-500">{t("naceCodeDropdown.error")}</p>
		);
	}

	const levels: {
		key: keyof NaceSelection;
		level: NaceLevel;
		label: string;
		options: NaceCode[];
		/** Shown when the parent level has not been chosen yet. */
		lockedPlaceholder: string;
		placeholder: string;
		/** The selection once this level changes — deeper levels are cleared. */
		next: (code: string) => NaceSelection;
	}[] = [
		{
			key: "section",
			level: NACE_LEVEL.SECTION,
			label: t("naceCascadingSelect.section"),
			options: byParent.get("") ?? [],
			lockedPlaceholder: t("naceLevelSelects.selectSection"),
			placeholder: t("naceLevelSelects.selectSection"),
			next: (code) => ({ ...EMPTY_NACE_SELECTION, section: code }),
		},
		{
			key: "division",
			level: NACE_LEVEL.DIVISION,
			label: t("naceCascadingSelect.division"),
			options: childrenOf(value.section),
			lockedPlaceholder: t("naceLevelSelects.selectSectionFirst"),
			placeholder: t("naceLevelSelects.selectDivision"),
			next: (code) => ({ ...value, division: code, group: "", class: "" }),
		},
		{
			key: "group",
			level: NACE_LEVEL.GROUP,
			label: t("naceCascadingSelect.group"),
			options: childrenOf(value.division),
			lockedPlaceholder: t("naceLevelSelects.selectDivisionFirst"),
			placeholder: t("naceLevelSelects.selectGroup"),
			next: (code) => ({ ...value, group: code, class: "" }),
		},
		{
			key: "class",
			level: NACE_LEVEL.CLASS,
			label: t("naceCascadingSelect.class"),
			options: childrenOf(value.group),
			lockedPlaceholder: t("naceLevelSelects.selectGroupFirst"),
			placeholder: t("naceLevelSelects.selectClass"),
			next: (code) => ({ ...value, class: code }),
		},
	];

	// The picked path, coarsest first — "A", "A01", "A01.1", "A01.11".
	const breadcrumb = [value.section, value.division, value.group, value.class]
		.filter((code) => code.length > 0)
		.map((code, index) => (index === 0 ? code : `${value.section}${code}`));

	return (
		<div className="space-y-3">
			{levels.map(
				({ key, label, options, lockedPlaceholder, placeholder, next }) => {
					const locked = options.length === 0;
					const disabled = isDisabled || isLoading || locked;
					return (
						<div key={key}>
							<label
								className={`text-sm font-bold block mb-1 ${
									disabled ? "text-gray-400" : "text-gray-700"
								}`}
								htmlFor={`${uid}-${key}`}
							>
								{label}
								{key === "section" && sectionRequired && (
									<>
										{" "}
										<span className="text-[#FB8379]">*</span>
									</>
								)}
							</label>
							<select
								className={SELECT_CLASS}
								disabled={disabled}
								id={`${uid}-${key}`}
								onChange={(event) => onChange(next(event.target.value))}
								value={value[key]}
							>
								<option value="">
									{isLoading
										? t("naceCodeDropdown.loading")
										: locked
											? lockedPlaceholder
											: placeholder}
								</option>
								{options.map((option) => (
									<option key={option.code} value={option.code}>
										{optionLabel(option)}
									</option>
								))}
							</select>
						</div>
					);
				},
			)}

			{breadcrumb.length > 0 && (
				<ol className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-gray-50 px-4 py-3">
					<li aria-hidden="true" className="flex items-center text-[#148696]">
						<svg
							fill="none"
							height="16"
							role="presentation"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							viewBox="0 0 24 24"
							width="16"
						>
							<path d="M5 12h14M13 6l6 6-6 6" />
						</svg>
					</li>
					{breadcrumb.map((code, index) => (
						<li className="flex items-center gap-2" key={code}>
							{index > 0 && (
								<span aria-hidden="true" className="text-gray-300">
									›
								</span>
							)}
							<span className="text-sm font-bold text-gray-700">{code}</span>
						</li>
					))}
				</ol>
			)}
		</div>
	);
};

export default NaceLevelSelects;
