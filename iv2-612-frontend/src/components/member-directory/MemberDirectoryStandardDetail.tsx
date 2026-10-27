import {
	ArrowLeftIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
} from "@radix-ui/react-icons";
import moment from "moment";
import { useMemo, useState } from "react";
import PicturePlaceholder from "$src/assets/img/picture_icon.png";
import EmojiRatings from "$src/components/emojiRatings/emojiRatings";
import ImageViewAll from "$src/components/modals/ImageViewAll";
import { useRatingCriteries } from "$src/hooks/useRatingCriteries";
import {
	getCompanyDescription,
	getCompanyLogo,
} from "$src/utils/memberDirectory";
import MapMarkerIcon from "./MapMarkerIcon";

interface LocalizationItem {
	country?: number;
	name: string;
}

interface MemberDirectoryStandardDetailProps {
	company: any;
	companyTypeLabel: string;
	formattedAddress: string;
	statusLabel: string;
	countries: LocalizationItem[];
}

const getDisplayValue = (value: unknown, fallback = "-") => {
	if (Array.isArray(value)) return value.filter(Boolean).join(", ") || fallback;
	if (value === null || value === undefined || value === "") return fallback;
	return String(value);
};

const getExternalHref = (value: unknown) => {
	const displayValue = getDisplayValue(value, "").trim();
	if (!displayValue) return "";
	if (/^https?:\/\//i.test(displayValue)) return displayValue;
	return `https://${displayValue}`;
};

const DetailCard = ({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) => (
	<section className={`rounded-2xl bg-white p-6 shadow-sm ${className}`}>
		{children}
	</section>
);

const InfoRow = ({
	label,
	value,
}: {
	label: string;
	value: React.ReactNode;
}) => (
	<div className="flex items-start justify-between gap-4 border-b border-gray-200 py-3 text-sm last:border-b-0">
		<span className="shrink-0 text-gray-700">{label}</span>
		<span className="min-w-0 max-w-[60%] break-all text-right font-medium text-gray-900">
			{value}
		</span>
	</div>
);

const MemberGallery = ({ company }: { company: any }) => {
	const images = useMemo(
		() =>
			(company.bussiness_images || [])
				.map((image: { image?: string }) => image.image)
				.filter(Boolean),
		[company.bussiness_images],
	);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isModalOpen, setIsModalOpen] = useState(false);

	if (images.length === 0) return null;

	const currentImage = images[currentIndex] ?? images[0];
	const goPrevious = () => {
		setCurrentIndex((previous) =>
			previous === 0 ? images.length - 1 : previous - 1,
		);
	};
	const goNext = () => {
		setCurrentIndex((previous) =>
			previous === images.length - 1 ? 0 : previous + 1,
		);
	};

	return (
		<DetailCard>
			<h2 className="mb-4 text-lg font-semibold text-gray-900">Gallery</h2>
			<div className="relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
				<img
					alt={`${company.name_en || company.name} gallery ${currentIndex + 1}`}
					className="h-[360px] w-full object-cover"
					onError={(event) => {
						event.currentTarget.src = PicturePlaceholder;
					}}
					src={currentImage}
				/>
				{images.length > 1 && (
					<>
						<button
							aria-label="Previous gallery image"
							className="absolute left-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#148696] text-white transition-colors hover:bg-[#004A60] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
							onClick={goPrevious}
							type="button"
						>
							<ChevronLeftIcon />
						</button>
						<button
							aria-label="Next gallery image"
							className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#148696] text-white transition-colors hover:bg-[#004A60] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
							onClick={goNext}
							type="button"
						>
							<ChevronRightIcon />
						</button>
					</>
				)}
				<button
					className="absolute bottom-3 left-3 rounded-md bg-gray-900/80 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
					onClick={() => setIsModalOpen(true)}
					type="button"
				>
					View all {images.length}
				</button>
				<div className="absolute bottom-3 right-3 rounded-md bg-gray-900/80 px-2 py-1 text-xs font-medium text-white">
					{currentIndex + 1} / {images.length}
				</div>
			</div>
			{images.length > 1 && (
				<div className="mt-4 flex gap-3 overflow-x-auto">
					{images.map((image, index) => (
						<button
							aria-label={`Show gallery image ${index + 1}`}
							className={`h-24 w-32 shrink-0 overflow-hidden rounded-xl border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] ${
								currentIndex === index
									? "border-[#148696]"
									: "border-gray-200 hover:border-[#148696]"
							}`}
							key={image}
							onClick={() => setCurrentIndex(index)}
							type="button"
						>
							<img
								alt={`${company.name_en || company.name} thumbnail ${index + 1}`}
								className="h-full w-full object-cover"
								onError={(event) => {
									event.currentTarget.src = PicturePlaceholder;
								}}
								src={image}
							/>
						</button>
					))}
				</div>
			)}
			<ImageViewAll
				companyName={company.name_en || company.name}
				images={images}
				onOpenChange={setIsModalOpen}
				open={isModalOpen}
				reviews={[]}
			/>
		</DetailCard>
	);
};

const GeneralInformationCard = ({
	company,
	countries,
}: {
	company: any;
	countries: LocalizationItem[];
}) => {
	const sendingCountries = (company.sending_countries || [])
		.map(
			(countryId: number) =>
				countries.find((country) => country.country === countryId)?.name,
		)
		.filter(Boolean)
		.join(", ");
	const companyCountryId = company.addresses?.[0]?.country_id;
	const isVietnam = companyCountryId === 31;
	const isOperational = company.status === "Operational";
	const licenseValidDateDisplay =
		isOperational && isVietnam
			? "Till termination"
			: getDisplayValue(company.license_valid_date);

	return (
		<DetailCard>
			<h2 className="mb-3 text-lg font-semibold text-gray-900">
				General Information
			</h2>
			{company.type === "Recruitment Agency" && (
				<InfoRow
					label="Sending Countries"
					value={sendingCountries || getDisplayValue(null)}
				/>
			)}
			<InfoRow
				label="Date of Registration"
				value={
					company.date_of_registration
						? moment(company.date_of_registration).format("YYYY")
						: getDisplayValue(null)
				}
			/>
			{company.type === "Recruitment Agency" && (
				<>
					<InfoRow label="License Valid Date" value={licenseValidDateDisplay} />
					<InfoRow
						label="License No."
						value={getDisplayValue(company.license_number)}
					/>
				</>
			)}
		</DetailCard>
	);
};

const ContactInformationCard = ({ company }: { company: any }) => {
	const renderExternalLink = (value: unknown) => {
		const displayValue = getDisplayValue(value);
		const href = getExternalHref(value);

		if (!href) {
			return <span className="text-gray-900">{displayValue}</span>;
		}

		return (
			<a
				className="break-all text-[#004A60] underline decoration-[#148696] underline-offset-2"
				href={href}
				rel="noopener noreferrer"
				target="_blank"
			>
				{displayValue}
			</a>
		);
	};

	return (
		<DetailCard>
			<h2 className="mb-3 text-lg font-semibold text-gray-900">
				Contact Information
			</h2>
			<div className="divide-y divide-gray-200">
				<div className="py-3">
					<p className="text-xs text-gray-500">Website</p>
					<div className="mt-1 text-sm font-medium">
						{renderExternalLink(company.website)}
					</div>
				</div>
				<div className="py-3">
					<p className="text-xs text-gray-500">Facebook</p>
					<div className="mt-1 text-sm font-medium">
						{renderExternalLink(company.facebook)}
					</div>
				</div>
			</div>
		</DetailCard>
	);
};

const RatingPanel = ({ company }: { company: any }) => {
	const { data: ratingCriteries = [] } = useRatingCriteries();
	const rating = Number(company.rating_score ?? 0);
	const reviews = Number(company.rating_count ?? 0);
	const scores = (company.scores_for_each_criteria || []).map((score: any) => ({
		...score,
		label:
			ratingCriteries.find(
				(criteria: { id: number }) => criteria.id === score.rating_criteria_id,
			)?.name || "Rating criteria",
	}));

	if (company.user === 18136) return null;

	return (
		<DetailCard>
			<div className="text-center">
				<p className="mx-auto max-w-48 text-sm font-medium leading-snug text-gray-900">
					Overall Rating by Workers on Golden Dreams
				</p>
				<p className="mt-2 text-5xl font-semibold leading-none text-gray-900">
					{rating.toFixed(1)}
				</p>
				<div className="mt-1.5 flex justify-center">
					<EmojiRatings
						color="#f5a524"
						emptyColor="#f5a524"
						score={Math.round(rating)}
						size={17}
					/>
				</div>
				<p className="mt-1.5 text-xs text-gray-600">
					based on {reviews} reviews
				</p>
			</div>
			<div className="mt-4 border-t border-gray-200 pt-2">
				{scores.map((score: any) => (
					<div
						className="border-b border-gray-100 py-1.5 last:border-b-0"
						key={score.rating_criteria_id}
					>
						<p className="text-xs leading-tight text-gray-700">{score.label}</p>
						<div className="mt-1 flex items-center justify-between gap-3">
							<EmojiRatings
								gapClassName="gap-0.5"
								score={Math.round(score.score)}
								size={14}
							/>
							<span className="shrink-0 text-xs font-medium text-gray-900">
								{Number(score.score).toFixed(1)} ({score.count})
							</span>
						</div>
					</div>
				))}
			</div>
		</DetailCard>
	);
};

export default function MemberDirectoryStandardDetail({
	company,
	companyTypeLabel,
	formattedAddress,
	statusLabel,
	countries,
}: MemberDirectoryStandardDetailProps) {
	const logo = getCompanyLogo(company) || PicturePlaceholder;
	const description = getCompanyDescription(company);
	const rating = Number(company.rating_score ?? 0);
	const reviews = Number(company.rating_count ?? 0);
	const isOperational = company.status === "Operational";

	return (
		<div
			className="-mx-6 -mb-4 bg-gradient-to-b from-[#FBF6EC] via-[rgba(20,134,150,0.12)] to-[#148696] pb-8 shadow-[0_16px_0_#148696]"
			data-member-directory-detail
		>
			<div className="mx-auto max-w-6xl px-6 py-4">
				<a
					className="mb-6 flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 no-underline transition-colors hover:border-[#148696] hover:text-[#004A60] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
					href="/member-directory"
				>
					<ArrowLeftIcon />
					Back to Directory
				</a>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
					<div className="space-y-4">
						<DetailCard>
							<div className="flex flex-col gap-5 md:flex-row md:items-start">
								<img
									alt={company.name_en || company.name}
									className="h-20 w-20 shrink-0 rounded-full border border-gray-100 bg-white object-contain p-3 shadow-sm"
									onError={(event) => {
										event.currentTarget.src = PicturePlaceholder;
									}}
									src={logo}
								/>
								<div className="min-w-0 flex-1">
									<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
										<div>
											<h1 className="text-3xl font-semibold leading-tight text-gray-900">
												{company.name_en || company.name}
											</h1>
											<div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
												<span className="rounded-full border border-[#148696] bg-[rgba(20,134,150,0.1)] px-3 py-1 text-xs font-medium text-[#004A60]">
													Verified
												</span>
												<span className="font-medium text-gray-800">
													Status:
												</span>
												<span
													className={`rounded-full px-3 py-1 text-xs font-medium ${
														isOperational
															? "bg-[rgba(20,134,150,0.1)] text-[#004A60]"
															: "bg-gray-100 text-gray-700"
													}`}
												>
													{statusLabel}
												</span>
											</div>
											<p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
												<MapMarkerIcon className="h-4 w-4 shrink-0" />
												{formattedAddress}
											</p>
										</div>
										<span className="self-start rounded-full bg-[rgba(20,134,150,0.1)] px-4 py-1 text-xs font-medium uppercase text-[#004A60]">
											{companyTypeLabel}
										</span>
									</div>
									<div className="mt-4 flex flex-wrap items-center gap-3">
										<EmojiRatings score={Math.round(rating)} />
										<span className="text-lg font-semibold text-gray-900">
											{rating.toFixed(1)}/5
										</span>
										<span className="text-sm text-gray-600">
											({reviews} reviews)
										</span>
									</div>
									<div className="mt-5 border-t border-gray-200 pt-4">
										<h2 className="text-lg font-semibold text-gray-900">
											Description
										</h2>
										<p className="mt-2 text-sm leading-relaxed text-gray-700">
											{description || "No description provided."}
										</p>
									</div>
								</div>
							</div>
						</DetailCard>
						<MemberGallery company={company} />
					</div>

					<div className="space-y-4">
						{company.user === 18136 ? null : (
							<GeneralInformationCard company={company} countries={countries} />
						)}
						<ContactInformationCard company={company} />
						<RatingPanel company={company} />
					</div>
				</div>
			</div>
		</div>
	);
}
