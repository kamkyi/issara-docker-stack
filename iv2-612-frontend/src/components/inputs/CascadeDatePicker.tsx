import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { forwardRef, type ReactElement } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

/**
 * The CASCADE-themed single date picker: rounded teal calendar, pill day cells
 * and a compact month header. The look lives in `global.css` under
 * `.cascade-datepicker*`; this component owns the markup that CSS expects, so
 * every screen gets the same calendar instead of re-deriving the custom header.
 */

interface CascadeDateInputProps {
	disabled?: boolean;
	id?: string;
	onClick?: () => void;
	placeholder?: string;
	value?: string;
	"aria-label"?: string;
}

/**
 * Default trigger: a button rather than a text field, so the calendar is the
 * single source of truth for the value and the control stays operable by
 * keyboard (Enter/Space open it) without free-text date parsing.
 */
const CascadeDateInput = forwardRef<HTMLButtonElement, CascadeDateInputProps>(
	(
		{ "aria-label": ariaLabel, disabled, id, onClick, placeholder, value },
		ref,
	) => (
		<button
			aria-label={ariaLabel}
			className="flex h-[42px] w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 text-left text-sm text-gray-700 transition-colors hover:border-[#148696] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 disabled:hover:border-gray-200"
			disabled={disabled}
			id={id}
			onClick={onClick}
			ref={ref}
			type="button"
		>
			<span className={value ? "text-gray-700" : "text-gray-400"}>
				{value || placeholder || "Select a date"}
			</span>
			<CalendarDays
				aria-hidden="true"
				className={`h-4 w-4 shrink-0 ${disabled ? "text-gray-300" : "text-[#148696]"}`}
			/>
		</button>
	),
);

CascadeDateInput.displayName = "CascadeDateInput";

export interface CascadeDatePickerProps {
	id?: string;
	selected: Date | null;
	onChange: (date: Date | null) => void;
	/** Replaces the default button trigger, e.g. a taller marketplace field. */
	customInput?: ReactElement;
	dateFormat?: string;
	disabled?: boolean;
	maxDate?: Date;
	minDate?: Date;
	placeholderText?: string;
	wrapperClassName?: string;
	"aria-label"?: string;
}

const CascadeDatePicker = ({
	"aria-label": ariaLabel,
	customInput,
	dateFormat = "dd-MMM-yyyy",
	disabled,
	id,
	maxDate,
	minDate,
	onChange,
	placeholderText,
	selected,
	wrapperClassName = "w-full",
}: CascadeDatePickerProps) => (
	<DatePicker
		calendarClassName="cascade-datepicker"
		customInput={
			customInput ?? <CascadeDateInput aria-label={ariaLabel} id={id} />
		}
		dateFormat={dateFormat}
		disabled={disabled}
		maxDate={maxDate}
		minDate={minDate}
		onChange={onChange}
		placeholderText={placeholderText}
		popperClassName="cascade-datepicker-popper"
		// The stock header is hidden by the theme; this one matches the rest of
		// the app's controls (teal pill navigation, capitalised month + year).
		renderCustomHeader={({
			date,
			decreaseMonth,
			increaseMonth,
			nextMonthButtonDisabled,
			prevMonthButtonDisabled,
		}) => (
			<div className="cascade-datepicker__header">
				<button
					aria-label="Previous month"
					className="cascade-datepicker__nav"
					disabled={prevMonthButtonDisabled}
					onClick={decreaseMonth}
					type="button"
				>
					<ChevronLeft aria-hidden="true" className="h-4 w-4" />
				</button>
				<div className="cascade-datepicker__title">
					{date.toLocaleString("en-US", { month: "long", year: "numeric" })}
				</div>
				<button
					aria-label="Next month"
					className="cascade-datepicker__nav"
					disabled={nextMonthButtonDisabled}
					onClick={increaseMonth}
					type="button"
				>
					<ChevronRight aria-hidden="true" className="h-4 w-4" />
				</button>
			</div>
		)}
		selected={selected}
		showPopperArrow={false}
		wrapperClassName={wrapperClassName}
	/>
);

export default CascadeDatePicker;
