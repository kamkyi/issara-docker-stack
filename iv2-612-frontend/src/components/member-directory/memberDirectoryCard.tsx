import { ArrowRightIcon } from "@radix-ui/react-icons";
import * as motion from "motion/react-client";
import { useTheme } from "next-themes";
import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import PicturePlaceholder from "$src/assets/img/picture_icon.png";
import {
	getCompanyDescription,
	getCompanyLocation,
	getCompanyLogo,
	isGlobalBuyer,
} from "$src/utils/memberDirectory";
import EmojiRatings from "../emojiRatings/emojiRatings";
import MapMarkerIcon from "./MapMarkerIcon";

const MemberDirectoryCard = ({ data, index }) => {
	const { theme } = useTheme();
	const { t } = useTranslation();
	const [logoError, setLogoError] = useState(false);
	const logo = getCompanyLogo(data);
	const logoSrc = logo || PicturePlaceholder;
	const companyName = data.name_en || data.name;
	const location = data.memberDirectoryLocation || getCompanyLocation(data);
	const countryFallback =
		typeof data.country === "string" && Number.isNaN(Number(data.country))
			? data.country
			: "";
	const description = getCompanyDescription(data);
	const hideRatings = isGlobalBuyer(data.type);
	const isGlobalBuyerCard = hideRatings;
	const showLetterAvatar = isGlobalBuyerCard && (!logo || logoError);
	const firstLetter = companyName?.charAt(0)?.toUpperCase() || "?";
	const displayType = isGlobalBuyerCard
		? t("memberDirectoryPage.memberTypes.globalBuyer")
		: data.type || t("memberDirectoryPage.card.typeFallback");
	const cardDescription =
		description ||
		t("memberDirectoryPage.card.description", {
			name: data.name,
			type: displayType,
		});
	const ratingScore = Number(data.rating_score ?? 0);
	const ratingCount = Number(data.rating_count ?? 0);
	const ratingText =
		ratingScore > 0 ? `${ratingScore.toFixed(1)}/${ratingCount || 0}` : "0.0/0";

	return (
		<motion.div
			animate={{ x: 0, y: 0, opacity: 1 }}
			className="relative flex h-full min-h-[320px] flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-[#148696]"
			initial={{ y: 12 * (index + 1), opacity: 0 }}
			key={data.id}
			style={{
				background: theme === "dark" ? "#004A60" : "#ffffff",
			}}
			transition={{
				duration: 0.35,
			}}
		>
			<div className="mb-1">
				<span className="inline-flex items-center rounded-md border border-[#148696] bg-[rgba(20,134,150,0.1)] px-1.5 py-0.5 text-xs font-medium uppercase leading-none text-[#004A60]">
					{displayType}
				</span>
			</div>
			<h5 className="mb-2 line-clamp-1 text-base font-semibold leading-tight text-gray-900">
				{companyName}
			</h5>

			<div className="mb-3 flex h-[150px] items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white">
				{showLetterAvatar ? (
					<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[rgba(20,134,150,0.12)] to-[rgba(0,81,106,0.12)]">
						<span className="select-none text-7xl font-bold text-[#148696]">
							{firstLetter}
						</span>
					</div>
				) : (
					<img
						alt={companyName}
						className="h-full w-full object-contain object-center p-4 transition-transform duration-300 hover:scale-105"
						onError={(event) => {
							if (isGlobalBuyerCard) {
								setLogoError(true);
							} else {
								event.currentTarget.src = PicturePlaceholder;
							}
						}}
						src={logoSrc}
					/>
				)}
			</div>

			{/* Content Section */}
			<div className="flex flex-grow flex-col">
				{!hideRatings && cardDescription && (
					<p className="sr-only">{cardDescription}</p>
				)}
				<div className="mb-3 mt-auto flex items-center justify-between gap-2 text-xs text-gray-600">
					<span className="flex min-w-0 items-center gap-1">
						<MapMarkerIcon className="h-3.5 w-3.5 shrink-0 text-gray-500" />
						<span className="truncate">
							{location || countryFallback || "-"}
						</span>
					</span>
					{!hideRatings && (
						<span className="flex shrink-0 items-center gap-1">
							<span className="scale-75">
								<EmojiRatings score={Math.round(ratingScore)} />
							</span>
							<span>{ratingText}</span>
						</span>
					)}
				</div>

				<a
					aria-label={`${t("memberDirectoryPage.card.viewDetails")} ${companyName}`}
					className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#004A60] px-4 py-2 text-sm font-medium text-white no-underline transition-all duration-200 hover:bg-[#148696] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
					href={`/member-directory/detail?id=${data.id}&type=${data.type}`}
					target="_blank"
				>
					{t("memberDirectoryPage.card.viewDetails")}
					<ArrowRightIcon className="h-3.5 w-3.5" />
				</a>
			</div>
		</motion.div>
	);
};

export default memo(MemberDirectoryCard);
