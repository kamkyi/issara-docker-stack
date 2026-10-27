import { HeartIcon } from "@radix-ui/react-icons";
import { Flex } from "@radix-ui/themes";
import * as motion from "motion/react-client";
import { useTheme } from "next-themes";
import { useState } from "react";
import PlaceholderImage from "$src/assets/img/picture_icon.png";
import {
	getCompanyLocation,
	getCompanyLogo,
	isGlobalBuyer,
} from "$src/utils/memberDirectory";
import EmojiRatings from "../emojiRatings/emojiRatings";
import MapMarkerIcon from "./MapMarkerIcon";

interface MemberDirectoryListCardProps {
	data: {
		id: number;
		name: string;
		logo: string;
		rating_score: number;
		rating_count: number;
		eps: number;
		type: string;
		website: string;
		country: string;
		industry: string;
		popularity: number;
		memberDirectoryLocation?: string;
	};
}

const MemberDirectoryListCard: React.FC<MemberDirectoryListCardProps> = ({
	data,
}) => {
	const { theme } = useTheme();
	const [logoError, setLogoError] = useState(false);
	const logo = getCompanyLogo(data);
	const logoSrc = logo || PlaceholderImage;
	const location = data.memberDirectoryLocation || getCompanyLocation(data);
	const hideRatings = isGlobalBuyer(data.type);
	const showLetterAvatar = hideRatings && (!logo || logoError);
	const firstLetter = (data.name || "").charAt(0).toUpperCase() || "?";
	const countryFallback =
		typeof data.country === "string" && Number.isNaN(Number(data.country))
			? data.country
			: "";
	const displayLocation = location || countryFallback || "-";

	return (
		<motion.div
			animate={{ x: 0, y: 0, opacity: 1 }}
			className={`rounded-[5px] shadow-sm relative flex flex-row h-auto hover:outline-1 hover:outline-[#148696]`}
			initial={{ x: 150 * data.id, opacity: 0 }}
			key={data.id}
			style={{
				background: theme === "dark" ? "#004A60" : "#ffffff",
			}}
			transition={{
				duration: 1,
			}}
		>
			{/* <div className="w-31 overflow-hidden rounded-l-[10px]">
                <img
                    className="w-full h-full object-cover hover:scale-105 transition-transform ease-in-out duration-300"
                    src={data.logo || PlaceholderImage}
                    alt={`${data.name} - ${data.industry}`} />
            </div> */}

			{/* Content Section - Right Side */}
			<a
				className="flex-1 p-2 px-4 flex flex-col justify-between"
				href={`/member-directory/detail?id=${data.id}&type=${data.type}`}
				target="_blank"
			>
				{/* Top Section */}
				<div className="flex-1">
					{/* Title and Rating Row */}

					<div className="flex justify-between items-center mb-2 flex-wrap">
						<Flex align={"center"}>
							<div className="shrink-0 w-10 h-10 overflow-hidden rounded-full me-2 border">
								{showLetterAvatar ? (
									<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[rgba(20,134,150,0.15)] to-[rgba(0,81,106,0.15)]">
										<span className="select-none text-lg font-bold text-[#148696]">
											{firstLetter}
										</span>
									</div>
								) : (
									<img
										alt={`${data.name} - ${data.industry}`}
										className="w-full h-full object-contain object-center bg-white p-1 hover:scale-105 transition-transform ease-in-out duration-300"
										onError={(event) => {
											if (hideRatings) {
												setLogoError(true);
											} else {
												event.currentTarget.src = PlaceholderImage;
											}
										}}
										src={logoSrc}
									/>
								)}
							</div>
							<h5 className="text-lg font-bold tracking-tight line-clamp-1 flex-1 mr-2">
								{data.name}
							</h5>
							<HeartIcon className="cursor-pointer" height={22} width={22} />
						</Flex>

						{!hideRatings && (
							<div className="flex items-center mt-1">
								<EmojiRatings score={Math.round(data.rating_score)} />
								<span className="text-xs text-gray-500 ml-2">
									{data.rating_score?.toFixed(1)}
								</span>
							</div>
						)}
					</div>

					{/* Company Info Row */}
					<div className="flex justify-between items-center mb-2 text-sm  flex-wrap">
						<div className="flex items-center space-x-4  flex-wrap">
							{/* <span className="font-bold">CI: {data.eps * 20}</span> */}
							{/* <span className="opacity-[0.5]">{data.type}</span> */}
							<span className="flex items-center gap-1 text-gray-500">
								<MapMarkerIcon className="h-3.5 w-3.5 shrink-0" />
								<span>{displayLocation}</span>
							</span>
							<span className="opacity-[0.5]">{data.industry}</span>
						</div>
						{/* <div className="flex items-center space-x-2">
                            <span className="text-xs">Popularity:</span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-[#148696] h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${data.popularity}%` }}
                                ></div>
                            </div>
                            <span className="text-xs">{data.popularity}%</span>
                        </div> */}
					</div>
				</div>
			</a>
		</motion.div>
	);
};

export default MemberDirectoryListCard;
