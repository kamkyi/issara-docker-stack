import axios from "axios";

const GD_API_URL = import.meta.env.VITE_APP_GD_API_URL;

export type MemberDirectoryCardType = "Recruitment Agency" | "Supplier";

export const fetchMemberDirectoryCardDetail = async (
	id: number,
	type: MemberDirectoryCardType,
) => {
	const endpoint =
		type === "Recruitment Agency" ? "recruitment-agencies" : "employers";
	const { data } = await axios.get(`${GD_API_URL}/${endpoint}/${id}`, {
		params: { lang: "en" },
	});

	return data;
};
