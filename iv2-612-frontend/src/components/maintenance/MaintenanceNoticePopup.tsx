import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import {
	formatLocalTimestamp,
	formatUtcTimestamp,
	type SystemMaintenanceStatus,
} from "$src/services/systemMaintenanceService";

interface MaintenanceNoticePopupProps {
	status: SystemMaintenanceStatus;
}

const STORAGE_KEY = "cascade_maintenance_notice_dismissed";

export function MaintenanceNoticePopup({
	status,
}: MaintenanceNoticePopupProps) {
	const [isOpen, setIsOpen] = useState(false);

	const noticeKey = `${status.start_time || "scheduled"}_${status.end_time || ""}`;

	useEffect(() => {
		if (!status.is_scheduled_notice_active) {
			setIsOpen(false);
			return;
		}

		try {
			const dismissedKey = sessionStorage.getItem(STORAGE_KEY);
			if (dismissedKey !== noticeKey) {
				setIsOpen(true);
			}
		} catch {
			setIsOpen(true);
		}
	}, [status.is_scheduled_notice_active, noticeKey]);

	const handleDismiss = () => {
		try {
			sessionStorage.setItem(STORAGE_KEY, noticeKey);
		} catch {
			// ignore storage errors
		}
		setIsOpen(false);
	};

	const formattedLocalStartTime = formatLocalTimestamp(status.start_time);
	const formattedUtcStartTime = formatUtcTimestamp(status.start_time);
	const formattedLocalEndTime = formatLocalTimestamp(status.end_time);
	const formattedUtcEndTime = formatUtcTimestamp(status.end_time);

	return (
		<Dialog.Root
			onOpenChange={(open) => !open && handleDismiss()}
			open={isOpen}
		>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in" />
				<Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-[#D2D2D2] animate-in fade-in zoom-in-95 focus:outline-none">
					{/* Header */}
					<div className="flex items-start justify-between gap-4 mb-4">
						<div className="flex items-center gap-3.5">
							<div className="w-11 h-11 rounded-xl bg-[#FFF8DE] border border-[#148696]/25 flex items-center justify-center text-[#148696] shrink-0 shadow-xs">
								<ExclamationTriangleIcon className="w-6 h-6 text-[#FB8379]" />
							</div>
							<div>
								<Dialog.Title className="font-heading text-lg sm:text-xl text-[#004A60] font-bold">
									Scheduled Maintenance Notice
								</Dialog.Title>
								<Dialog.Description className="text-xs text-[#8A979C] mt-0.5 font-sans">
									Please save your in-progress work ahead of time
								</Dialog.Description>
							</div>
						</div>
						<button
							aria-label="Close dialog"
							className="text-[#8A979C] hover:text-[#004A60] p-1.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
							onClick={handleDismiss}
							type="button"
						>
							<Cross2Icon className="w-5 h-5" />
						</button>
					</div>

					{/* Message Body */}
					<div className="text-sm text-[#56666C] leading-relaxed my-5 font-sans">
						{status.message ||
							"CASCADE will undergo scheduled maintenance during the window listed below. The platform will be temporarily offline while system enhancements are applied."}
					</div>

					{/* Schedule Details Card */}
					{(status.start_time || status.end_time) && (
						<div className="bg-[#FBF6EC] border border-[#D2D2D2] rounded-xl p-4 mb-6 space-y-3 font-sans">
							{status.start_time && (
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
									<span className="font-bold text-[#004A60] uppercase tracking-wide">
										Begins:
									</span>
									<span className="font-semibold text-[#333333] sm:text-right">
										{formattedLocalStartTime}{" "}
										{formattedUtcStartTime && (
											<span className="text-[#8A979C] font-normal">
												({formattedUtcStartTime})
											</span>
										)}
									</span>
								</div>
							)}
							{status.end_time && (
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
									<span className="font-bold text-[#148696] uppercase tracking-wide">
										Back Online:
									</span>
									<span className="font-bold text-[#148696] sm:text-right">
										{formattedLocalEndTime}{" "}
										{formattedUtcEndTime && (
											<span className="text-[#8A979C] font-normal">
												({formattedUtcEndTime})
											</span>
										)}
									</span>
								</div>
							)}
						</div>
					)}

					{/* Actions */}
					<div className="flex justify-end items-center gap-3 pt-1">
						<button
							className="px-6 py-2.5 rounded-xl bg-[#148696] hover:bg-[#0f6f7c] text-white font-bold text-sm shadow-sm hover:shadow-md transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
							onClick={handleDismiss}
							type="button"
						>
							Got it, thank you
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

export function TopMaintenanceBanner({
	status,
}: {
	status: SystemMaintenanceStatus;
}) {
	const [isDismissed, setIsDismissed] = useState(false);

	if (!status.is_scheduled_notice_active || isDismissed) {
		return null;
	}

	const formattedLocalStartTime = formatLocalTimestamp(status.start_time);
	const formattedLocalEndTime = formatLocalTimestamp(status.end_time);

	return (
		<div className="w-full min-w-full bg-[#FFF8DE] border-b border-[#F2DE9C] text-[#004A60] px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium shadow-xs sticky top-0 left-0 right-0 z-50">
			<div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-4">
				<div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
					<span className="inline-flex items-center gap-1.5 bg-[#004A60] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 tracking-wide">
						<span className="flex h-1.5 w-1.5 rounded-full bg-[#FB8379] animate-pulse" />
						NOTICE
					</span>
					<span className="truncate text-[#333333]">
						<strong className="text-[#004A60] font-bold">
							Maintenance Notice:
						</strong>{" "}
						CASCADE will undergo scheduled maintenance{" "}
						{status.start_time ? `starting ${formattedLocalStartTime}` : "soon"}
						{status.end_time ? ` until ${formattedLocalEndTime}` : ""}.
					</span>
				</div>
				<button
					aria-label="Dismiss banner"
					className="text-[#004A60]/70 hover:text-[#004A60] hover:bg-[#F2DE9C]/60 p-1.5 rounded-lg transition-colors shrink-0 focus:outline-none"
					onClick={() => setIsDismissed(true)}
					type="button"
				>
					<Cross2Icon className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
}
