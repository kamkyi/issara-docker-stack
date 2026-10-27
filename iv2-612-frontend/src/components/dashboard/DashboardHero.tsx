import { useState } from "react";
import DatePicker from "react-datepicker";
import { useTranslation } from "react-i18next";

interface DashboardHeroProps {
	startDate: Date;
	endDate: Date;
	setStartDate: (d: Date) => void;
	setEndDate: (d: Date) => void;
	formatDate: (d: Date) => string;
	handleReset: () => void;
	/** When provided, overrides the default HRDD title. */
	titleOverride?: string;
	/** When provided, overrides the default HRDD subtitle. */
	subtitleOverride?: string;
	/** When provided, overrides the default HRDD description text. */
	descriptionOverride?: string;
}

const DashboardHero = ({
	startDate,
	endDate,
	setStartDate,
	setEndDate,
	formatDate,
	handleReset,
	titleOverride,
	subtitleOverride,
	descriptionOverride,
}: DashboardHeroProps) => {
	const { t, i18n } = useTranslation();

	const defaultTitle = "Human Rights Due Diligence (HRDD) Overview";
	const defaultSubtitle =
		"6 components of HRDD, driven by real-time worker voice";
	const translatedTitle = t("companyDashboard.hero.title", {
		defaultValue: defaultTitle,
	});
	const translatedSubtitle = t("companyDashboard.hero.subtitle", {
		defaultValue: defaultSubtitle,
	});
	// The runtime translation database may lag behind the committed locale and
	// still contain the former generic dashboard copy. Keep this HRDD-only hero
	// meaningful while allowing current and non-English translations through.
	const displayTitle = titleOverride
		? titleOverride
		: translatedTitle === "Company Dashboard" ||
				translatedTitle === "companyDashboard.hero.title"
			? defaultTitle
			: translatedTitle;
	const displaySubtitle = subtitleOverride
		? subtitleOverride
		: translatedSubtitle === "Key Real-time Metrics of Your Supply Chain" ||
				translatedSubtitle === "companyDashboard.hero.subtitle"
			? defaultSubtitle
			: translatedSubtitle;
	const [startPickerMode, setStartPickerMode] = useState<
		"date" | "year" | "month"
	>("date");
	const [endPickerMode, setEndPickerMode] = useState<"date" | "year" | "month">(
		"date",
	);
	return (
		<div className="container mx-auto px-4 mt-8 mb-4">
			<div className="flex flex-col gap-2">
				<div
					className="print-only"
					style={{
						borderBottom: "2px solid #148696",
						marginBottom: "4mm",
						paddingBottom: "3mm",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "flex-end",
						}}
					>
						<div>
							<div
								style={{
									fontSize: "18pt",
									fontWeight: 900,
									color: "#111827",
									lineHeight: 1.2,
								}}
							>
								{displayTitle}
							</div>
							<div
								style={{
									fontSize: "10pt",
									color: "#4B5563",
									marginTop: "1mm",
								}}
							>
								{displaySubtitle}
							</div>
						</div>
						<div
							style={{
								textAlign: "right",
								fontSize: "9pt",
								color: "#6B7280",
							}}
						>
							<div>
								{t("companyDashboard.hero.reportPeriod")}:{" "}
								<strong style={{ color: "#111827" }}>
									{formatDate(startDate)} – {formatDate(endDate)}
								</strong>
							</div>
							<div>
								{t("companyDashboard.hero.generated")}:{" "}
								{new Date().toLocaleDateString(i18n.language, {
									day: "2-digit",
									month: "short",
									year: "numeric",
								})}
							</div>
						</div>
					</div>
				</div>

				<h1 className="heading-display text-4xl md:text-5xl text-[#333333] uppercase tracking-tight no-print">
					{displayTitle}
				</h1>
				<h3 className="text-xl md:text-2xl font-bold text-[#333333] mb-6 no-print">
					{displaySubtitle}
				</h3>
				<p className="text-gray-700 text-sm md:text-base mb-4 no-print">
					{descriptionOverride ?? t("companyDashboard.hero.description")}
				</p>

				{/* Filters */}
				<div className="flex items-center justify-between gap-2 mb-8 no-print">
					<div className="flex items-center gap-2 no-print">
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
											{formatDate(startDate)}
										</span>
									</button>
								}
								endDate={endDate}
								maxDate={endDate}
								onChange={(date) => {
									if (!date) return;
									if (startPickerMode === "year") {
										// Year picked -> show month picker for that year
										setStartPickerMode("month");
										return;
									}
									if (startPickerMode === "month") {
										// Month picked -> set date (month start) and return to date picker
										setStartDate(date);
										setStartPickerMode("date");
										return;
									}
									// Normal date selection
									setStartDate(date);
									setStartPickerMode("date");
								}}
								renderCustomHeader={({
									date,
									decreaseMonth,
									increaseMonth,
								}) => (
									<div className="react-datepicker-custom-header flex items-center justify-between px-3 py-2">
										<button
											aria-label={t("companyDashboard.hero.previousMonth")}
											className="react-datepicker-custom-nav"
											onClick={decreaseMonth}
											type="button"
										>
											‹
										</button>
										<div className="flex items-center gap-2 justify-center">
											<span className="react-datepicker__current-month">
												{date.toLocaleString(i18n.language, { month: "long" })}
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
											aria-label={t("companyDashboard.hero.nextMonth")}
											className="react-datepicker-custom-nav"
											onClick={increaseMonth}
											type="button"
										>
											›
										</button>
									</div>
								)}
								selected={startDate}
								selectsStart
								shouldCloseOnSelect={startPickerMode === "date"}
								showMonthYearPicker={startPickerMode === "month"}
								showYearPicker={startPickerMode === "year"}
								startDate={startDate}
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
											{formatDate(endDate)}
										</span>
									</button>
								}
								endDate={endDate}
								minDate={startDate}
								onChange={(date) => {
									if (!date) return;
									if (endPickerMode === "year") {
										// Year picked -> show month picker for that year
										setEndPickerMode("month");
										return;
									}
									if (endPickerMode === "month") {
										// Month picked -> set date (month start) and return to date picker
										setEndDate(date);
										setEndPickerMode("date");
										return;
									}
									// Normal date selection
									setEndDate(date);
									setEndPickerMode("date");
								}}
								renderCustomHeader={({
									date,
									decreaseMonth,
									increaseMonth,
								}) => (
									<div className="react-datepicker-custom-header flex items-center justify-between px-3 py-2">
										<button
											aria-label={t("companyDashboard.hero.previousMonth")}
											className="react-datepicker-custom-nav"
											onClick={decreaseMonth}
											type="button"
										>
											‹
										</button>
										<div className="flex items-center gap-3">
											<span className="react-datepicker__current-month">
												{date.toLocaleString(i18n.language, { month: "long" })}
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
											aria-label={t("companyDashboard.hero.nextMonth")}
											className="react-datepicker-custom-nav"
											onClick={increaseMonth}
											type="button"
										>
											›
										</button>
									</div>
								)}
								selected={endDate}
								selectsEnd
								shouldCloseOnSelect={endPickerMode === "date"}
								showMonthYearPicker={endPickerMode === "month"}
								showYearPicker={endPickerMode === "year"}
								startDate={startDate}
							/>
						</div>
						<div className="flex items-center gap-2 ml-4">
							<button
								className="text-sm font-medium text-gray-700 hover:text-[#148696] transition-colors cursor-pointer"
								onClick={handleReset}
								type="button"
							>
								{t("companyDashboard.hero.reset")}
							</button>
							<div
								className="w-10 h-5 bg-[#148696] rounded-full relative cursor-pointer"
								onClick={handleReset}
								onKeyDown={(e) => e.key === "Enter" && handleReset()}
							>
								<div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default DashboardHero;
