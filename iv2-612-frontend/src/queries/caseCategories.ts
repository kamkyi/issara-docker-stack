import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// Define the case category type
export interface CaseCategory {
	id: number;
	name: string;
}

// Type for API response - an array of case categories
type CaseCategoriesResponse = CaseCategory[];

/**
 * Fetch all case categories
 */
export const useCaseCategories = (lang: string = "en") => {
	const clientVersion = import.meta.env.VITE_CLIENT_VERSION;
	const baseUrl = import.meta.env.VITE_APP_API_URL;

	return useQuery({
		queryKey: ["caseCategories", lang],
		queryFn: async () => {
			const token = localStorage.getItem("auth_token");
			if (!token) {
				throw new Error("Authentication token not found");
			}

			const response = await axios.get<CaseCategoriesResponse>(
				`${baseUrl}/casecategories/?lang=${lang}&client_version=${clientVersion}`,
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${token}`,
					},
				},
			);
			return response.data;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
};
