import { CameraIcon } from "@radix-ui/react-icons";
import { useEffect, useRef, useState } from "react";
import ProgressBarChart from "$src/components/charts/ProgressBarChart";
import { useTranslation } from "$src/hooks/useTranslation";
import { resolveAssetUrl } from "$src/utils/memberDirectory";

const AVATAR_ACCEPTED = "image/png,image/jpeg,image/webp";
const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

interface ProfileAvatarStrengthCardProps {
	companyName: string;
	avatarImage?: string | null;
	profileOwnerName: string;
	profileOwnerEmail: string;
	profileStrength: number;
	/** Called with the selected File when the user picks a new avatar */
	onAvatarChange?: (file: File) => void;
	/** True while an avatar upload/save is in progress */
	isUploadingAvatar?: boolean;
}

const getStrengthLabelKey = (score: number) => {
	if (score >= 85) return "excellent";
	if (score >= 65) return "good";
	if (score >= 40) return "decent";
	return "basic";
};

const ProfileAvatarStrengthCard = ({
	companyName,
	avatarImage,
	profileOwnerName,
	profileOwnerEmail,
	profileStrength,
	onAvatarChange,
	isUploadingAvatar = false,
}: ProfileAvatarStrengthCardProps) => {
	const { t } = useTranslation();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const safeStrength = Math.max(0, Math.min(100, profileStrength));
	const strengthLabel = t(
		`companyProfilePage.profileStrength.levels.${getStrengthLabelKey(safeStrength)}`,
	);
	const normalizedCompanyName = companyName.trim();
	const companyInitial = normalizedCompanyName.charAt(0).toUpperCase() || "C";
	const [imgError, setImgError] = useState(false);

	useEffect(() => {
		setImgError(false);
	}, [avatarImage]);

	const handleAvatarClick = () => {
		if (onAvatarChange && !isUploadingAvatar) {
			fileInputRef.current?.click();
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			return;
		}
		if (file.size > AVATAR_MAX_BYTES) {
			return;
		}
		onAvatarChange?.(file);
		// Reset so same file can be re-selected
		e.target.value = "";
	};

	const isClickable = Boolean(onAvatarChange) && !isUploadingAvatar;

	return (
		<div className="bg-white rounded-md border border-gray-100 shadow-sm p-6 mb-5">
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
				<div className="flex items-center gap-4">
					{/* Company logo — clickable when onAvatarChange is provided */}
					<div className="relative shrink-0">
						<button
							aria-label={t("companyProfilePage.avatar.changeAria")}
							className={[
								"relative flex h-20 w-28 items-center justify-center overflow-hidden rounded-md border-2 bg-white p-1 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]",
								isClickable
									? "cursor-pointer border-transparent hover:border-[#148696] group"
									: "cursor-default border-transparent",
							].join(" ")}
							disabled={!isClickable}
							onClick={handleAvatarClick}
							type="button"
						>
							{avatarImage && !imgError ? (
								<img
									alt={`${normalizedCompanyName || "Company"} logo`}
									className="block h-full w-full object-contain"
									onError={() => setImgError(true)}
									src={resolveAssetUrl(avatarImage)}
								/>
							) : (
								<div className="flex h-full w-full items-center justify-center rounded-sm bg-[#148696] text-xl font-black text-white">
									{companyInitial}
								</div>
							)}

							{/* Hover overlay with camera icon */}
							{isClickable && (
								<div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
									{isUploadingAvatar ? (
										<span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
									) : (
										<CameraIcon className="h-5 w-5 text-white" />
									)}
								</div>
							)}
						</button>

						{/* Hidden file input */}
						<input
							accept={AVATAR_ACCEPTED}
							className="sr-only"
							onChange={handleFileChange}
							ref={fileInputRef}
							type="file"
						/>
					</div>

					<div>
						<h2 className="text-lg font-black text-[#004A60] leading-tight">
							{companyName}
						</h2>
						<p className="text-xs font-bold text-gray-500">
							{profileOwnerName}
						</p>
						<p className="text-sm text-gray-400">{profileOwnerEmail}</p>
						{isClickable && (
							<button
								className="mt-1 text-xs text-[#148696] font-semibold hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-[#148696]"
								disabled={isUploadingAvatar}
								onClick={handleAvatarClick}
								type="button"
							>
								{isUploadingAvatar
									? t("companyProfilePage.avatar.uploading")
									: t("companyProfilePage.avatar.change")}
							</button>
						)}
					</div>
				</div>

				<div className="w-full md:max-w-md">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm font-semibold">
							{t("companyProfilePage.profileStrength.title")}
						</p>
						<p className="text-xs font-semibold">
							{strengthLabel} ({safeStrength}%)
						</p>
					</div>
					<ProgressBarChart
						color="#148696"
						completed={safeStrength}
						height="8px"
					/>
				</div>
			</div>
		</div>
	);
};

export default ProfileAvatarStrengthCard;
