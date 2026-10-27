import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { GroupBase, MenuListProps, StylesConfig } from "react-select";
import Select, { components as selectComponents } from "react-select";
import {
	NACE_LEVEL,
	type NaceCode,
	type NaceLevel,
	useNaceCodes,
} from "$src/queries/naceCodes";

/**
 * Reusable NACE Rev. 2.1 picker.
 *
 * The classification has 1047 entries across four levels, which is far too
 * many to scroll, so the menu is search-first: options are grouped under their
 * section and the rendered list is capped until the user types.
 *
 * Selection is by `code` ("A", "01", "01.1", "01.11") rather than by row id,
 * so stored values stay readable and survive a re-seed of the reference table.
 */

/** How many options to render at once before asking the user to narrow down. */
const MAX_RENDERED_OPTIONS = 100;

interface NaceOption {
	value: string;
	label: string;
	naceCode: NaceCode;
}

type NaceGroup = GroupBase<NaceOption>;

interface BaseProps {
	/** Restrict the pickable levels. Defaults to all four. */
	levels?: NaceLevel[];
	placeholder?: string;
	className?: string;
	isDisabled?: boolean;
	isClearable?: boolean;
	/** Ties the control to an external <label htmlFor>. */
	inputId?: string;
}

interface SingleProps extends BaseProps {
	isMulti?: false;
	value: string | null;
	onChange: (code: string | null, naceCode: NaceCode | null) => void;
}

interface MultiProps extends BaseProps {
	isMulti: true;
	value: string[];
	onChange: (codes: string[], naceCodes: NaceCode[]) => void;
}

export type NaceCodeDropdownProps = SingleProps | MultiProps;

const customStyles: StylesConfig<NaceOption, boolean, NaceGroup> = {
	control: (provided) => ({
		...provided,
		borderRadius: "0.375rem",
		border: "1px solid #d1d5db",
		padding: "0.25rem",
		boxShadow: "none",
		"&:hover": { borderColor: "#9ca3af" },
	}),
	menu: (provided) => ({
		...provided,
		borderRadius: "0.375rem",
		boxShadow:
			"0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
		zIndex: 9999,
	}),
	// The menu is portaled to <body>, which a modal dialog (Radix) freezes with
	// `pointer-events: none` while it is open — without this the options render
	// but cannot be clicked.
	menuPortal: (base) => ({ ...base, zIndex: 9999, pointerEvents: "auto" }),
	option: (provided, state) => ({
		...provided,
		backgroundColor: state.isSelected
			? "#2563eb"
			: state.isFocused
				? "#e5e7eb"
				: undefined,
		color: state.isSelected ? "white" : "#374151",
		cursor: "pointer",
		":active": { backgroundColor: "#dbeafe" },
	}),
	groupHeading: (provided) => ({
		...provided,
		fontSize: "0.6875rem",
		fontWeight: 700,
		letterSpacing: "0.04em",
		color: "#6b7280",
	}),
};

/** Kept lowercase mid-heading, the way the classification itself prints them. */
const MINOR_WORDS = new Set([
	"and",
	"as",
	"at",
	"by",
	"for",
	"from",
	"in",
	"of",
	"on",
	"or",
	"the",
	"to",
	"with",
]);

/** Sections arrive ALL CAPS from the source; soften them for display. */
function toTitleCase(text: string): string {
	let startOfSegment = true;
	return text.toLowerCase().replace(/[a-z]+|[;.]/g, (token) => {
		if (token === ";" || token === ".") {
			startOfSegment = true;
			return token;
		}
		const capitalized = `${token.charAt(0).toUpperCase()}${token.slice(1)}`;
		const rendered =
			startOfSegment || !MINOR_WORDS.has(token) ? capitalized : token;
		startOfSegment = false;
		return rendered;
	});
}

function toOption(naceCode: NaceCode): NaceOption {
	const label =
		naceCode.level === NACE_LEVEL.SECTION
			? toTitleCase(naceCode.label)
			: naceCode.label;
	return {
		value: naceCode.code,
		label: `${naceCode.code} — ${label}`,
		naceCode,
	};
}

function matches(naceCode: NaceCode, search: string): boolean {
	const term = search.trim().toLowerCase();
	if (!term) return true;
	return (
		naceCode.code.toLowerCase().includes(term) ||
		naceCode.label.toLowerCase().includes(term)
	);
}

