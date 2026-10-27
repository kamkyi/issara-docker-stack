import axios from "axios";

const API_URL = import.meta.env.VITE_APP_GD_API_V1_URL;

const getHeaders = () => ({
	"Content-Type": "application/json",
});

export interface JobPositionCategory {
	id: number;
	name: string;
	is_required_details: boolean;
}

export const jobPositionCategoriesService = {
	// Get all job position categories
	getAll: async (lang: string = "en"): Promise<JobPositionCategory[]> => {
		try {
			const response = await axios.get(
				`${API_URL}/job-position-categories?lang=${lang}`,
				{ headers: getHeaders() },
			);
			return response.data;
		} catch (error) {
			console.error("Failed to fetch job position categories:", error);
			// Fallback to hardcoded categories if API fails
			return [];
		}
	},
};
