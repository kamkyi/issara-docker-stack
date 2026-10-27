import { CheckCircledIcon } from "@radix-ui/react-icons";
import { Button, Select, Text, TextArea, TextField } from "@radix-ui/themes";
import { type FormEvent, useId, useMemo, useState } from "react";
import {
	type AccessRequestOrgType,
	useSubmitAccessRequest,
} from "$src/queries/accessRequests";
import { getAuthUser } from "$src/utils/auth-utils";

const ORG_TYPE_OPTIONS: { value: AccessRequestOrgType; label: string }[] = [
	{ value: "global_partner", label: "Global Buyer / Brand / Retailer" },
	{ value: "supplier", label: "Supplier" },
	{ value: "recruiter", label: "Recruitment Agency" },
	{ value: "certification_body", label: "Certification Body / Rating Agency" },
	{ value: "philanthropic_donor", label: "Philanthropic Donor" },
	{ value: "cso_ngo", label: "CSO / NGO" },
	{ value: "other", label: "Other" },
];

/**
 * Friendly access-request form shown on the Unauthorized page so non
 * pre-approved users can send their details to the Issara team for review
 * (see cascade-api /access-requests and the ILM Management review panel).
 */
const AccessRequestForm = ({ onSuccess }: { onSuccess?: () => void }) => {
	const prefilledEmail = useMemo(() => getAuthUser()?.email ?? "", []);
	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState(prefilledEmail);
	const [title, setTitle] = useState("");
	const [organizationName, setOrganizationName] = useState("");
	const [companyWebsite, setCompanyWebsite] = useState("");
	const [organizationType, setOrganizationType] = useState<
		AccessRequestOrgType | ""
	>("");
	const [hearAboutUs, setHearAboutUs] = useState("");
	const [roleOrReason, setRoleOrReason] = useState("");
	const [agreed, setAgreed] = useState(false);
	const [emailError, setEmailError] = useState("");
	const [websiteError, setWebsiteError] = useState("");

	const { mutate, isPending, isSuccess, isError } = useSubmitAccessRequest();

	const idFullName = useId();
	const idEmail = useId();
	const idTitle = useId();
	const idOrgName = useId();
	const idWebsite = useId();
	const idHearAbout = useId();
	const idRole = useId();
	const idAgree = useId();

	const handleEmailBlur = () => {
		if (!email.trim()) return;
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email.trim())) {
			setEmailError("Please enter a valid work email address.");
		} else {
			setEmailError("");
		}
	};

	const handleWebsiteBlur = () => {
		if (!companyWebsite.trim()) {
			setWebsiteError("");
			return;
		}
		const websiteRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w\-./?%&=]*)?$/i;
		if (!websiteRegex.test(companyWebsite.trim())) {
			setWebsiteError("Please enter a valid website URL.");
		} else {
			setWebsiteError("");
		}
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setEmailError("");
		setWebsiteError("");

		if (!organizationType || !agreed) return;

		let hasError = false;

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email.trim())) {
			setEmailError("Please enter a valid work email address.");
			hasError = true;
		}

		if (companyWebsite.trim()) {
			const websiteRegex =
				/^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w\-./?%&=]*)?$/i;
			if (!websiteRegex.test(companyWebsite.trim())) {
				setWebsiteError("Please enter a valid website URL.");
				hasError = true;
			}
		}

		if (hasError) return;

		mutate(
			{
				fullName: fullName.trim(),
				email: email.trim(),
				title: title.trim(),
				companyWebsite: companyWebsite.trim(),
				hearAboutUs: hearAboutUs.trim(),
				organizationName: organizationName.trim(),
				organizationType,
				roleOrReason: roleOrReason.trim(),
			},
			{ onSuccess: () => onSuccess?.() },
		);
	};

	if (isSuccess) {
		return (
			<div className="flex-1 flex flex-col justify-center text-left">
				<div className="mb-3 flex items-center gap-2">
					<CheckCircledIcon color="#148696" height="28" width="28" />
					<Text
						as="div"
						className="text-2xl md:text-3xl font-bold uppercase tracking-wide"
						style={{
							fontFamily: '"Fugaz One", sans-serif',
							color: "var(--color-ink)",
						}}
					>
						Request received
					</Text>
				</div>
				<Text className="block" size="2" style={{ color: "var(--color-body)" }}>
					Thanks for reaching out. CASCADE team will verify your request and get
					back to you via email within 7 working days. We look forward to
					connecting with you soon.
				</Text>
			</div>
		);
	}

	return (
		<form className="text-left flex flex-col w-full" onSubmit={handleSubmit}>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
				<div className="mb-2">
					<Text
						as="div"
						mb="1"
						size="2"
						style={{ color: "#333333" }}
						weight="bold"
					>
						Full Name <span style={{ color: "#d1046b" }}>*</span>
					</Text>
					<TextField.Root
						id={idFullName}
						onChange={(e) => setFullName(e.target.value)}
						placeholder="Your full name"
						required
						size="2"
						value={fullName}
					/>
				</div>

				<div className="mb-2">
					<Text
						as="div"
						mb="1"
						size="2"
						style={{ color: "#333333" }}
						weight="bold"
					>
						Work Email <span style={{ color: "#d1046b" }}>*</span>
					</Text>
					<TextField.Root
						id={idEmail}
						onBlur={handleEmailBlur}
						onChange={(e) => {
							setEmail(e.target.value);
							if (emailError) setEmailError("");
						}}
						placeholder="you@company.com"
						required
						size="2"
						type="email"
						value={email}
					/>
					{emailError && (
						<Text className="mt-1 block" color="red" size="1">
							{emailError}
						</Text>
					)}
				</div>

				<div className="mb-2">
					<Text
						as="div"
						mb="1"
						size="2"
						style={{ color: "#333333" }}
						weight="bold"
					>
						Title <span style={{ color: "#d1046b" }}>*</span>
					</Text>
					<TextField.Root
						id={idTitle}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="e.g. Sustainability Manager"
						required
						size="2"
						value={title}
					/>
				</div>

				<div className="mb-2">
					<Text
						as="div"
						mb="1"
						size="2"
						style={{ color: "#333333" }}
						weight="bold"
					>
						Affiliation / Company <span style={{ color: "#d1046b" }}>*</span>
					</Text>
					<TextField.Root
						id={idOrgName}
						onChange={(e) => setOrganizationName(e.target.value)}
						placeholder="Company or organisation name"
						required
						size="2"
						value={organizationName}
					/>
				</div>

				<div className="mb-2">
					<Text
						as="div"
						mb="1"
						size="2"
						style={{ color: "#333333" }}
						weight="bold"
					>
						Affiliation / Company Website
					</Text>
					<TextField.Root
						id={idWebsite}
						onBlur={handleWebsiteBlur}
						onChange={(e) => {
							setCompanyWebsite(e.target.value);
							if (websiteError) setWebsiteError("");
						}}
						placeholder="https://yourcompany.com"
						size="2"
						value={companyWebsite}
					/>
					{websiteError && (
						<Text className="mt-1 block" color="red" size="1">
							{websiteError}
						</Text>
					)}
				</div>

				<div className="mb-2">
					<Text
						as="div"
						mb="1"
						size="2"
						style={{ color: "#333333" }}
						weight="bold"
					>
						Affiliation / Company Category{" "}
						<span style={{ color: "#d1046b" }}>*</span>
					</Text>
					<Select.Root
						onValueChange={(v) =>
							setOrganizationType(v as AccessRequestOrgType)
						}
						required
						size="2"
						value={organizationType}
					>
						<Select.Trigger
							placeholder="Select a category"
							style={{ width: "100%" }}
						/>
						<Select.Content>
							{ORG_TYPE_OPTIONS.map((opt) => (
								<Select.Item
									className="data-[highlighted]:!bg-[#FFF8DE] data-[highlighted]:!text-[#004A60]"
									key={opt.value}
									value={opt.value}
								>
									{opt.label}
								</Select.Item>
							))}
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<div className="mb-2">
				<Text
					as="div"
					mb="1"
					size="2"
					style={{ color: "#333333" }}
					weight="bold"
				>
					How did you hear about us? <span style={{ color: "#d1046b" }}>*</span>
				</Text>
				<TextField.Root
					id={idHearAbout}
					onChange={(e) => setHearAboutUs(e.target.value)}
					placeholder="e.g. colleague, conference, social media.."
					required
					size="2"
					value={hearAboutUs}
				/>
			</div>

			<div className="mb-3">
				<Text
					as="div"
					mb="1"
					size="2"
					style={{ color: "#333333" }}
					weight="bold"
				>
					Specific Interests / Reasons for Requesting Access{" "}
					<span style={{ color: "#d1046b" }}>*</span>
				</Text>
				<TextArea
					id={idRole}
					onChange={(e) => setRoleOrReason(e.target.value)}
					placeholder="Tell us why you'd like access to CASCADE and what you hope to achieve..."
					required
					rows={2}
					size="2"
					value={roleOrReason}
				/>
			</div>

			<div className="mb-3 flex items-start gap-2">
				<input
					checked={agreed}
					className="mt-1"
					id={idAgree}
					onChange={(e) => setAgreed(e.target.checked)}
					required
					type="checkbox"
				/>
				<label
					className="text-xs"
					htmlFor={idAgree}
					style={{ color: "var(--color-body)" }}
				>
					By submitting this form, you agree with our{" "}
					<a
						className="underline"
						href="/privacy-policy"
						rel="noopener noreferrer"
						target="_blank"
					>
						Privacy Policy
					</a>
					.
				</label>
			</div>

			{isError && (
				<Text className="mb-2 block" color="red" size="2">
					Something went wrong sending your request. Please try again.
				</Text>
			)}

			<Button
				className="w-full transition-colors duration-200 mt-1"
				disabled={isPending || !agreed || !organizationType}
				onMouseEnter={(e) => {
					if (!e.currentTarget.disabled) {
						e.currentTarget.style.backgroundColor = "#00516A";
					}
				}}
				onMouseLeave={(e) => {
					if (!e.currentTarget.disabled) {
						e.currentTarget.style.backgroundColor = "#148696";
					}
				}}
				size="2"
				style={{
					backgroundColor:
						isPending || !agreed || !organizationType
							? "var(--color-border)"
							: "#148696",
					color:
						isPending || !agreed || !organizationType
							? "var(--color-caption)"
							: "#ffffff",
				}}
				type="submit"
			>
				{isPending ? "Sending…" : "Send request"}
			</Button>
		</form>
	);
};

export default AccessRequestForm;
