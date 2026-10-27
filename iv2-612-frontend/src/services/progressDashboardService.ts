import axios from "axios";

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v2`;

// Helper function to get auth headers
const getAuthHeaders = () => {
	const token = localStorage.getItem("auth_token");
	return {
		"Content-Type": "application/json",
		...(token && { Authorization: `Bearer ${token}` }),
	};
};

// Activity Progress API
export interface ActivityProgressItem {
	id: number;
	activity_name: string;
	status: string; // "not-initiated", "partial", "completed"
	progress_percentage: number;
	category?: string; // e.g., "labor_recruitment", "working_conditions"
}

export interface ActivityProgress {
	activities: ActivityProgressItem[];
	summary?: {
		total: number;
		completed: number;
		partial: number;
		not_initiated: number;
	};
}

export const getActivityProgress = async (spId: number) => {
	const response = await axios.get(
		`${API_BASE_URL}/activity_progress/?sp=${spId}&client_version=3.0`,
		{ headers: getAuthHeaders() },
	);
	return response.data;
};

// All Cases API
export interface CaseData {
	id: number;
	case_type: string;
	status: string;
	created_at: string;
	// Add other fields as needed
}

export const getAllCases = async (spId: number) => {
	const response = await axios.get(`${API_BASE_URL}/all_cases/?sp=${spId}`, {
		headers: getAuthHeaders(),
	});
	return response.data;
};

// Work Plan API
export interface WorkPlan {
	id: number;
	activity: string;
	status: string;
	deadline: string;
	// Add other fields as needed
}

export const getWorkPlan = async (spId: number) => {
	const response = await axios.get(`${API_BASE_URL}/sp_work_plan/?sp=${spId}`, {
		headers: getAuthHeaders(),
	});
	return response.data;
};

// Priority Activity Bases API
export interface PriorityActivityBase {
	id: number;
	category: string;
	description: string;
	priority_status: string;
	group: {
		id: number;
		name: string;
		description: string;
	};
}

export const getPriorityActivityBases = async () => {
	const response = await axios.get(
		`${API_BASE_URL}/workplan/priority-activity-bases/`,
		{ headers: getAuthHeaders() },
	);
	return response.data;
};

// Worker Reimbursement API
export interface WorkerReimbursement {
	total_workers: number;
	reimbursed: number;
	not_reimbursed: number;
	in_process: number;
	total_amount: number;
	reimbursed_amount: number;
	in_process_amount: number;
	not_agreed_amount: number;
	// Add other fields as needed
}

export const getWorkerReimbursement = async (spId: number) => {
	const response = await axios.get(
		`${API_BASE_URL}/sp-progress-dashboard/worker-reimbursement/?sp=${spId}`,
		{ headers: getAuthHeaders() },
	);
	return response.data;
};

// Issues API
export interface IssuesData {
	total_issues: number;
	resolved_under_60_days: number;
	resolved_over_60_days: number;
	remediation_quality: {
		poor: number;
		fair: number;
		good: number;
		excellent: number;
	};
	// Add other fields as needed
}

export const getIssues = async (spId: number) => {
	const response = await axios.get(
		`${API_BASE_URL}/sp-progress-dashboard/issues/?sp=${spId}`,
		{ headers: getAuthHeaders() },
	);
	return response.data;
};

// Worker Voice Bar Chart API
export interface WorkerVoiceBarChart {
	with_engagement: number;
	without_engagement: number;
	no_worker_voice: number;
	tier1_percentage: number;
	tier2_percentage: number;
	suppliers?: {
		completed?: string[];
		not_yet_initiated?: string[];
		partial_progress?: string[];
	};
	// Add other fields as needed
}

export const getWorkerVoiceBarChart = async (spId: number) => {
	const response = await axios.get(
		`${API_BASE_URL}/sp-progress-dashboard/wv-bar-chart/?sp=${spId}`,
		{ headers: getAuthHeaders() },
	);
	return response.data;
};

// ILM Suppliers API
export interface ILMSupplier {
	id: number;
	name: string;
	tier: number;
	country: string;
	status: string;
	worker_voice_available: boolean;
	// Add other fields as needed
}

export interface ILMSuppliersResponse {
	suppliers: ILMSupplier[];
	total_count: number;
	tier1_count: number;
	tier2_count: number;
	wv_engagement_percentage?: number;
	non_wv_engagement_percentage?: number;
	no_wv_percentage?: number;
	// Suppliers grouped by status
	suppliers_by_status?: {
		with_engagement?: string[];
		without_engagement?: string[];
		no_worker_voice?: string[];
	};
	// Add other fields as needed
}

export const getILMSuppliers = async (spId: number) => {
	const response = await axios.get(
		`${API_BASE_URL}/sp-progress-dashboard/suppliers/?sp=${spId}`,
		{ headers: getAuthHeaders() },
	);
	return response.data;
};

// Trainings API
export interface Training {
	fieldwork_date: string;
	id: number;
	name: string;
	training_name: string;
	// Add other fields as needed
}

export const getTrainings = async (spId: number) => {
	const response = await axios.get(
		`${API_BASE_URL}/supply-chain/trainings/?sp=${spId}`,
		{ headers: getAuthHeaders() },
	);
	return response.data as Training[];
};

// Export all services
export const progressDashboardService = {
	getActivityProgress,
	getAllCases,
	getWorkPlan,
	getPriorityActivityBases,
	getWorkerReimbursement,
	getIssues,
	getWorkerVoiceBarChart,
	getILMSuppliers,
	getTrainings,
};
