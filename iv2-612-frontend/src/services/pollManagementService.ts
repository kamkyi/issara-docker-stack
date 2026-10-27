import type { AxiosError } from "axios";
import {
	getChoiceTextsForPayload,
	type PollFormData,
} from "$components/modals/pollSteps/types";
import { api } from "$src/api/axios";

const APP_ENVIRONMENT = import.meta.env.VITE_APP_ENVIRONMENT;

const CASCADE_API_URL =
	APP_ENVIRONMENT === "staging"
		? "https://cascadestagingbackend.issarainstitute.org/api/v1"
		: APP_ENVIRONMENT === "production"
			? "https://cascadebackend.issarainstitute.org/api/v1"
			: (import.meta.env.VITE_APP_CASCADE_API_URL ?? "").replace(/\/$/, "");

const MANAGE_BASE = `${CASCADE_API_URL}/polls/manage`;
const POLL_RESULTS_TABLE_BASE = `${CASCADE_API_URL}/polls/results/table`;
const POLL_RESULTS_CHARTS_BASE = `${CASCADE_API_URL}/polls/results/charts`;

export interface ManagePollPayload {
	title: string;
	description: string;
	question_text: string;
	input_type: PollFormData["inputType"];
	status: "draft" | "published";
	start_date: string | null;
	end_date: string | null;
	age_min: number;
	age_max: number;
	nationality_ids: number[];
	gender_labels: string[];
	target_type?: "supplier" | "recruiter" | null;
	target_id?: string | null;
	choices: { text: string }[];
}

export type PollTargetContext = {
	targetId?: number | string | null;
	targetType?: "supplier" | "recruiter" | null;
};

interface RawPollChoice {
	id?: number | string;
	description?: string | null;
	text?: string | null;
	votes_count?: number | null;
	vote_count?: number | null;
	votes?: number | null;
}

interface RawPollRow {
	id?: number | string;
	poll_description?: string | null;
	description?: string | null;
	question_text?: string | null;
	question?: string | null;
	title?: string | null;
	created_at?: string | null;
	created?: string | null;
	language?: string | null;
	choices?: RawPollChoice[] | null;
	total_votes?: number | null;
	votes_count?: number | null;
	country?: number[] | null;
	country_ids?: number[] | null;
	nationality?: number[] | null;
	nationality_ids?: number[] | null;
	gender?: string[] | null;
	gender_labels?: string[] | null;
	status?: string | null;
	age_min?: number | null;
	age_max?: number | null;
	input_type?: string | null;
	start_date?: string | null;
	end_date?: string | null;
}

export interface WorkforcePollResultRow {
	id: number | string;
	description: string;
	poll_description: string;
	question_text: string;
	created_at: string;
	language: string;
	choices: Array<{
		id: number | string;
		description: string | null;
		votes_count: number;
	}>;
	totalVotes: number;
	country: number[];
	nationality: number[];
	gender: string[];
	status: string;
	title: string;
	age_min: number;
	age_max: number;
	input_type: string;
	start_date: string | null;
	end_date: string | null;
}

export interface FetchWorkforcePollResultsParams {
	start_date?: string;
	end_date?: string;
	gender?: string;
	nationality_id?: string | number;
	search?: string;
}

export interface WorkforcePollChartSummary {
	average_polls_by_year: number;
	total_polls: number;
	total_polls_response: number;
}

export interface WorkforcePollNationalityDistributionItem {
	name: string;
	share_percent: number;
	total_votes: number;
	poll_count: number;
}

export interface WorkforcePollLineSeriesRow {
	year: number;
	[key: string]: string | number;
}

export interface WorkforcePollChartsResponse {
	summary: WorkforcePollChartSummary;
	nationality_distribution: WorkforcePollNationalityDistributionItem[];
	nationality_line_series: WorkforcePollLineSeriesRow[];
	gender_line_series: WorkforcePollLineSeriesRow[];
	meta: {
		years: number[];
		nationality_keys: string[];
		gender_keys: string[];
	};
}

const NATIONALITY_LABEL_BY_ID: Record<number, string> = {
	1: "Myanmar",
	2: "Thailand",
	3: "Nepal",
	4: "Bangladesh",
	5: "India",
	6: "Cambodia",
	7: "Malaysia",
};