const NaceCodeDropdown: React.FC<NaceCodeDropdownProps> = (props) => {
	const { t } = useTranslation();
	const {
		levels,
		placeholder = t("naceCodeDropdown.placeholder"),
		className = "",
		isDisabled = false,
		isClearable = true,
		inputId,
	} = props;

	const { data, isLoading, error } = useNaceCodes();
	const [search, setSearch] = useState("");

	const codes = useMemo(() => {
		const all = data ?? [];
		if (!levels || levels.length === 0) return all;
		return all.filter((code) => levels.includes(code.level));
	}, [data, levels]);

	// Sections are the group headings, so they are always needed for lookup even
	// when they are not themselves selectable.
	const sectionLabels = useMemo(() => {
		const map = new Map<string, string>();
		for (const code of data ?? []) {
			if (code.level === NACE_LEVEL.SECTION) {
				map.set(code.code, `${code.code} — ${toTitleCase(code.label)}`);
			}
		}
		return map;
	}, [data]);

	const { options, hiddenCount } = useMemo(() => {
		const matched = codes.filter((code) => matches(code, search));
		const shown = matched.slice(0, MAX_RENDERED_OPTIONS);
		const hiddenCount = matched.length - shown.length;

		// Grouping under section headings only helps when finer levels are on
		// screen; a section-only list would repeat each heading over its one child.
		if (shown.every((code) => code.level === NACE_LEVEL.SECTION)) {
			return { options: shown.map(toOption), hiddenCount };
		}

		const bySection = new Map<string, NaceOption[]>();
		for (const code of shown) {
			const bucket = bySection.get(code.section_code) ?? [];
			bucket.push(toOption(code));
			bySection.set(code.section_code, bucket);
		}

		return {
			options: [...bySection.entries()].map(([section, sectionOptions]) => ({
				label: sectionLabels.get(section) ?? section,
				options: sectionOptions,
			})),
			hiddenCount,
		};
	}, [codes, search, sectionLabels]);

	// Tell the user the list is truncated, rather than silently hiding matches.
	const MenuList = useMemo(() => {
		return function NaceMenuList(
			menuProps: MenuListProps<NaceOption, boolean, NaceGroup>,
		) {
			return (
				<selectComponents.MenuList {...menuProps}>
					{menuProps.children}
					{hiddenCount > 0 && (
						<div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-100">
							{t("naceCodeDropdown.moreResults", { count: hiddenCount })}
						</div>
					)}
				</selectComponents.MenuList>
			);
		};
	}, [hiddenCount, t]);

	const byCode = useMemo(() => {
		return new Map((data ?? []).map((code) => [code.code, code]));
	}, [data]);

	const selected = useMemo(() => {
		if (props.isMulti) {
			return props.value
				.map((code) => byCode.get(code))
				.filter((code): code is NaceCode => Boolean(code))
				.map(toOption);
		}
		const match = props.value ? byCode.get(props.value) : undefined;
		return match ? toOption(match) : null;
	}, [props.isMulti, props.value, byCode]);

	if (error) {
		return (
			<div className="text-red-500 text-sm">{t("naceCodeDropdown.error")}</div>
		);
	}

	return (
		<Select<NaceOption, boolean, NaceGroup>
			className={`nace-code-dropdown ${className}`}
			components={{ MenuList }}
			// Options are already narrowed against `search`, so react-select must
			// not filter them a second time.
			filterOption={null}
			inputId={inputId}
			isClearable={isClearable}
			isDisabled={isDisabled || isLoading}
			isLoading={isLoading}
			isMulti={props.isMulti}
			menuPortalTarget={
				typeof document === "undefined" ? undefined : document.body
			}
			menuPosition="fixed"
			noOptionsMessage={() => t("naceCodeDropdown.noResults")}
			onChange={(option) => {
				if (props.isMulti) {
					const options = (option ?? []) as readonly NaceOption[];
					props.onChange(
						options.map((item) => item.value),
						options.map((item) => item.naceCode),
					);
					return;
				}
				const single = option as NaceOption | null;
				props.onChange(single?.value ?? null, single?.naceCode ?? null);
			}}
			onInputChange={(value) => setSearch(value)}
			options={options}
			placeholder={isLoading ? t("naceCodeDropdown.loading") : placeholder}
			styles={customStyles}
			value={selected}
		/>
	);
};

export default NaceCodeDropdown;
export { MAX_RENDERED_OPTIONS };
