import { api } from "$src/api/axios";

export interface Collaborator {
	team: string;
	note?: string;
}

export interface ProductRoadmapFeature {
	id: number;
	release_id: number;
	name: string;
	desc: string | null;
	status: string | null;
	date: string | null;
	info_url: string | null;
	jira_key?: string | null;
	jira_url?: string | null;
	collaborators: Collaborator[] | null;
}

export interface ProductRoadmapRelease {
	id: number;
	name: string;
	state: "upcoming" | "released" | "tbc";
	when: string | null;
	summary: string | null;
	features: ProductRoadmapFeature[];
}

export interface ProductRoadmapNote {
	id: number;
	featured: boolean;
	products: string[] | null;
	type: string | null;
	status: string | null;
	group: string | null;
	title: string;
	desc: string | null;
	url: string | null;
	jira_key?: string | null;
	jira_url?: string | null;
}

export interface ProductRoadmapSprintTask {
	id: string | number;
	name: string;
	status: string;
	raw_status?: string;
	due_date?: string | null;
	priority?: string | null;
	labels?: string[];
	feature: string;
	components?: string[];
	assignee: string;
	desc: string;
	deps: string[];
	requested_by: string;
	jira_key?: string | null;
	jira_url?: string | null;
	created_at?: string | null;
	updated_at?: string | null;
}

export interface ProductRoadmapActiveSprint {
	id: number;
	name: string;
	start_date: string;
	end_date: string;
	is_active: boolean;
}

export interface ProductRoadmapMeta {
	id: number;
	last_updated: string | null;
	covering_since: string | null;
}

export interface ProductRoadmapResponse {
	releases: ProductRoadmapRelease[];
	meta?: ProductRoadmapMeta | null;
	notes: ProductRoadmapNote[];
	types: { id: number; name: string }[];
	statuses: { id: number; name: string }[];
	activeSprint?: ProductRoadmapActiveSprint;
	sprintTasks?: ProductRoadmapSprintTask[];
	backlogTasks?: ProductRoadmapSprintTask[];
}

export const getProductRoadmap = async (): Promise<ProductRoadmapResponse> => {
	const cascadeBase = (import.meta.env.VITE_APP_CASCADE_API_URL || "").replace(
		/\/$/,
		"",
	);
	if (!cascadeBase) {
		throw new Error("VITE_APP_CASCADE_API_URL is missing!");
	}
	const { data } = await api.get<ProductRoadmapResponse>(
		`${cascadeBase}/product-roadmap`,
	);
	if (typeof data === "string") {
		throw new Error(
			"Received HTML/string instead of JSON! URL was: " + cascadeBase,
		);
	}
	return data;
};
