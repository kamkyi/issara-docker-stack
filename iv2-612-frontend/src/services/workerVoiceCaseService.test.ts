import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "$src/api/axios";
import {
	deleteWorkerVoiceCase,
	fetchWorkerVoiceCases,
	updateWorkerVoiceCase,
	type WorkerVoiceCasePayload,
} from "$src/services/workerVoiceCaseService";

vi.mock("$src/api/axios", () => ({
	api: {
		get: vi.fn(),
		delete: vi.fn(),
		patch: vi.fn(),
	},
}));

const mockedGet = vi.mocked(api.get);
const mockedDelete = vi.mocked(api.delete);
const mockedPatch = vi.mocked(api.patch);

describe("worker voice case list", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv("VITE_API_BASE_URL", "https://ilm.example.test/api/v2");
		mockedGet.mockResolvedValue({
			data: { count: 0, next: null, previous: null, results: [] },
		} as never);
	});

	it("asks the server for one page rather than the whole caseload", async () => {
		await fetchWorkerVoiceCases({ limit: 10, offset: 20 });

		expect(mockedGet).toHaveBeenCalledWith(
			"https://ilm.example.test/api/v2/cascade/worker-voice-calls/",
			{ params: { limit: 10, offset: 20 } },
		);
	});

	it("sends the search term so the match covers the whole caseload", async () => {
		await fetchWorkerVoiceCases({ search: "passport" });

		expect(mockedGet.mock.calls[0][1]?.params).toEqual({
			limit: 25,
			offset: 0,
			search: "passport",
		});
	});

	it("trims the term, so a stray space is not searched for", async () => {
		await fetchWorkerVoiceCases({ search: "  passport  " });

		expect(mockedGet.mock.calls[0][1]?.params).toMatchObject({
			search: "passport",
		});
	});

	it("omits an empty search instead of sending a blank filter", async () => {
		await fetchWorkerVoiceCases({ search: "   " });

		expect(mockedGet.mock.calls[0][1]?.params).not.toHaveProperty("search");
	});

	it("sends each column box under its own name, alongside the free text", async () => {
		await fetchWorkerVoiceCases({
			search: "passport",
			filters: { worker: "Aung", kpi_risk: "FORCED_LABOR" },
		});

		expect(mockedGet.mock.calls[0][1]?.params).toEqual({
			limit: 25,
			offset: 0,
			search: "passport",
			worker: "Aung",
			kpi_risk: "FORCED_LABOR",
		});
	});

	it("omits a column box the officer has not filled in", async () => {
		await fetchWorkerVoiceCases({ filters: { worker: "  ", id: "7" } });

		const params = mockedGet.mock.calls[0][1]?.params;
		expect(params).not.toHaveProperty("worker");
		expect(params).toMatchObject({ id: "7" });
	});

	it("defaults to the first page when called with nothing", async () => {
		await fetchWorkerVoiceCases();

		expect(mockedGet.mock.calls[0][1]?.params).toEqual({
			limit: 25,
			offset: 0,
		});
	});
});

describe("deleting a worker voice case", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv("VITE_API_BASE_URL", "https://ilm.example.test/api/v2");
		mockedDelete.mockResolvedValue({ data: null } as never);
	});

	it("addresses the call by id", async () => {
		await deleteWorkerVoiceCase(42);

		expect(mockedDelete).toHaveBeenCalledWith(
			"https://ilm.example.test/api/v2/cascade/worker-voice-calls/42/",
		);
	});
});

describe("editing a worker voice case", () => {
	const payload = {
		interaction_summary: "Follow-up call.",
	} as WorkerVoiceCasePayload;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv("VITE_API_BASE_URL", "https://ilm.example.test/api/v2");
		mockedPatch.mockResolvedValue({ data: { id: 7 } } as never);
	});

	it("tells the server which saved files the officer took off the call", async () => {
		await updateWorkerVoiceCase(7, payload, [], [11, 12]);

		expect(mockedPatch.mock.calls[0][1]).toMatchObject({
			removed_attachment_ids: [11, 12],
		});
	});

	it("leaves the field out when nothing was removed", async () => {
		await updateWorkerVoiceCase(7, payload);

		expect(mockedPatch.mock.calls[0][1]).not.toHaveProperty(
			"removed_attachment_ids",
		);
	});

	it("carries the removals alongside a new upload, which forces multipart", async () => {
		const file = new File(["%PDF-"], "scan.pdf", { type: "application/pdf" });

		await updateWorkerVoiceCase(7, payload, [file], [11]);

		const body = mockedPatch.mock.calls[0][1] as FormData;
		expect(body.getAll("removed_attachment_ids")).toEqual(["11"]);
		expect(body.getAll("uploaded_attachments")).toHaveLength(1);
	});
});
