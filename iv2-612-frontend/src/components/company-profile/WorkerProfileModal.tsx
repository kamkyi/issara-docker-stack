import { Cross2Icon } from "@radix-ui/react-icons";
import { useId } from "react";
import type {
	WorkerProfileChoice,
	WorkerProfileDetail,
} from "$src/utils/workerVerification";

interface WorkerProfileModalProps {
	error?: boolean;
	isLoading?: boolean;
	onClose: () => void;
	open: boolean;
	worker?: WorkerProfileDetail | null;
}

const emptyValue = "Not provided";

const formatValue = (value?: string | number | null) => {
	if (value === null || value === undefined) return emptyValue;
	const normalized = String(value).trim();
	return normalized || emptyValue;
};

const formatChoice = (choice?: WorkerProfileChoice | null) =>
	choice?.name || choice?.code || emptyValue;

const formatDate = (value?: string | null) => {
	if (!value) return emptyValue;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString();
};

const formatAddress = (worker?: WorkerProfileDetail | null) => {
	const address = worker?.resume?.address;
	const parts = [
		address?.details,
		address?.city?.name,
		address?.state?.name,
		address?.country?.name,
	].filter(Boolean);

	return parts.length > 0 ? parts.join(", ") : emptyValue;
};

const DetailItem = ({
	label,
	value,
}: {
	label: string;
	value?: string | number | null;
}) => (
	<div>
		<p className="text-xs font-semibold uppercase tracking-wide text-[#148696]">
			{label}
		</p>
		<p className="mt-1 text-sm font-medium text-gray-900">
			{formatValue(value)}
		</p>
	</div>
);

const SectionTitle = ({ children }: { children: string }) => (
	<h4 className="text-sm font-semibold uppercase tracking-wide text-[#004A60]">
		{children}
	</h4>
);

