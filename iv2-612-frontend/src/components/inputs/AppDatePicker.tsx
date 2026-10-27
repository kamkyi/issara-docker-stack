import DatePicker, { type DatePickerProps } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type SingleDatePickerProps = Extract<
	DatePickerProps,
	{
		selectsRange?: never;
		selectsMultiple?: never;
	}
>;

interface AppDatePickerProps {
	id?: string;
	selected?: Date | null;
	onChange: (date: Date | null) => void;
	placeholderText?: string;
	className?: string;
	calendarClassName?: string;
	dateFormat?: string;
	minDate?: Date;
	maxDate?: Date;
	showMonthDropdown?: boolean;
	showYearDropdown?: boolean;
	dropdownMode?: "scroll" | "select";
	yearDropdownItemNumber?: number;
	scrollableYearDropdown?: boolean;
}

const AppDatePicker = ({
	id,
	selected = null,
	onChange,
	placeholderText,
	className,
	calendarClassName,
	dateFormat = "yyyy-MM-dd",
	minDate,
	maxDate,
	showMonthDropdown,
	showYearDropdown,
	dropdownMode,
	yearDropdownItemNumber,
	scrollableYearDropdown,
}: AppDatePickerProps) => {
	const handleChange: NonNullable<SingleDatePickerProps["onChange"]> = (
		value,
	) => {
		onChange(value);
	};

	return (
		<DatePicker
			calendarClassName={calendarClassName}
			className={className}
			dateFormat={dateFormat}
			dropdownMode={dropdownMode}
			id={id}
			maxDate={maxDate}
			minDate={minDate}
			onChange={handleChange}
			placeholderText={placeholderText}
			scrollableYearDropdown={scrollableYearDropdown}
			selected={selected}
			showMonthDropdown={showMonthDropdown}
			showYearDropdown={showYearDropdown}
			yearDropdownItemNumber={yearDropdownItemNumber}
		/>
	);
};

export default AppDatePicker;
