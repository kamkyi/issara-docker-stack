import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PollFormData } from "$components/modals/pollSteps/types";
import {
	fetchWorkforcePollCharts,
	fetchWorkforcePollResults,
	savePollDraft,
} from "$src/services/pollManagementService";

const { mockPost, mockGet } = vi.hoisted(() => ({
	mockPost: vi.fn(),
	mockGet: vi.fn(),
}));

vi.mock("$src/api/axios", () => ({
	api: {
		post: mockPost,
		get: mockGet,
		patch: vi.fn(),
		delete: vi.fn(),
	},
}));

const baseFormData: PollFormData = {
	title: "Safety Survey",
	description: "Basic info description should persist",
	isScheduled: false,
	startDate: "",
	endDate: "",
	targetGroup: "specific",
	selectedGenders: ["M", "F"],
	selectedNationalities: ["1", "2"],
	ageRange: [18, 65],
	question: "How are working conditions?",
	inputType: "single",
	answerOptions: [
		{ id: "1", text: "Good" },
		{ id: "2", text: "Bad" },
	],
};

describe("pollManagementService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	it("sends description in draft payload", async () => {
		localStorage.setItem("auth_token", "token-123");
		mockPost.mockResolvedValueOnce({
			status: 201,
			data: { id: 999 },
		});

		await savePollDraft(baseFormData);

		expect(mockPost).toHaveBeenCalledTimes(1);
		const [url, payload, config] = mockPost.mock.calls[0] as [
			string,
			Record<string, unknown>,
			{ headers?: Record<string, string> },
		];
		expect(url).toContain("/polls/manage");
		expect(payload).toMatchObject({
			title: "Safety Survey",
			description: "Basic info description should persist",
			question_text: "How are working conditions?",
			status: "draft",
		});
		expect(config.headers).toMatchObject({
			Authorization: "Bearer token-123",
		});
	});

	it("sends supplier target context in poll payload", async () => {
		localStorage.setItem("auth_token", "token-123");
		mockPost.mockResolvedValueOnce({
			status: 201,
			data: { id: 999 },
		});

		await savePollDraft(baseFormData, {
			targetId: 17792,
			targetType: "supplier",
		});

		const [, payload] = mockPost.mock.calls[0] as [
			string,
			Record<string, unknown>,
		];
		expect(payload).toMatchObject({
			target_id: "17792",
			target_type: "supplier",
		});
	});

	it("maps results endpoint with separate question and poll description", async () => {
		localStorage.setItem("auth_token", "token-123");
		mockGet.mockResolvedValueOnce({
			data: [
				{
					id: 1,
					title: "Title",
					description: "How are you?",
					question_text: "How are you?",
					poll_description: "Basic info description from poll creation",
					choices: [{ id: 11, description: "Yes", votes_count: 3 }],
					nationality_ids: [1],
					gender_labels: ["F"],
				},
			],
		});

		const rows = await fetchWorkforcePollResults();

		expect(rows).toHaveLength(1);
		expect(rows[0].description).toBe("How are you?");
		expect(rows[0].question_text).toBe("How are you?");
		expect(rows[0].poll_description).toBe(
			"Basic info description from poll creation",
		);
	});

	it("maps manage endpoint fallback where description is poll description", async () => {
		localStorage.setItem("auth_token", "token-123");
		mockGet.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({
			data: [
				{
					id: 2,
					title: "Health Survey",
					description: "Poll-level description",
					question_text: "What is your health concern?",
					choices: [{ id: 21, text: "None", votes_count: 0 }],
					nationality_ids: [2],
					gender_labels: ["M"],
				},
			],
		});

		const rows = await fetchWorkforcePollResults();

		expect(mockGet).toHaveBeenCalledTimes(2);
		expect(rows).toHaveLength(1);
		expect(rows[0].description).toBe("What is your health concern?");
		expect(rows[0].question_text).toBe("What is your health concern?");
		expect(rows[0].poll_description).toBe("Poll-level description");
	});

	it("falls back to table results when charts endpoint returns 404", async () => {
		localStorage.setItem("auth_token", "token-123");
		mockGet
			.mockRejectedValueOnce({ response: { status: 404 } })
			.mockResolvedValueOnce({
				data: [
					{
						id: 11,
						created_at: "2025-01-10T00:00:00Z",
						choices: [
							{ id: 1, description: "Yes", votes_count: 4 },
							{ id: 2, description: "No", votes_count: 1 },
						],
						nationality_ids: [1],
						gender_labels: ["M"],
					},
					{
						id: 12,
						created_at: "2025-03-01T00:00:00Z",
						choices: [{ id: 3, description: "OK", votes_count: 3 }],
						nationality_ids: [2],
						gender_labels: ["F"],
					},
				],
			});

		const result = await fetchWorkforcePollCharts();

		expect(mockGet).toHaveBeenCalledTimes(2);
		expect(result.summary).toEqual({
			average_polls_by_year: 2,
			total_polls: 2,
			total_polls_response: 8,
		});
		expect(result.nationality_distribution).toEqual([
			{
				name: "Myanmar",
				share_percent: 62.5,
				total_votes: 5,
				poll_count: 1,
			},
			{
				name: "Thailand",
				share_percent: 37.5,
				total_votes: 3,
				poll_count: 1,
			},
		]);
		expect(result.meta.years).toEqual([2025]);
		expect(result.meta.nationality_keys).toEqual(["Myanmar", "Thailand"]);
		expect(result.meta.gender_keys).toEqual(["Male", "Female"]);
		expect(result.nationality_line_series).toEqual([
			{ year: 2025, Myanmar: 1, Thailand: 1 },
		]);
		expect(result.gender_line_series).toEqual([
			{ year: 2025, Male: 1, Female: 1 },
		]);
	});
});
