import * as Icons from "@mui/icons-material";
import { Dialog } from "@radix-ui/themes";
import { useMutation } from "@tanstack/react-query";
import moment from "moment";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { scheduleService } from "$src/services/scheduleService";
import {
	getActiveSupplierId,
	getPartnerId,
	getSubmittedByUserId,
} from "$src/utils/auth-utils";

const ACCENT = "#2f6b52";
const WEEKDAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const TIME_SLOTS = [
	"09:00 AM",
	"09:30 AM",
	"10:00 AM",
	"10:30 AM",
	"11:00 AM",
	"11:30 AM",
	"01:00 PM",
	"01:30 PM",
	"02:00 PM",
	"02:30 PM",
	"03:00 PM",
	"03:30 PM",
];

const atMidnight = (date: Date) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate());

const isSameDay = (a: Date | null, b: Date | null) =>
	!!a && !!b && a.getTime() === b.getTime();

const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

interface ScheduleModalProps {
	item: any | null;
	onClose: () => void;
}

export function ScheduleModal({ item, onClose }: ScheduleModalProps) {
	const { t } = useTranslation();
	const uid = useId();

	// Earliest bookable date: 2 weeks from today, working days (Mon-Fri) only.
	const earliestAvailableDate = useMemo(() => {
		const date = atMidnight(new Date());
		date.setDate(date.getDate() + 14);
		while (isWeekend(date)) date.setDate(date.getDate() + 1);
		return date;
	}, []);

	const [viewMonth, setViewMonth] = useState(
		() =>
			new Date(
				earliestAvailableDate.getFullYear(),
				earliestAvailableDate.getMonth(),
				1,
			),
	);
	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [company, setCompany] = useState("");
	const [preferredDate, setPreferredDate] = useState<Date | null>(null);
	const [preferredTime, setPreferredTime] = useState<string | null>(null);
	const [submitted, setSubmitted] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const reset = () => {
		setFullName("");
		setEmail("");
		setCompany("");
		setPreferredDate(null);
		setPreferredTime(null);
		setViewMonth(
			new Date(
				earliestAvailableDate.getFullYear(),
				earliestAvailableDate.getMonth(),
				1,
			),
		);
		setSubmitted(false);
		setSubmitError(null);
	};

	const handleClose = () => {
		onClose();
		reset();
	};

	const submitMutation = useMutation({
		mutationFn: () =>
			scheduleService.submit({
				solution_id: item.id,
				supplier_id: getActiveSupplierId(),
				partner_id: getPartnerId(),
				submitted_by_user_id: getSubmittedByUserId(),
				full_name: fullName.trim(),
				email: email.trim(),
				company: company.trim() || undefined,
				preferred_date: moment(preferredDate).format("YYYY-MM-DD"),
				preferred_time: preferredTime ?? "",
			}),
		onSuccess: () => setSubmitted(true),
		onError: () =>
			setSubmitError(
				"Something went wrong submitting your schedule request. Please try again.",
			),
	});

	const isDateUnavailable = (date: Date) =>
		date.getTime() < earliestAvailableDate.getTime() || isWeekend(date);

	const canGoToPreviousMonth =
		viewMonth.getFullYear() > earliestAvailableDate.getFullYear() ||
		(viewMonth.getFullYear() === earliestAvailableDate.getFullYear() &&
			viewMonth.getMonth() > earliestAvailableDate.getMonth());

	const goToPreviousMonth = () =>
		setViewMonth(
			(prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
		);
	const goToNextMonth = () =>
		setViewMonth(
			(prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
		);

	const calendarCells = useMemo(() => {
		const daysInMonth = new Date(
			viewMonth.getFullYear(),
			viewMonth.getMonth() + 1,
			0,
		).getDate();
		const startWeekday = viewMonth.getDay();
		const cells: (Date | null)[] = Array(startWeekday).fill(null);
		for (let day = 1; day <= daysInMonth; day++) {
			cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
		}
		return cells;
	}, [viewMonth]);

	const today = useMemo(() => atMidnight(new Date()), []);
	const formattedEarliest = moment(earliestAvailableDate).format(
		"dddd, D MMMM YYYY",
	);
	const canSubmit =
		!!preferredDate && !!preferredTime && !!fullName.trim() && !!email.trim();

	return (
		<Dialog.Root onOpenChange={(open) => !open && handleClose()} open={!!item}>
			<Dialog.Content className="rounded-2xl" maxWidth="40%">
				<div className="flex items-start justify-between">
					<Dialog.Title>Schedule a Session</Dialog.Title>
					<Dialog.Close>
						<button
							aria-label="Close"
							className="text-gray-400 hover:text-gray-600"
							onClick={handleClose}
							type="button"
						>
							<Icons.Close style={{ fontSize: 20 }} />
						</button>
					</Dialog.Close>
				</div>
				<Dialog.Description className="text-sm text-gray-500 mb-2">
					Book a date for your on-site activity. Earliest available is{" "}
					<strong>{formattedEarliest}</strong>.
				</Dialog.Description>

				{submitted ? (
					<div className="py-8 text-center space-y-4">
						<Icons.CheckCircle
							className="text-green-500 mx-auto"
							style={{ fontSize: 56 }}
						/>
						<h4 className="font-bold text-[#004A60] text-lg">
							{t("cascadeMarketplace.plan.modal.scheduleSubmittedTitle")}
						</h4>
						<p className="text-gray-500 text-sm">
							{t("cascadeMarketplace.plan.modal.scheduleSubmittedMessage")}
						</p>
						<Dialog.Close>
							<button
								className="mt-2 text-white px-6 py-2 rounded-lg font-bold text-sm"
								onClick={handleClose}
								style={{ backgroundColor: ACCENT }}
								type="button"
							>
								Done
							</button>
						</Dialog.Close>
					</div>
				) : (
					<div className="mt-4 space-y-4">
						<div className="grid grid-cols-2 space-x-4">
							<div>
								<label
									className="text-sm font-bold text-gray-700 block mb-1"
									htmlFor={`${uid}-fullname`}
								>
									Full Name <span className="text-[#FB8379]">*</span>
								</label>
								<input
									className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]"
									id={`${uid}-fullname`}
									onChange={(e) => setFullName(e.target.value)}
									placeholder="Your name"
									type="text"
									value={fullName}
								/>
							</div>

							<div>
								<label
									className="text-sm font-bold text-gray-700 block mb-1"
									htmlFor={`${uid}-email`}
								>
									Email <span className="text-[#FB8379]">*</span>
								</label>
								<input
									className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]"
									id={`${uid}-email`}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="your@email.com"
									type="email"
									value={email}
								/>
							</div>
						</div>

						<div>
							<label
								className="text-sm font-bold text-gray-700 block mb-1"
								htmlFor={`${uid}-company`}
							>
								Company
							</label>
							<input
								className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]"
								id={`${uid}-company`}
								onChange={(e) => setCompany(e.target.value)}
								placeholder="Company name"
								type="text"
								value={company}
							/>
						</div>

						<div>
							<label
								className="text-sm font-bold text-gray-700 block mb-1"
								htmlFor="#"
							>
								Preferred Date <span className="text-[#FB8379]">*</span>
							</label>
							<p className="text-xs text-gray-400 mb-2">
								Dates available from <strong>{formattedEarliest}</strong>{" "}
								onwards.
							</p>

							<div className="border border-gray-200 rounded-xl overflow-hidden">
								<div className="flex items-center justify-between px-3 py-2 bg-gray-50">
									<button
										aria-label="Previous month"
										className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
										disabled={!canGoToPreviousMonth}
										onClick={goToPreviousMonth}
										type="button"
									>
										<Icons.ChevronLeft style={{ fontSize: 20 }} />
									</button>
									<p className="text-sm font-bold text-[#004A60]">
										{moment(viewMonth).format("MMMM YYYY")}
									</p>
									<button
										aria-label="Next month"
										className="text-gray-400 hover:text-gray-600"
										onClick={goToNextMonth}
										type="button"
									>
										<Icons.ChevronRight style={{ fontSize: 20 }} />
									</button>
								</div>

								<div className="grid grid-cols-7 text-center text-[10px] font-bold text-gray-400 px-2 pt-2">
									{WEEKDAY_LABELS.map((label) => (
										<div key={label}>{label}</div>
									))}
								</div>

								<div className="grid grid-cols-7 gap-y-1 text-center text-sm p-2">
									{calendarCells.map((date, index) => {
										if (!date) return <div key={`blank-${index}`} />;
										const unavailable = isDateUnavailable(date);
										const selected = isSameDay(date, preferredDate);
										const isToday = isSameDay(date, today);
										return (
											<button
												className="mx-auto w-8 h-8 rounded-full disabled:cursor-not-allowed disabled:text-gray-300 hover:bg-gray-100 disabled:hover:bg-transparent"
												disabled={unavailable}
												key={date.toISOString()}
												onClick={() => {
													if (!isSameDay(date, preferredDate)) {
														setPreferredTime(null);
													}
													setPreferredDate(date);
												}}
												style={
													selected
														? { backgroundColor: ACCENT, color: "white" }
														: isToday
															? { border: `1px solid ${ACCENT}` }
															: undefined
												}
												type="button"
											>
												{date.getDate()}
											</button>
										);
									})}
								</div>

								<div className="flex items-center gap-4 text-xs text-gray-500 px-3 py-2 border-t border-gray-100">
									<span className="flex items-center gap-1">
										<span
											className="w-3 h-3 rounded-full inline-block"
											style={{ border: `1px solid ${ACCENT}` }}
										/>
										Today
									</span>
									<span className="flex items-center gap-1">
										<span
											className="w-3 h-3 rounded-full inline-block"
											style={{ backgroundColor: ACCENT }}
										/>
										Selected
									</span>
									<span className="flex items-center gap-1">
										<span className="w-3 h-3 rounded-full inline-block bg-gray-200" />
										Unavailable
									</span>
								</div>
							</div>
						</div>

						{preferredDate && (
							<div>
								<label
									className="text-sm font-bold text-gray-700 block mb-1"
									htmlFor="#"
								>
									Preferred Time <span className="text-[#FB8379]">*</span>
								</label>
								<p className="text-xs text-gray-400 mb-2">
									All times are in your local timezone. The CASCADE team will
									confirm the final time.
								</p>
								<div className="grid grid-cols-4 gap-2">
									{TIME_SLOTS.map((slot) => {
										const selected = slot === preferredTime;
										return (
											<button
												className="border rounded-lg px-2 py-2 text-xs font-bold"
												key={slot}
												onClick={() => setPreferredTime(slot)}
												style={
													selected
														? {
																backgroundColor: ACCENT,
																borderColor: ACCENT,
																color: "white",
															}
														: { borderColor: "#e5e7eb", color: "#374151" }
												}
												type="button"
											>
												{slot}
											</button>
										);
									})}
								</div>
							</div>
						)}

						<div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
							{submitError && (
								<p className="text-sm text-red-500 text-right">{submitError}</p>
							)}
							<div className="flex gap-3 justify-end">
								<Dialog.Close>
									<button
										className="border border-gray-200 text-gray-500 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50"
										onClick={handleClose}
										type="button"
									>
										Cancel
									</button>
								</Dialog.Close>
								<button
									className="text-white px-6 py-2 rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
									disabled={!canSubmit || submitMutation.isPending}
									onClick={() => submitMutation.mutate()}
									style={{ backgroundColor: ACCENT }}
									type="button"
								>
									{submitMutation.isPending && (
										<Icons.HourglassTop style={{ fontSize: 14 }} />
									)}
									Submit Request
								</button>
							</div>
						</div>
					</div>
				)}
			</Dialog.Content>
		</Dialog.Root>
	);
}
