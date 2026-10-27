import axios from "axios";

const CASCADE_API_URL = import.meta.env.VITE_APP_CASCADE_API_URL;

export interface CreateTrainingPayload {
	language: number;
	training_date: string;
	contract_detail: string;
	created_by: number;
}

export interface CreateTrainingResponse {
	id: number;
	language: number;
	training_date: string;
	contract_detail: string;
	created_by: number;
}

export interface LanguageTrainingEntry {
	language: number;
	training_dates: string[];
}

export interface AcademyRegistrationPayload {
	solution_id: number;
	language_training: LanguageTrainingEntry[];
	country: string;
	organization: string;
	position: string;
	first_name: string;
	last_name: string;
	email: string;
	attended_before: boolean;
	submitted_by_user_id?: number | null;
}

export const trainingService = {
	create: async (
		solutionId: number,
		payload: CreateTrainingPayload,
	): Promise<CreateTrainingResponse> => {
		const { data } = await axios.post(
			`${CASCADE_API_URL}/solutions/${solutionId}/trainings`,
			payload,
			{ headers: { "Content-Type": "application/json" } },
		);
		return data;
	},

	registerAcademy: async (
		payload: AcademyRegistrationPayload,
	): Promise<unknown> => {
		const { data } = await axios.post(
			`${CASCADE_API_URL}/solutions/${payload.solution_id}/trainings/register`,
			payload,
			{ headers: { "Content-Type": "application/json" } },
		);
		return data;
	},
};
