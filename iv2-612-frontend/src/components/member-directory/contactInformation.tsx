import { Card } from "@radix-ui/themes";
// import { GoogleMap, LoadScript } from "@react-google-maps/api";
import { memo } from "react";
import { useTranslation } from "react-i18next";

// import { mapTheme } from "$src/routes/member-directory";

const ContactInformation = ({ company }) => {
	const { t } = useTranslation();

	// const containerStyle = {
	// 	width: "100%",
	// 	height: "200px",
	// 	borderRadius: 5,
	// };

	// const defaultMapProps = {
	// 	center: {
	// 		lat: 10.99835602,
	// 		lng: 77.01502627,
	// 	},
	// 	zoom: 11,
	// };
	// const mapKey = import.meta.env.VITE_APP_GOOGLE_GEOCODE_API_KEY;

	const companyCountryId = company.addresses?.[0]?.country_id;
	const isVietnam = companyCountryId === 31;

	// Render nothing for suppliers to fully hide contact information
	if (company?.type === "Supplier") return null;

	return (
		<Card className="p-6 text-sm">
			<h3 className="text-lg font-bold mb-4">
				{t("memberDirectoryDetail.contact.title")}
			</h3>

			{/* Location */}
			<div className="mb-4">
				<div className="flex items-center mb-2">
					<span className="font-bold">
						{t("memberDirectoryDetail.contact.contactDetail")}
					</span>
				</div>
				<p>{company.email || t("memberDirectoryDetail.common.notProvided")}</p>
			</div>
			<div className="mb-4">
				<div className="flex items-center mb-2">
					<span className="font-bold">
						{t("memberDirectoryDetail.contact.phone")}
					</span>
				</div>
				{company.phone_numbers || t("memberDirectoryDetail.common.notProvided")}
			</div>
			<div className="mb-4">
				<div className="flex items-center mb-2">
					<span className="font-bold">
						{t("memberDirectoryDetail.contact.facebook")}
					</span>
				</div>
				<a
					href={company.facebook || "#"}
					rel="noopener noreferrer"
					target="_blank"
				>
					{company.facebook || t("memberDirectoryDetail.common.notProvided")}
				</a>
			</div>
			{isVietnam && (
				<div className="mb-4">
					<div className="flex items-center mb-2">
						<span className="font-bold">
							{t("memberDirectoryDetail.contact.zalo")}
						</span>
					</div>
					<p>{company.zalo || t("memberDirectoryDetail.common.notProvided")}</p>
				</div>
			)}

			{/* <div className="mb-4">
				<div className="flex items-center mb-2">
					<span className="font-bold">Location</span>
				</div>
				<div>
					<LoadScript googleMapsApiKey={mapKey}>
						<GoogleMap
							center={defaultMapProps.center}
							mapContainerStyle={containerStyle}
							options={{
								styles: mapTheme,
							}}
							zoom={defaultMapProps.zoom}
						/>
					</LoadScript>
				</div>
			</div> */}
		</Card>
	);
};

export default memo(ContactInformation);