const GENDER_LABEL_BY_CODE: Record<string, string> = {
	M: "Male",
	F: "Female",
	N: "Prefer not to say",
	X: "Non-Binary",
};

function buildPayload(
	formData: PollFormData,
	pollStatus: "draft" | "published",
	targetContext?: PollTargetContext | null,
): ManagePollPayload {
	const targetId =
		targetContext?.targetId !== null && targetContext?.targetId !== undefined
			? String(targetContext.targetId).trim()
			: "";
	const targetType = targetContext?.targetType ?? null;
	return {
		title: formData.title,
		description: formData.description,
		question_text: formData.question,
		input_type: formData.inputType,
		status: pollStatus,
		start_date:
			formData.isScheduled && formData.startDate ? formData.startDate : null,
		end_date:
			formData.isScheduled && formData.endDate ? formData.endDate : null,
		age_min: formData.ageRange[0],
		age_max: formData.ageRange[1],
		nationality_ids: formData.selectedNationalities.map(Number),
		gender_labels: formData.selectedGenders,
		target_type: targetType && targetId ? targetType : null,
		target_id: targetType && targetId ? targetId : null,
		choices: getChoiceTextsForPayload(
			formData.inputType,
			formData.answerOptions,
		).map((text) => ({ text })),
	};
}

function getAuthHeaders() {
	const token = localStorage.getItem("auth_token");
	return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function saveAndPublishPoll(
	formData: PollFormData,
	targetContext?: PollTargetContext | null,
) {
	const payload = buildPayload(formData, "published", targetContext);
	const response = await api.post(MANAGE_BASE, payload, {
		headers: getAuthHeaders(),
	});
	return {
		status: response.status,
		data: response.data,
	};
}

export async function savePollDraft(
	formData: PollFormData,
	targetContext?: PollTargetContext | null,
) {
	const payload = buildPayload(formData, "draft", targetContext);
	const response = await api.post(MANAGE_BASE, payload, {
		headers: getAuthHeaders(),
	});
	return {
		status: response.status,
		data: response.data,
	};
}

export async function fetchManagedPolls() {
	const { data } = await api.get(MANAGE_BASE, {
		headers: getAuthHeaders(),
	});
	return data;
}

export async function unpublishPoll(pollId: number | string) {
	const response = await api.post(
		`${MANAGE_BASE}/${pollId}/unpublish`,
		undefined,
		{ headers: getAuthHeaders() },
	);
	return { status: response.status, data: response.data };
}

export async function updatePoll(
	pollId: number | string,
	formData: PollFormData,
	pollStatus: "draft" | "published",
	targetContext?: PollTargetContext | null,
) {
	const payload = buildPayload(formData, pollStatus, targetContext);
	const response = await api.patch(`${MANAGE_BASE}/${pollId}`, payload, {
		headers: getAuthHeaders(),
	});
	return { status: response.status, data: response.data };
}

export async function publishPoll(pollId: number | string) {
	const response = await api.post(
		`${MANAGE_BASE}/${pollId}/publish`,
		undefined,
		{ headers: getAuthHeaders() },
	);
	return { status: response.status, data: response.data };
}

export async function deletePoll(pollId: number | string) {
	const response = await api.delete(`${MANAGE_BASE}/${pollId}`, {
		headers: getAuthHeaders(),
	});
	return { status: response.status };
}

function toNumberArray(value: unknown): number[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value
		.map((item) => Number(item))
		.filter((item) => Number.isFinite(item));
}

function toStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value
		.map((item) => String(item).trim())
		.filter((item) => item.length > 0);
}

