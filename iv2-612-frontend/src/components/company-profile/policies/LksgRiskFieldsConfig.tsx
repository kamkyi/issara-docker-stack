import { CheckCircledIcon } from "@radix-ui/react-icons";
import { useId } from "react";
import { inputCls } from "$src/components/company-profile/styles";
import { type OptionType, useLksgRiskStore } from "$src/store/lksgRiskStore";

interface LksgRiskFieldsConfigProps {
	isEditing?: boolean;
}

const options: OptionType[] = [
	"Voluntary for direct and indirect suppliers",
	"Mandatory for direct and indirect suppliers",
];

function RadioField({
	isEditing,
	label,
	onSelect,
	value,
}: {
	isEditing: boolean;
	label: string;
	onSelect: (val: OptionType) => void;
	value: OptionType;
}) {
	return (
		<div>
			<div className="flex items-center justify-between mb-2">
				<span className="text-sm font-semibold text-[#333333]">{label}</span>
				{!isEditing && (
					<span className="text-xs text-[#8A979C]">
						Switch to Edit to modify
					</span>
				)}
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{options.map((opt) => {
					const isSelected = value === opt;
					return (
						<button
							className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 text-left text-sm transition-all duration-200 ${
								isSelected
									? "border-[#148696] bg-[#148696]/10 text-[#004A60] font-semibold shadow-xs"
									: "border-gray-200 bg-gray-50/50 text-[#56666C] hover:border-gray-300 hover:bg-gray-100/50"
							} ${!isEditing ? "opacity-90 cursor-default" : "cursor-pointer"}`}
							disabled={!isEditing}
							key={opt}
							onClick={() => isEditing && onSelect(opt)}
							type="button"
						>
							<span className="leading-snug">{opt}</span>
							<div
								className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
									isSelected
										? "border-[#148696] bg-[#148696] text-white"
										: "border-gray-300 bg-white"
								}`}
							>
								{isSelected && <CheckCircledIcon className="h-3.5 w-3.5" />}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}

export function LksgRiskFieldsConfig({
	isEditing = false,
}: LksgRiskFieldsConfigProps) {
	const {
		workerVoiceMechanism,
		remediationSupport,
		seniorManagementReportingConfirmed,
		seniorManagementReportingDate,
		setWorkerVoiceMechanism,
		setRemediationSupport,
		setSeniorManagementReportingConfirmed,
		setSeniorManagementReportingDate,
	} = useLksgRiskStore();

	const reportingCheckboxId = useId();
	const reportingDateId = useId();

	return (
		<div className="mb-5 rounded-xl border border-gray-100 bg-linear-to-b from-amber-50/30 to-amber-50/10 p-4 transition-all">
			{/* Section Header Removed */}

			<div className="flex flex-col gap-5">
				{/* Field 1: Worker Voice Mechanisms */}
				<RadioField
					isEditing={isEditing}
					label="CASCADE Worker Voice Mechanisms"
					onSelect={setWorkerVoiceMechanism}
					value={workerVoiceMechanism}
				/>

				{/* Field 2: Remediation Support */}
				<RadioField
					isEditing={isEditing}
					label="CASCADE Remediation Support"
					onSelect={setRemediationSupport}
					value={remediationSupport}
				/>

				{/* Field 3: Reporting to senior management */}
				<div>
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-semibold text-[#333333]">
							Reporting to senior management
						</span>
						{!isEditing && (
							<span className="text-xs text-[#8A979C]">
								Switch to Edit to modify
							</span>
						)}
					</div>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<label
							className={`flex items-center gap-2 text-sm text-[#56666C] ${
								isEditing ? "cursor-pointer" : "cursor-default"
							}`}
							htmlFor={reportingCheckboxId}
						>
							<input
								checked={seniorManagementReportingConfirmed}
								className="h-4 w-4 accent-[#148696]"
								disabled={!isEditing}
								id={reportingCheckboxId}
								onChange={(e) =>
									setSeniorManagementReportingConfirmed(e.target.checked)
								}
								type="checkbox"
							/>
							Reporting to senior management is in place
						</label>
						<div className="sm:flex-1">
							<label className="sr-only" htmlFor={reportingDateId}>
								Date of last report to senior management
							</label>
							<input
								className={inputCls}
								disabled={!isEditing || !seniorManagementReportingConfirmed}
								id={reportingDateId}
								onChange={(e) =>
									setSeniorManagementReportingDate(e.target.value)
								}
								type="date"
								value={seniorManagementReportingDate}
							/>
						</div>
					</div>
					<p className="mt-1.5 text-xs text-[#8A979C]">
						Date is optional — checking the box marks this requirement as
						complete.
					</p>
				</div>
			</div>
		</div>
	);
}