export default function WorkerProfileModal({
	error = false,
	isLoading = false,
	onClose,
	open,
	worker,
}: WorkerProfileModalProps) {
	const titleId = useId();

	if (!open) return null;

	const resume = worker?.resume;
	const uploadedResumes = worker?.uploadedResumes ?? [];
	const workingExperiences = resume?.workingExperiences ?? [];
	const desiredLocations = resume?.desiredLocations ?? [];
	const industries = resume?.industries ?? [];
	const languages = resume?.languages ?? [];
	const profileImageUrl = worker?.profileImageUrl || resume?.photoUrl;

	return (
		<div
			aria-labelledby={titleId}
			aria-modal="true"
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			role="dialog"
		>
			<button
				aria-label="Close worker profile modal"
				className="absolute inset-0 h-full w-full cursor-default bg-black/40"
				onClick={onClose}
				type="button"
			/>
			<div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
				<div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-[#148696]">
							Worker Profile
						</p>
						<h3
							className="mt-1 text-2xl font-semibold text-gray-900"
							id={titleId}
						>
							{formatValue(worker?.fullName)}
						</h3>
						<p className="mt-1 text-sm text-gray-500">
							Jobseeker information from Golden Dreams
						</p>
					</div>
					<button
						aria-label="Close worker profile modal"
						className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
						onClick={onClose}
						type="button"
					>
						<Cross2Icon className="h-4 w-4" />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto px-6 py-5">
					{isLoading && (
						<div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-sm text-gray-600">
							Loading worker profile...
						</div>
					)}

					{!isLoading && error && (
						<div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-700">
							Worker profile could not be loaded.
						</div>
					)}

					{!isLoading && !error && worker && (
						<div className="space-y-6">
							<section className="rounded-2xl border border-gray-100 p-5 shadow-sm">
								<div className="flex flex-col gap-5 sm:flex-row sm:items-center">
									<div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#148696]/10 text-2xl font-semibold text-[#004A60]">
										{profileImageUrl ? (
											<img
												alt={worker.fullName || "Worker profile"}
												className="h-full w-full object-cover"
												src={profileImageUrl}
											/>
										) : (
											formatValue(worker.fullName).slice(0, 1).toUpperCase()
										)}
									</div>
									<div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
										<DetailItem label="Name" value={worker.fullName} />
										<DetailItem label="Age" value={worker.age} />
										<DetailItem label="Email" value={worker.email} />
										<DetailItem
											label="Phone"
											value={
												worker.countryCode || worker.phoneNumber
													? `${worker.countryCode ?? ""} ${worker.phoneNumber ?? ""}`.trim()
													: null
											}
										/>
									</div>
								</div>
							</section>

							<section className="space-y-4 rounded-2xl border border-gray-100 p-5 shadow-sm">
								<SectionTitle>Residence And Identity</SectionTitle>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<DetailItem
										label="Residence"
										value={formatChoice(worker.residenceCountry)}
									/>
									<DetailItem
										label="Nationality"
										value={formatChoice(worker.nationality)}
									/>
									<DetailItem label="Gender" value={worker.gender} />
								</div>
								<DetailItem label="Address" value={formatAddress(worker)} />
							</section>

							{resume ? (
								<>
									<section className="space-y-4 rounded-2xl border border-gray-100 p-5 shadow-sm">
										<SectionTitle>Resume Information</SectionTitle>
										<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
											<DetailItem label="Full Name" value={resume.fullName} />
											<DetailItem label="Gender" value={resume.gender} />
											<DetailItem
												label="Education"
												value={formatChoice(resume.education)}
											/>
											<DetailItem
												label="Nationality"
												value={formatChoice(resume.nationality)}
											/>
											<DetailItem
												label="Phone Number"
												value={
													resume.countryCode || resume.phoneNumber
														? `${resume.countryCode ?? ""} ${resume.phoneNumber ?? ""}`.trim()
														: null
												}
											/>
											<DetailItem label="Email" value={resume.email} />
											<DetailItem
												label="Resume Updated"
												value={formatDate(resume.updatedAt)}
											/>
											<DetailItem label="Skills" value={resume.skills} />
										</div>
										<DetailItem
											label="Current Address"
											value={formatAddress(worker)}
										/>
									</section>

									<section className="space-y-4 rounded-2xl border border-gray-100 p-5 shadow-sm">
										<SectionTitle>Documents</SectionTitle>
										<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
											<DetailItem
												label="National ID"
												value={resume.nationalIdNumber}
											/>
											<DetailItem
												label="Passport"
												value={resume.passportNumber}
											/>
											<DetailItem
												label="Passport Expiry Date"
												value={formatDate(resume.passportExpireDate)}
											/>
											<DetailItem
												label="Pink Card"
												value={resume.pinkcardIdNumber}
											/>
										</div>
									</section>

									<section className="space-y-4 rounded-2xl border border-gray-100 p-5 shadow-sm">
										<SectionTitle>Preferences</SectionTitle>
										<DetailItem
											label="Desired Locations"
											value={
												desiredLocations.map((item) => item.name).join(", ") ||
												emptyValue
											}
										/>
										<DetailItem
											label="Industries"
											value={
												industries.map((item) => item.name).join(", ") ||
												emptyValue
											}
										/>
									</section>

									<section className="space-y-4 rounded-2xl border border-gray-100 p-5 shadow-sm">
										<SectionTitle>Work Experience</SectionTitle>
										{workingExperiences.length > 0 ? (
											<div className="space-y-3">
												{workingExperiences.map((experience) => (
													<div
														className="rounded-xl border border-gray-100 bg-gray-50 p-3"
														key={experience.id}
													>
														<p className="text-sm font-semibold text-gray-900">
															{formatValue(experience.title)}
														</p>
														<p className="text-xs text-gray-500">
															{formatChoice(experience.industry)} -{" "}
															{formatValue(experience.years)} years
														</p>
													</div>
												))}
											</div>
										) : (
											<p className="text-sm text-gray-500">
												No work experience provided.
											</p>
										)}
									</section>

									<section className="space-y-4 rounded-2xl border border-gray-100 p-5 shadow-sm">
										<SectionTitle>Languages Proficiency</SectionTitle>
										{languages.length > 0 ? (
											<div className="flex flex-wrap gap-2">
												{languages.map((language) => (
													<span
														className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700"
														key={language.id}
													>
														{formatChoice(language.language)} -{" "}
														{formatValue(language.speakLevel || language.level)}
													</span>
												))}
											</div>
										) : (
											<p className="text-sm text-gray-500">
												No language proficiency provided.
											</p>
										)}
									</section>

									<section className="space-y-4 rounded-2xl border border-gray-100 p-5 shadow-sm">
										<SectionTitle>Resume Files</SectionTitle>
										{uploadedResumes.length > 0 ? (
											<div className="space-y-2">
												{uploadedResumes.map((upload) => (
													<a
														className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2 text-sm font-medium text-[#004A60] transition-colors hover:border-[#148696] hover:bg-[#148696]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
														href={upload.fileUrl ?? undefined}
														key={upload.id}
														rel="noreferrer"
														target="_blank"
													>
														<span>{upload.name}</span>
														<span className="text-xs text-gray-500">
															{formatDate(upload.uploadedAt)}
														</span>
													</a>
												))}
											</div>
										) : (
											<p className="text-sm text-gray-500">
												No uploaded resume files.
											</p>
										)}
									</section>
								</>
							) : (
								<section className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center shadow-sm">
									<SectionTitle>Resume Information</SectionTitle>
									<p className="mt-3 text-base font-semibold text-gray-900">
										Resume not created
									</p>
									<p className="mt-1 text-sm text-gray-500">
										This jobseeker has not created a Golden Dreams resume yet.
									</p>
								</section>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
