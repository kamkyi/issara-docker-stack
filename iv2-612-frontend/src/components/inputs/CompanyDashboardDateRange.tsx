import { useState } from "react";
import DatePicker from "react-datepicker";

interface CompanyDashboardDateRangeProps {
	startTime: string;
	endTime: string;
	onChange: (value: { startTime: string; endTime: string }) => void;
	formatDate: (date: Date) => string;
	className?: string;
	minDate?: Date;
}

const formatISODate = (date: Date) => date.toISOString().split("T")[0];
const DEFAULT_MIN_DATE = new Date("2023-01-01T00:00:00");

const CompanyDashboardDateRange = ({
	startTime,
	endTime,
	onChange,
	formatDate,
	className = "",
	minDate = DEFAULT_MIN_DATE,
}: CompanyDashboardDateRangeProps) => {
	const [startPickerMode, setStartPickerMode] = useState<
		"date" | "year" | "month"
	>("date");
	const [endPickerMode, setEndPickerMode] = useState<"date" | "year" | "month">(
		"date",
	);

	const startDate = startTime ? new Date(startTime) : null;
	const endDate = endTime ? new Date(endTime) : null;
	const normalizedMinDate = minDate;
	const openStartDate =
		startDate && startDate > normalizedMinDate ? startDate : normalizedMinDate;
	const openEndDate =
		endDate && endDate > normalizedMinDate ? endDate : openStartDate;
	const endPickerMinDate =
		startDate && startDate > normalizedMinDate ? startDate : normalizedMinDate;
	const isAtMinMonth = (date: Date) =>
		date.getFullYear() === normalizedMinDate.getFullYear() &&
		date.getMonth() === normalizedMinDate.getMonth();

	return (
		<div className={`flex items-center gap-2 ${className}`}>
			<div style={{ width: "fit-content" }}>
				<DatePicker
					customInput={
						<button
							className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 bg-white cursor-pointer hover:border-[#148696] transition-colors"
							type="button"
						>
							<svg
								className="w-4 h-4 text-gray-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
								/>
							</svg>
							<span className="text-sm font-medium text-gray-600">
								{startDate ? formatDate(startDate) : "Select start date"}
							</span>
						</button>
					}
					endDate={endDate || undefined}
					maxDate={new Date()}
					minDate={normalizedMinDate}
					onChange={(date) => {
						if (!date) return;
						if (startPickerMode === "year") {
							setStartPickerMode("month");
							return;
						}
						if (startPickerMode === "month") {
							onChange({
								startTime: formatISODate(date),
								endTime,
							});
							setStartPickerMode("date");
							return;
						}
						onChange({
							startTime: formatISODate(date),
							endTime,
						});
						setStartPickerMode("date");
					}}
					openToDate={openStartDate}
					renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => (
						<div className="react-datepicker-custom-header flex items-center justify-between px-3 py-2">
							<button
								aria-label="Previous month"
								className="react-datepicker-custom-nav disabled:cursor-not-allowed disabled:opacity-30"
								disabled={isAtMinMonth(date)}
								onClick={decreaseMonth}
								type="button"
							>
								‹
							</button>
							<div className="flex items-center gap-2 justify-center">
								<span className="react-datepicker__current-month">
									{date.toLocaleString(undefined, { month: "long" })}
								</span>
								<button
									className="react-datepicker__year-toggle"
									onClick={() => setStartPickerMode("year")}
									type="button"
								>
									{date.getFullYear()}
								</button>
							</div>
							<button
								aria-label="Next month"
								className="react-datepicker-custom-nav"
								onClick={increaseMonth}
								type="button"
							>
								›
							</button>
						</div>
					)}
					selected={startDate || undefined}
					selectsStart
					shouldCloseOnSelect={startPickerMode === "date"}
					showMonthYearPicker={startPickerMode === "month"}
					showYearPicker={startPickerMode === "year"}
					startDate={startDate || undefined}
				/>
			</div>
			<span className="text-gray-400 font-bold">-</span>
			<div style={{ width: "fit-content" }}>
				<DatePicker
					customInput={
						<button
							className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 bg-white cursor-pointer hover:border-[#148696] transition-colors"
							type="button"
						>
							<svg
								className="w-4 h-4 text-gray-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
								/>
							</svg>
							<span className="text-sm font-medium text-gray-600">
								{endDate ? formatDate(endDate) : "Select end date"}
							</span>
						</button>
					}
					endDate={endDate || undefined}
					maxDate={new Date()}
					minDate={endPickerMinDate}
					onChange={(date) => {
						if (!date) return;
						if (endPickerMode === "year") {
							setEndPickerMode("month");
							return;
						}
						if (endPickerMode === "month") {
							onChange({
								startTime,
								endTime: formatISODate(date),
							});
							setEndPickerMode("date");
							return;
						}
						onChange({
							startTime,
							endTime: formatISODate(date),
						});
						setEndPickerMode("date");
					}}
					openToDate={openEndDate}
					renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => (
						<div className="react-datepicker-custom-header flex items-center justify-between px-3 py-2">
							<button
								aria-label="Previous month"
								className="react-datepicker-custom-nav disabled:cursor-not-allowed disabled:opacity-30"
								disabled={isAtMinMonth(date)}
								onClick={decreaseMonth}
								type="button"
							>
								‹
							</button>
							<div className="flex items-center gap-2 justify-center">
								<span className="react-datepicker__current-month">
									{date.toLocaleString(undefined, { month: "long" })}
								</span>
								<button
									className="react-datepicker__year-toggle"
									onClick={() => setEndPickerMode("year")}
									type="button"
								>
									{date.getFullYear()}
								</button>
							</div>
							<button
								aria-label="Next month"
								className="react-datepicker-custom-nav"
								onClick={increaseMonth}
								type="button"
							>
								›
							</button>
						</div>
					)}
					selected={endDate || undefined}
					selectsEnd
					shouldCloseOnSelect={endPickerMode === "date"}
					showMonthYearPicker={endPickerMode === "month"}
					showYearPicker={endPickerMode === "year"}
					startDate={startDate || undefined}
				/>
			</div>
		</div>
	);
};

export default CompanyDashboardDateRange;
