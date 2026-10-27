/**
 * Form primitives for the Worker Voice form.
 *
 * These deliberately render with the same markup and class names as the
 * supplier Worker Feedback form (`workerFeedback/stepperForm`), so a CSO
 * officer and a supplier HR officer see the identical control design for the
 * questions the two forms share. Only the *option sets* differ, because those
 * are audience-filtered server-side.
 */
import {
	ChevronDownIcon,
	ChevronUpIcon,
	MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import * as Popover from "@radix-ui/react-popover";
import * as Select from "@radix-ui/react-select";
import { Text } from "@radix-ui/themes";
import {
	type CountryCode,
	getCountries,
	getCountryCallingCode,
} from "libphonenumber-js";
import type React from "react";
import { useEffect, useId, useRef, useState } from "react";
import AppDatePicker from "$src/components/inputs/AppDatePicker";
import "$src/components/workerFeedback/stepperForm/FormSteps.css";
import "./fields.css";

interface FieldProps {
	label: string;
	required?: boolean;
	hint?: string;
	error?: string;
	children: (controlId: string) => React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({
	label,
	required,
	hint,
	error,
	children,
}) => {
	const controlId = useId();

	return (
		<div className="flex flex-col gap-1">
			<label className="text-sm font-bold mb-0_5" htmlFor={controlId}>
				{label}
				{required && (
					<span aria-hidden className="ml-0.5 text-red-600">
						*
					</span>
				)}
			</label>
			{hint && (
				<Text as="p" className="text-gray-500" size="1">
					{hint}
				</Text>
			)}
			{children(controlId)}
			{error && (
				<Text as="p" className="text-red-600" role="alert" size="1">
					{error}
				</Text>
			)}
		</div>
	);
};

export interface SelectOption {
	id: number | string;
	name: string;
}

interface LookupSelectProps {
	controlId: string;
	value: number | string | null;
	onChange: (value: number | null) => void;
	options: SelectOption[];
	placeholder: string;
	disabled?: boolean;
	invalid?: boolean;
}

/**
 * Radix Select styled with the supplier form's `case-call-type-*` rules -- the
 * design behind "What is the reason that this worker contacted us?" there.
 * Every dropdown on this form uses it so the page reads as one control set.
 */
export const LookupSelect: React.FC<LookupSelectProps> = ({
	controlId,
	value,
	onChange,
	options,
	placeholder,
	disabled,
	invalid,
}) => (
	<div className="case-call-type-dropdown-container">
		<Select.Root
			disabled={disabled || options.length === 0}
			onValueChange={(next) => onChange(next === "" ? null : Number(next))}
			value={value === null || value === undefined ? "" : String(value)}
		>
			<Select.Trigger
				aria-invalid={invalid || undefined}
				aria-label={placeholder}
				className={`case-call-type-trigger ${invalid ? "border-red-500" : ""}`}
				id={controlId}
			>
				<Select.Value placeholder={placeholder} />
				<Select.Icon>
					<ChevronDownIcon />
				</Select.Icon>
			</Select.Trigger>
			<Select.Portal>
				<Select.Content className="case-call-type-content" sideOffset={4}>
					<Select.ScrollUpButton className="case-call-type-scroll-button">
						<ChevronUpIcon />
					</Select.ScrollUpButton>
					<Select.Viewport className="p-1">
						{options.map((option) => (
							<Select.Item
								className="case-call-type-item"
								key={option.id}
								value={String(option.id)}
							>
								<Select.ItemText>{option.name}</Select.ItemText>
							</Select.Item>
						))}
					</Select.Viewport>
					<Select.ScrollDownButton className="case-call-type-scroll-button">
						<ChevronDownIcon />
					</Select.ScrollDownButton>
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	</div>
);

interface TextControlProps {
	controlId: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	invalid?: boolean;
}

export const TextInput: React.FC<TextControlProps & { type?: string }> = ({
	controlId,
	value,
	onChange,
	placeholder,
	invalid,
	type = "text",
}) => (
	<input
		aria-invalid={invalid || undefined}
		className={`form-input ${invalid ? "border-red-500" : ""}`}
		id={controlId}
		onChange={(event) => onChange(event.target.value)}
		placeholder={placeholder}
		type={type}
		value={value}
	/>
);

/**
 * `libphonenumber-js` supplies the maintained global country/calling-code
 * metadata. Each flag is derived from its ISO country code as a Unicode flag,
 * preserving the compact presentation of the original dropdown without
 * maintaining flag assets in this form.
 */
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const familiarCountryOrder: CountryCode[] = [
	"MM",
	"KH",
	"TH",
	"VN",
	"LA",
	"BD",
	"NP",
	"IN",
	"PH",
	"ID",
	"MY",
	"US",
];
const familiarCountryRank = new Map(
	familiarCountryOrder.map((countryCode, index) => [countryCode, index]),
);

export const DIAL_CODES = getCountries()
	.map((countryCode) => ({
		code: `+${getCountryCallingCode(countryCode)}`,
		countryCode,
		flag: String.fromCodePoint(
			...countryCode
				.split("")
				.map((character) => 127397 + character.charCodeAt(0)),
		),
		label: countryNames.of(countryCode) ?? countryCode,
	}))
	.sort((first, second) => {
		const firstRank = familiarCountryRank.get(first.countryCode);
		const secondRank = familiarCountryRank.get(second.countryCode);
		if (firstRank !== undefined || secondRank !== undefined) {
			return (
				(firstRank ?? Number.MAX_SAFE_INTEGER) -
				(secondRank ?? Number.MAX_SAFE_INTEGER)
			);
		}
		return first.label.localeCompare(second.label);
	});

const DEFAULT_COUNTRY: CountryCode = "MM";
const DEFAULT_DIAL_CODE =
	DIAL_CODES.find((option) => option.countryCode === DEFAULT_COUNTRY) ??
	DIAL_CODES[0];

const countryForDialCode = (dialCode: string | null): CountryCode =>
	DIAL_CODES.find((option) => option.code === dialCode)?.countryCode ??
	DEFAULT_DIAL_CODE.countryCode;

/**
 * `cases` stores each contact as a single string. Splitting on the space after
 * the leading `+` keeps +1 and +91 unambiguous, and a value saved before this
 * control existed simply comes back as the number with the default code.
 */
export const splitPhone = (
	value: string,
): { dialCode: string | null; number: string } => {
	const match = /^(\+\d{1,4})\s+(.*)$/.exec(value.trim());
	return match
		? { dialCode: match[1], number: match[2] }
		: { dialCode: null, number: value };
};

/** Inverse of `splitPhone`. An empty number is stored empty, code and all. */
export const joinPhone = (dialCode: string, number: string): string =>
	number.trim() === "" ? "" : `${dialCode} ${number}`;

interface PhoneInputProps {
	controlId: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	codeLabel: string;
	searchPlaceholder?: string;
	noMatchesLabel?: string;
}

/**
 * Country codes matching `query`, in the list's own order.
 *
 * An officer looking for Thailand knows it either by name or by its dialling
 * code, so both work: a query that is digits (with or without the leading `+`)
 * is matched as a prefix of the calling code, and anything else against the
 * country name and its two-letter code. Scrolling 240 entries was the whole
 * complaint, and either spelling of "+66" or "th" gets there in two keystrokes.
 */
export const matchDialCodes = (query: string): typeof DIAL_CODES => {
	const trimmed = query.trim();
	if (trimmed === "") {
		return DIAL_CODES;
	}

	const digits = trimmed.replace(/^\+/, "").replace(/[\s-]/g, "");
	if (/^\d+$/.test(digits)) {
		return DIAL_CODES.filter((option) =>
			option.code.slice(1).startsWith(digits),
		);
	}

	const needle = trimmed.toLowerCase();
	return DIAL_CODES.filter(
		(option) =>
			option.label.toLowerCase().includes(needle) ||
			option.countryCode.toLowerCase().startsWith(needle),
	);
};

/**
 * Country code and number as one control, per the design. The two halves share
 * a border so they read as a single field next to the plain inputs around them.
 *
 * The code half is a Popover rather than a Select because it needs a search box
 * inside the list, and a Select owns the keyboard of its own panel -- typing
 * would drive its typeahead instead of reaching the input.
 */
export const PhoneInput: React.FC<PhoneInputProps> = ({
	controlId,
	value,
	onChange,
	placeholder,
	codeLabel,
	searchPlaceholder,
	noMatchesLabel,
}) => {
	const parsed = splitPhone(value);
	// Remembered separately so clearing the number does not lose the country
	// the officer picked -- an empty field is stored empty, code and all.
	const [lastCountryCode, setLastCountryCode] = useState<CountryCode>(
		DEFAULT_DIAL_CODE.countryCode,
	);
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [activeIndex, setActiveIndex] = useState(0);
	const listId = useId();
	const listRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);

	const lastCountry =
		DIAL_CODES.find((option) => option.countryCode === lastCountryCode) ??
		DEFAULT_DIAL_CODE;
	const countryCode =
		parsed.dialCode && parsed.dialCode !== lastCountry.code
			? countryForDialCode(parsed.dialCode)
			: lastCountryCode;
	const selectedCountry =
		DIAL_CODES.find((option) => option.countryCode === countryCode) ??
		DEFAULT_DIAL_CODE;
	const dialCode = parsed.dialCode ?? selectedCountry.code;

	const matches = matchDialCodes(query);
	const emit = (code: string, number: string) =>
		onChange(joinPhone(code, number));

	const select = (option: (typeof DIAL_CODES)[number]) => {
		setLastCountryCode(option.countryCode);
		emit(option.code, parsed.number);
		setIsOpen(false);
	};

	// Keep the highlighted row on screen as the arrow keys walk past the fold.
	useEffect(() => {
		listRef.current
			?.querySelector('[data-active="true"]')
			?.scrollIntoView({ block: "nearest" });
	}, [activeIndex]);

	const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			const step = event.key === "ArrowDown" ? 1 : -1;
			setActiveIndex((current) =>
				Math.min(Math.max(current + step, 0), matches.length - 1),
			);
			return;
		}
		if (event.key === "Enter" && matches[activeIndex]) {
			event.preventDefault();
			select(matches[activeIndex]);
		}
		// Escape falls through to the Popover, which closes and restores focus.
	};

	return (
		<div className="wv-phone">
			<Popover.Root
				onOpenChange={(open) => {
					setIsOpen(open);
					if (open) {
						// Open on the current country rather than the top of the list.
						setQuery("");
						setActiveIndex(
							Math.max(
								DIAL_CODES.findIndex(
									(option) =>
										option.countryCode === selectedCountry.countryCode,
								),
								0,
							),
						);
					}
				}}
				open={isOpen}
			>
				<Popover.Trigger
					aria-label={codeLabel}
					className="wv-phone-code"
					type="button"
				>
					<span>
						{selectedCountry.flag} {selectedCountry.code}
					</span>
					<ChevronDownIcon />
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Content
						align="start"
						className="case-call-type-content wv-code-panel"
						onOpenAutoFocus={(event) => {
							// Land in the search box, not on the first row.
							event.preventDefault();
							searchRef.current?.focus();
						}}
						sideOffset={4}
					>
						<div className="wv-code-search">
							<MagnifyingGlassIcon className="wv-code-search-icon" />
							<input
								aria-activedescendant={
									matches[activeIndex]
										? `${listId}-${matches[activeIndex].countryCode}`
										: undefined
								}
								aria-controls={listId}
								aria-expanded
								autoComplete="off"
								onChange={(event) => {
									setQuery(event.target.value);
									setActiveIndex(0);
								}}
								onKeyDown={onSearchKeyDown}
								placeholder={searchPlaceholder}
								ref={searchRef}
								role="combobox"
								type="text"
								value={query}
							/>
						</div>
						{/* A div rather than a ul: a list cannot carry `listbox`, and the
						    rows have to be buttons to be reachable by pointer and key. */}
						<div
							className="wv-code-list"
							id={listId}
							ref={listRef}
							role="listbox"
						>
							{matches.map((option, index) => (
								<button
									aria-selected={
										option.countryCode === selectedCountry.countryCode
									}
									className="case-call-type-item wv-code-item"
									data-active={index === activeIndex}
									id={`${listId}-${option.countryCode}`}
									key={option.countryCode}
									onClick={() => select(option)}
									onMouseMove={() => setActiveIndex(index)}
									role="option"
									type="button"
								>
									<span>
										{option.flag} {option.code}
									</span>
									<span className="wv-code-name">{option.label}</span>
								</button>
							))}
							{matches.length === 0 && (
								<p className="wv-code-empty">{noMatchesLabel}</p>
							)}
						</div>
					</Popover.Content>
				</Popover.Portal>
			</Popover.Root>
			<input
				className="wv-phone-number"
				id={controlId}
				onChange={(event) => emit(dialCode, event.target.value)}
				placeholder={placeholder}
				type="tel"
				value={parsed.number}
			/>
		</div>
	);
};