function normalizePollRow(row: RawPollRow): WorkforcePollResultRow {
	const rawChoices = Array.isArray(row.choices) ? row.choices : [];
	const choices = rawChoices.map((choice, index) => ({
		id: choice.id ?? `${row.id ?? "poll"}-choice-${index}`,
		description: choice.description ?? choice.text ?? null,
		votes_count: Number(
			choice.votes_count ?? choice.vote_count ?? choice.votes ?? 0,
		),
	}));
	const choicesTotalVotes = choices.reduce(
		(total, choice) => total + choice.votes_count,
		0,
	);
	const totalVotes = Number(
		row.total_votes ?? row.votes_count ?? choicesTotalVotes,
	);

	const questionText =
		row.question_text ?? row.question ?? row.title ?? "Untitled Poll";
	const pollDescription =
		row.poll_description ??
		(row.question_text && row.description !== row.question_text
			? (row.description ?? "")
			: "");

	return {
		id: row.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		description: questionText,
		poll_description: pollDescription,
		question_text: questionText,
		created_at: row.created_at ?? row.created ?? new Date().toISOString(),
		language: row.language ?? "English",
		choices,
		totalVotes,
		country: toNumberArray(row.country ?? row.country_ids),
		nationality: toNumberArray(row.nationality ?? row.nationality_ids),
		gender: toStringArray(row.gender ?? row.gender_labels),
		status: row.status ?? "",
		title: row.title ?? "",
		age_min: row.age_min ?? 18,
		age_max: row.age_max ?? 65,
		input_type: row.input_type ?? "single",
		start_date: row.start_date ?? null,
		end_date: row.end_date ?? null,
	};
}

function normalizeResultList(data: unknown): RawPollRow[] {
	if (Array.isArray(data)) {
		return data as RawPollRow[];
	}
	if (
		data &&
		typeof data === "object" &&
		Array.isArray((data as { results?: unknown[] }).results)
	) {
		return (data as { results: RawPollRow[] }).results;
	}
	if (
		data &&
		typeof data === "object" &&
		Array.isArray((data as { data?: unknown[] }).data)
	) {
		return (data as { data: RawPollRow[] }).data;
	}
	return [];
}

function getQueryParams(params?: FetchWorkforcePollResultsParams) {
	const queryParams: Record<string, string | number> = {};
	if (params?.start_date) queryParams.start_date = params.start_date;
	if (params?.end_date) queryParams.end_date = params.end_date;
	if (params?.gender) queryParams.gender = params.gender;
	if (params?.nationality_id)
		queryParams.nationality_id = params.nationality_id;
	if (params?.search) queryParams.search = params.search;
	return queryParams;
}

function toPollYear(createdAt: string): number | null {
	const year = Number(new Date(createdAt).getFullYear());
	if (!Number.isFinite(year) || year < 1900) {
		return null;
	}
	return year;
}

function getPollVoteTotal(poll: WorkforcePollResultRow) {
	return poll.choices.reduce(
		(total, choice) => total + Number(choice.votes_count || 0),
		0,
	);
}

function getNationalityLabel(nationalityId: number) {
	return (
		NATIONALITY_LABEL_BY_ID[nationalityId] ?? `Nationality ${nationalityId}`
	);
}

function getGenderLabel(gender: string) {
	const value = String(gender).trim();
	if (!value) {
		return "";
	}
	return GENDER_LABEL_BY_CODE[value] ?? value;
}

function incrementSeriesCount(
	store: Map<string, Map<number, number>>,
	key: string,
	year: number,
) {
	const countsByYear = store.get(key) ?? new Map<number, number>();
	countsByYear.set(year, (countsByYear.get(year) ?? 0) + 1);
	store.set(key, countsByYear);
}

function buildSeriesRows(
	years: number[],
	store: Map<string, Map<number, number>>,
): WorkforcePollLineSeriesRow[] {
	return years.map((year) => {
		const row: WorkforcePollLineSeriesRow = { year };
		for (const [key, countsByYear] of store.entries()) {
			row[key] = countsByYear.get(year) ?? 0;
		}
		return row;
	});
}

