import axios from "axios";

const API_URL = import.meta.env.VITE_APP_GD_API_V1_URL;

// Helper function to get auth headers
const getAuthHeaders = () => {
	return {
		"Content-Type": "application/json",
	};
};

export interface Currency {
	id: number;
	code: string;
}

export const currencyService = {
	// Get all currencies
	getAll: async (): Promise<Currency[]> => {
		try {
			const response = await axios.get(`${API_URL}/localization/currencies`, {
				headers: getAuthHeaders(),
			});
			return response.data;
		} catch (error) {
			console.error("Failed to fetch currencies:", error);
			// Fallback to hardcoded currencies if API fails
			return [];
		}
	},
};