export const NumberInput: React.FC<TextControlProps & { min?: number }> = ({
	controlId,
	value,
	onChange,
	placeholder,
	invalid,
	min = 0,
}) => (
	<input
		aria-invalid={invalid || undefined}
		className={`form-input ${invalid ? "border-red-500" : ""} max-w-[220px]`}
		id={controlId}
		min={min}
		onChange={(event) => onChange(event.target.value)}
		placeholder={placeholder}
		type="number"
		value={value}
	/>
);

export const TextArea: React.FC<TextControlProps & { rows?: number }> = ({
	controlId,
	value,
	onChange,
	placeholder,
	invalid,
	rows = 4,
}) => (
	<textarea
		aria-invalid={invalid || undefined}
		className={`form-textarea ${invalid ? "border-red-500" : ""} leading-relaxed`}
		id={controlId}
		onChange={(event) => onChange(event.target.value)}
		placeholder={placeholder}
		rows={rows}
		value={value}
	/>
);

/**
 * `cases` stores dates as `YYYY-MM-DD`, and the form model carries them as
 * strings. Parse and format in local time -- going through `Date.toISOString()`
 * shifts the day for anyone east or west of UTC.
 */
const parseDateValue = (value: string): Date | null => {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) {
		return null;
	}
	return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

const formatDateValue = (date: Date | null): string => {
	if (!date || Number.isNaN(date.getTime())) {
		return "";
	}
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
};

