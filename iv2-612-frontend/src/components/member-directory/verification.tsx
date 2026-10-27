import { Grid } from "@radix-ui/themes";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import VerifiedIcon from "$src/assets/img/shield_icon.png";

const VerificationCard = () => {
	const { t } = useTranslation();

	return (
		<Grid columns={"1"} mb={"1"}>
			<div className="py-4 text-center my-3 flex flex-col items-center">
				<img
					alt="verified-icon"
					className="mb-2"
					src={VerifiedIcon}
					width={30}
				/>
				<p className="text-xl font-bold">
					{t("memberDirectoryDetail.verification.title")}
				</p>
				<p className="text-sm">
					{t("memberDirectoryDetail.verification.description")}
				</p>
				<a className="text-sm underline" href="#">
					{t("memberDirectoryDetail.verification.link")}
				</a>
			</div>
			{/* <div className="py-4 text-center my-4 flex flex-col items-center">
				<div
					className="mb-2"
					style={{
						height: 36.5,
					}}
				>
					<img
						alt="issara-logo"
						src={IssaraLogo}
						style={{
							width: 36.5,
						}}
					/>
				</div>
				<p className="text-xl font-bold">Issara Partner</p>
				<p className="text-sm">
					{/* {data.date_joined
						? `Joined Since ${moment(data.date_joined).format("YYYY-MM-DD")}`
						: ""}
				</p>
			</div> */}
		</Grid>
	);
};

export default memo(VerificationCard);
