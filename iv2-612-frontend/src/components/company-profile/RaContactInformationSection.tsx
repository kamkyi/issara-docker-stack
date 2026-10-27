import { EnvelopeClosedIcon } from "@radix-ui/react-icons";
import { FieldLabel } from "$src/components/company-profile/FieldLabel";
import { SectionCard } from "$src/components/company-profile/SectionCard";
import { inputCls } from "$src/components/company-profile/styles";

export interface RaContactInformationValues {
	mainContactName: string;
	contactPhoneNumber: string;
	email: string;
	website: string;
	phoneNumbers: string;
	facebook: string;
	viber: string;
	line: string;
	zalo: string;
}

interface RaContactInformationSectionProps {
	value: RaContactInformationValues;
	onChange: (patch: Partial<RaContactInformationValues>) => void;
	onSave: () => void;
	onCancel: () => void;
	saving?: boolean;
	actionDisabled?: boolean;
	country?: string;
}

export default function RaContactInformationSection({
	value,
	onChange,
	onSave,
	onCancel,
	saving = false,
	actionDisabled = false,
	country,
}: RaContactInformationSectionProps) {
	const isVietnam = country === "Vietnam";

	return (
		<SectionCard
			actionDisabled={actionDisabled}
			editing
			icon={<EnvelopeClosedIcon className="text-[#148696] w-5 h-5" />}
			onCancel={onCancel}
			onSave={onSave}
			saveButtonText={saving ? "Saving..." : "Save"}
			title="Contact Information"
		>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
				<div>
					<FieldLabel isPublic label="Email" />
					<input
						className={inputCls}
						onChange={(e) => onChange({ email: e.target.value })}
						placeholder="info@example.com"
						type="email"
						value={value.email}
					/>
				</div>

				<div>
					<FieldLabel isPublic label="Website" />
					<input
						className={inputCls}
						onChange={(e) => onChange({ website: e.target.value })}
						placeholder="https://example.com"
						type="text"
						value={value.website}
					/>
				</div>

				<div className="md:col-span-2">
					<FieldLabel isPublic label="Phone Numbers" />
					<input
						className={inputCls}
						onChange={(e) => onChange({ phoneNumbers: e.target.value })}
						placeholder="+66812345678, +66898765432"
						type="text"
						value={value.phoneNumbers}
					/>
					<p className="text-xs text-gray-400 mt-1">Comma separated</p>
				</div>

				<div>
					<FieldLabel isPublic label="Facebook" />
					<input
						className={inputCls}
						onChange={(e) => onChange({ facebook: e.target.value })}
						placeholder="https://facebook.com/company"
						type="text"
						value={value.facebook}
					/>
				</div>

				<div>
					<FieldLabel label="Viber" />
					<input
						className={inputCls}
						onChange={(e) => onChange({ viber: e.target.value })}
						placeholder="+66812345678"
						type="text"
						value={value.viber}
					/>
				</div>

				<div>
					<FieldLabel label="Line" />
					<input
						className={inputCls}
						onChange={(e) => onChange({ line: e.target.value })}
						placeholder="@company"
						type="text"
						value={value.line}
					/>
				</div>

				{isVietnam && (
					<div>
						<FieldLabel label="Zalo" />
						<input
							className={inputCls}
							onChange={(e) => onChange({ zalo: e.target.value })}
							placeholder="+66812345678"
							type="text"
							value={value.zalo}
						/>
					</div>
				)}
			</div>
			<hr className="opacity-10 mt-5" />
			<div className="grid grid-cols-2 gap-5 mt-5">
				<div>
					<FieldLabel label="Main Contact Name" />
					<input
						className={inputCls}
						onChange={(e) => onChange({ mainContactName: e.target.value })}
						placeholder="e.g. Jane Doe"
						type="text"
						value={value.mainContactName}
					/>
				</div>

				<div>
					<FieldLabel label="Contact Phone Number" />
					<input
						className={inputCls}
						onChange={(e) => onChange({ contactPhoneNumber: e.target.value })}
						placeholder="+66812345678"
						type="text"
						value={value.contactPhoneNumber}
					/>
				</div>
			</div>
		</SectionCard>
	);
}