interface DateInputProps {
	controlId: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	invalid?: boolean;
}

/** Same calendar as the supplier form's date questions. */
export const DateInput: React.FC<DateInputProps> = ({
	controlId,
	value,
	onChange,
	placeholder,
	invalid,
}) => (
	<AppDatePicker
		calendarClassName="cascade-datepicker"
		className={`form-input ${invalid ? "border-red-500" : ""}`}
		dropdownMode="select"
		id={controlId}
		onChange={(date) => onChange(formatDateValue(date))}
		placeholderText={placeholder}
		selected={parseDateValue(value)}
		showMonthDropdown={true}
		showYearDropdown={true}
	/>
);

interface ChoiceGroupProps<T extends string> {
	name: string;
	value: T | null;
	onChange: (value: T) => void;
	options: Array<{ value: T; label: string }>;
	invalid?: boolean;
}

/** Pill-style radio group, used for the form's Yes/No-shaped questions. */
export const ChoiceGroup = <T extends string>({
	name,
	value,
	onChange,
	options,
	invalid,
}: ChoiceGroupProps<T>) => (
	<fieldset
		aria-invalid={invalid || undefined}
		className="flex flex-wrap gap-2 border-0 p-0"
	>
		{options.map((option) => {
			const isActive = value === option.value;
			return (
				<label
					className={`cursor-pointer rounded-full border px-5 py-1.5 text-sm font-medium transition focus-within:ring-2 focus-within:ring-blue-500 ${
						isActive
							? "border-blue-600 bg-blue-600 text-white"
							: "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
					}`}
					key={`${name}-${option.value}`}
				>
					<input
						checked={isActive}
						className="sr-only"
						name={name}
						onChange={() => onChange(option.value)}
						type="radio"
						value={option.value}
					/>
					{option.label}
				</label>
			);
		})}
	</fieldset>
);
