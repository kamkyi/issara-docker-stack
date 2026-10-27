import axios from "axios";

const API_URL = import.meta.env.VITE_APP_GD_API_V1_URL;

// Helper function to get auth headers
const getAuthHeaders = () => {
	const token = localStorage.getItem("auth_token");
	return {
		"Content-Type": "application/json",
		...(token && {
			Authorization: `Token ${token}`,
		}),
	};
};

export interface JobPostingApiData {
	job_poster_country: number;
	origin_country_currency: number;
	destination_country_currency: number;
	ra_currency: number;
	employer_size: string;
	translations: Array<{
		language: number;
		accommodation_details?: string;
		is_rent_utilites_auto_deducted_details?: string;
		probation_period_details?: string;
		safe_grievance_mechanism_details?: string;
		title?: string;
		description?: string;
		requirements?: string;
		contact_name?: string;
		contact_phone_number?: string;
		contact_job_title?: string;
		benefits_details?: string;
		job_position_details?: string;
		remarks?: string;
		meals_allowance?: string;
	}>;
	terms_of_payment: string;
	timing_of_payment: string;
	open_to_genders: string[];
	openToNationalities: number[];
	currency: number;
	have_ethical_recruitment_policy: boolean;
	have_employer_pays_policy: boolean;
	worker_pays_visa_feess: boolean | null;
	worker_pays_work_permit_fees: boolean;
	worker_pays_medical_checkup_fee: boolean;
	hospitalization_insurance: boolean;
	is_social_security_maternity_leave_provided: boolean;
	recruitment_agency: number;
	is_draft: boolean;
	[key: string]: any; // Allow additional fields
}

export const jobPostingService = {
	// Save job posting as draft
	saveDraft: async (data: JobPostingApiData): Promise<any> => {
		const response = await axios.post(
			`${API_URL}/employer-jobs/`,
			{ ...data, is_draft: true },
			{ headers: getAuthHeaders() },
		);
		return response.data;
	},

	// Submit final job posting
	submit: async (data: JobPostingApiData): Promise<any> => {
		const response = await axios.post(
			`${API_URL}/employer-jobs/`,
			{ ...data, is_draft: false },
			{ headers: getAuthHeaders() },
		);
		return response.data;
	},

	// Update existing job posting
	update: async (
		id: number,
		data: Partial<JobPostingApiData>,
	): Promise<any> => {
		const response = await axios.patch(
			`${API_URL}/employer-jobs/${id}/`,
			data,
			{ headers: getAuthHeaders() },
		);
		return response.data;
	},

	// Get job posting by ID
	getById: async (id: number): Promise<any> => {
		const response = await axios.get(`${API_URL}/employer-jobs/${id}/`, {
			headers: getAuthHeaders(),
		});
		return response.data;
	},

	// Get all job postings
	getAll: async (): Promise<any> => {
		const response = await axios.get(`${API_URL}/employer-jobs/`, {
			headers: getAuthHeaders(),
		});
		return response.data;
	},

	// Categorize jobs by status on frontend
	categorizeJobs: (jobs: any[]) => {
		const categorized = {
			draft: [] as any[],
			posted: [] as any[],
			closed: [] as any[],
			archived: [] as any[],
		};

		jobs.forEach((job) => {
			if (job.is_archived) {
				categorized.archived.push(job);
			} else if (job.is_draft) {
				categorized.draft.push(job);
			} else if (job.is_closed) {
				categorized.closed.push(job);
			} else if (job.posted_at) {
				categorized.posted.push(job);
			}
		});

		return categorized;
	},

	// Get job postings by status (frontend categorization)
	getByStatus: async (
		status: "draft" | "posted" | "closed" | "archived",
	): Promise<any> => {
		const response = await axios.get(`${API_URL}/employer-jobs/`, {
			headers: getAuthHeaders(),
		});
		const allJobs = response.data.results || response.data;
		const categorized = jobPostingService.categorizeJobs(allJobs);
		return categorized[status];
	},

	// Get draft job postings only (backward compatibility)
	getDrafts: async (): Promise<any> => {
		return jobPostingService.getByStatus("draft");
	},

	// Get posted job postings
	getPosted: async (): Promise<any> => {
		return jobPostingService.getByStatus("posted");
	},

	// Get closed job postings
	getClosed: async (): Promise<any> => {
		return jobPostingService.getByStatus("closed");
	},

	// Get archived job postings
	getArchived: async (): Promise<any> => {
		return jobPostingService.getByStatus("archived");
	},

	// Archive job posting
	archive: async (id: number): Promise<any> => {
		const response = await axios.patch(
			`${API_URL}/employer-jobs/${id}/`,
			{ is_archived: true },
			{ headers: getAuthHeaders() },
		);
		return response.data;
	},

	// Close job posting
	close: async (id: number): Promise<any> => {
		const response = await axios.patch(
			`${API_URL}/employer-jobs/${id}/`,
			{ is_closed: true },
			{ headers: getAuthHeaders() },
		);
		return response.data;
	},

	// Reopen job posting
	reopen: async (id: number): Promise<any> => {
		const response = await axios.patch(
			`${API_URL}/employer-jobs/${id}/`,
			{ is_closed: false },
			{ headers: getAuthHeaders() },
		);
		return response.data;
	},

	// Toggle online status
	toggleOnline: async (id: number, isOnline: boolean): Promise<any> => {
		const response = await axios.patch(
			`${API_URL}/employer-jobs/${id}/`,
			{ is_online: isOnline },
			{ headers: getAuthHeaders() },
		);
		return response.data;
	},

	// End recruitment (close job)
	endRecruitment: async (id: number): Promise<any> => {
		const response = await axios.patch(
			`${API_URL}/employer-jobs/${id}/`,
			{ is_closed: true },
			{ headers: getAuthHeaders() },
		);
		return response.data;
	},

	// Delete job posting (permanent)
	delete: async (id: number): Promise<any> => {
		const response = await axios.delete(`${API_URL}/employer-jobs/${id}/`, {
			headers: getAuthHeaders(),
		});
		return response.data;
	},
};