function buildFallbackChartsResponse(
	rows: WorkforcePollResultRow[],
): WorkforcePollChartsResponse {
	const yearSet = new Set<number>();
	const pollsByYear = new Map<number, number>();
	const nationalityVoteTotals = new Map<string, number>();
	const nationalityPollCounts = new Map<string, number>();
	const nationalitySeriesStore = new Map<string, Map<number, number>>();
	const genderSeriesStore = new Map<string, Map<number, number>>();
	let totalPollResponses = 0;

	for (const poll of rows) {
		const pollYear = toPollYear(poll.created_at);
		const pollVotes = getPollVoteTotal(poll);
		totalPollResponses += pollVotes;

		if (pollYear !== null) {
			yearSet.add(pollYear);
			pollsByYear.set(pollYear, (pollsByYear.get(pollYear) ?? 0) + 1);
		}

		const uniqueNationalities = Array.from(
			new Set(
				poll.nationality.filter((nationalityId) =>
					Number.isFinite(nationalityId),
				),
			),
		);
		for (const nationalityId of uniqueNationalities) {
			const label = getNationalityLabel(nationalityId);
			nationalityVoteTotals.set(
				label,
				(nationalityVoteTotals.get(label) ?? 0) + pollVotes,
			);
			nationalityPollCounts.set(
				label,
				(nationalityPollCounts.get(label) ?? 0) + 1,
			);
			if (pollYear !== null) {
				incrementSeriesCount(nationalitySeriesStore, label, pollYear);
			}
		}

		const uniqueGenders = Array.from(
			new Set(
				poll.gender
					.map(getGenderLabel)
					.filter((genderLabel) => genderLabel.length > 0),
			),
		);
		for (const genderLabel of uniqueGenders) {
			if (pollYear !== null) {
				incrementSeriesCount(genderSeriesStore, genderLabel, pollYear);
			}
		}
	}

	const years = Array.from(yearSet.values()).sort((a, b) => a - b);
	const totalVotesAcrossNationalities = Array.from(
		nationalityVoteTotals.values(),
	).reduce((sum, totalVotes) => sum + totalVotes, 0);

	const nationalityDistribution = Array.from(
		nationalityVoteTotals.entries(),
	).map(([name, totalVotes]) => {
		const pollCount = nationalityPollCounts.get(name) ?? 0;
		const sharePercent =
			totalVotesAcrossNationalities > 0
				? (totalVotes / totalVotesAcrossNationalities) * 100
				: 0;
		return {
			name,
			share_percent: Number(sharePercent.toFixed(2)),
			total_votes: totalVotes,
			poll_count: pollCount,
		};
	});

	nationalityDistribution.sort((a, b) => {
		if (b.total_votes === a.total_votes) {
			return b.poll_count - a.poll_count;
		}
		return b.total_votes - a.total_votes;
	});

	const totalPolls = rows.length;
	const yearCount = years.length;
	const averagePollsByYear =
		yearCount > 0 ? Number((totalPolls / yearCount).toFixed(2)) : 0;

	return {
		summary: {
			average_polls_by_year: averagePollsByYear,
			total_polls: totalPolls,
			total_polls_response: totalPollResponses,
		},
		nationality_distribution: nationalityDistribution,
		nationality_line_series: buildSeriesRows(years, nationalitySeriesStore),
		gender_line_series: buildSeriesRows(years, genderSeriesStore),
		meta: {
			years,
			nationality_keys: Array.from(nationalitySeriesStore.keys()),
			gender_keys: Array.from(genderSeriesStore.keys()),
		},
	};
}

export async function fetchWorkforcePollResults(
	params?: FetchWorkforcePollResultsParams,
) {
	const queryParams = getQueryParams(params);

	const endpoints = [POLL_RESULTS_TABLE_BASE, MANAGE_BASE];
	let lastError: unknown = null;

	for (const endpoint of endpoints) {
		try {
			const response = await api.get(endpoint, {
				headers: getAuthHeaders(),
				params: queryParams,
			});
			const rows = normalizeResultList(response.data);
			if (rows.length > 0 || endpoint === MANAGE_BASE) {
				return rows.map(normalizePollRow);
			}
		} catch (error) {
			lastError = error;
		}
	}

	if (lastError) {
		throw lastError;
	}
	return [];
}

export async function fetchWorkforcePollCharts(
	params?: FetchWorkforcePollResultsParams,
): Promise<WorkforcePollChartsResponse> {
	const queryParams = getQueryParams(params);

	try {
		const response = await api.get(POLL_RESULTS_CHARTS_BASE, {
			headers: getAuthHeaders(),
			params: queryParams,
		});
		return response.data as WorkforcePollChartsResponse;
	} catch (error) {
		const status = (error as AxiosError | undefined)?.response?.status;
		const shouldFallback = status === 404 || status === 405;
		if (!shouldFallback) {
			throw error;
		}
		const rows = await fetchWorkforcePollResults(params);
		return buildFallbackChartsResponse(rows);
	}
}
