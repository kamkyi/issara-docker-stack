import axios from "axios";

const API_URL = import.meta.env.VITE_APP_GD_API_V1_URL;

// Helper function to get auth headers
const getAuthHeaders = () => {
	return {
		"Content-Type": "application/json",
	};
};

export interface Benefit {
	id: number;
	category_id: number;
	name: string;
	type: string;
}

export interface BenefitCategory {
	benefit_category: number;
	name: string;
}

export const benefitsService = {
	// Get all benefits
	getAll: async (lang: string): Promise<Benefit[] | null> => {
		try {
			const response = await axios.get(`${API_URL}/benefits?lang=${lang}`, {
				headers: getAuthHeaders(),
			});
			return response.data;
		} catch (error) {
			console.error("Failed to fetch benefits:", error);
			// Fallback to hardcoded benefits if API fails
			return null;
		}
	},

	// Get benefit by ID
	getById: async (id: number, lang: string): Promise<Benefit | null> => {
		try {
			const response = await axios.get(
				`${API_URL}/benefits/${id}/?lang=${lang}`,
				{ headers: getAuthHeaders() },
			);
			return response.data;
		} catch (error) {
			console.error("Failed to fetch benefit:", error);
			return null;
		}
	},

	// Get all benefit categories
	getCategories: async (lang: string): Promise<BenefitCategory[] | null> => {
		try {
			const response = await axios.get(
				`${API_URL}/benefit-categories?lang=${lang}`,
				{ headers: getAuthHeaders() },
			);
			return response.data;
		} catch (error) {
			console.error("Failed to fetch benefit categories:", error);
			// Fallback to hardcoded categories if API fails
			return null;
		}
	},
};
