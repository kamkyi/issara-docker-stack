import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	addAnnouncementReaction,
	createAnnouncement,
	deleteAnnouncement,
	fetchAnnouncementDetail,
	fetchAnnouncements,
	markAnnouncementAsRead,
	postAnnouncementComment,
	removeAnnouncementReaction,
	updateAnnouncement,
} from "$src/services/announcementService";

const { mockDelete, mockGet, mockPatch, mockPost } = vi.hoisted(() => ({
	mockDelete: vi.fn(),
	mockGet: vi.fn(),
	mockPatch: vi.fn(),
	mockPost: vi.fn(),
}));

vi.mock("$src/api/axios", () => ({
	api: {
		delete: mockDelete,
		get: mockGet,
		patch: mockPatch,
		post: mockPost,
	},
}));

describe("announcementService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	it("creates an announcement with auth headers and multipart image payload", async () => {
		localStorage.setItem("auth_token", "token-123");
		mockPost.mockResolvedValueOnce({ data: { id: 7 } });
		const image = new File(["image"], "announcement.jpg", {
			type: "image/jpeg",
		});

		const result = await createAnnouncement({
			description: "Worker update",
			images: [image],
			title: "Factory announcement",
		});

		expect(result).toEqual({ id: 7 });
		expect(mockPost).toHaveBeenCalledTimes(1);
		const [url, payload, config] = mockPost.mock.calls[0] as [
			string,
			FormData,
			{ headers?: Record<string, string> },
		];

		expect(url).toContain("/message-board/manage");
		expect(config.headers).toMatchObject({
			Authorization: "Bearer token-123",
		});
		expect(payload).toBeInstanceOf(FormData);
		expect(payload.get("body")).toBe("Worker update");
		expect(payload.get("description")).toBe("Worker update");
		expect(payload.get("image")).toBe(image);
		expect(payload.get("status")).toBe("published");
		expect(payload.get("target_id")).toBeNull();
		expect(payload.get("target_type")).toBeNull();
		expect(payload.get("title")).toBe("Factory announcement");
	});

	it("creates an announcement with multipart payload when no image is selected", async () => {
		mockPost.mockResolvedValueOnce({ data: { id: 8 } });

		await createAnnouncement({
			description: "Worker update",
			title: "Factory announcement",
		});

		const [, payload] = mockPost.mock.calls[0] as [string, FormData];

		expect(payload).toBeInstanceOf(FormData);
		expect(payload.get("body")).toBe("Worker update");
		expect(payload.get("description")).toBe("Worker update");
		expect(payload.get("image")).toBeNull();
		expect(payload.get("status")).toBe("published");
		expect(payload.get("target_id")).toBeNull();
		expect(payload.get("target_type")).toBeNull();
		expect(payload.get("title")).toBe("Factory announcement");
	});

	it("adds supplier target fields when creating a company announcement", async () => {
		mockPost.mockResolvedValueOnce({ data: { id: 9 } });

		await createAnnouncement({
			description: "Company update",
			targetId: 456,
			targetType: "supplier",
			title: "Targeted announcement",
		});

		const [, payload] = mockPost.mock.calls[0] as [string, FormData];

		expect(payload.get("target_id")).toBe("456");
		expect(payload.get("target_type")).toBe("supplier");
	});

	it("updates an announcement with multipart payload", async () => {
		mockPatch.mockResolvedValueOnce({ data: { id: 42 } });
		const image = new File(["image"], "replacement.png", {
			type: "image/png",
		});

		const result = await updateAnnouncement(42, {
			description: "Updated worker update",
			images: [image],
			targetId: 456,
			targetType: "supplier",
			title: "Updated announcement",
		});

		expect(result).toEqual({ id: 42 });
		expect(mockPatch).toHaveBeenCalledTimes(1);
		const [url, payload, config] = mockPatch.mock.calls[0] as [
			string,
			FormData,
			{ headers?: Record<string, string> },
		];

		expect(url).toContain("/message-board/manage/42");
		expect(config.headers).toEqual({});
		expect(payload.get("body")).toBe("Updated worker update");
		expect(payload.get("description")).toBe("Updated worker update");
		expect(payload.get("image")).toBe(image);
		expect(payload.get("status")).toBe("published");
		expect(payload.get("target_id")).toBe("456");
		expect(payload.get("target_type")).toBe("supplier");
		expect(payload.get("title")).toBe("Updated announcement");
	});

	it("deletes an announcement via cascade manage endpoint", async () => {
		mockDelete.mockResolvedValueOnce({
			data: { success: true },
			status: 204,
		});

		const result = await deleteAnnouncement(42);

		expect(result).toEqual({ data: { success: true }, status: 204 });
		expect(mockDelete).toHaveBeenCalledWith(
			expect.stringContaining("/message-board/manage/42"),
			expect.objectContaining({
				headers: expect.any(Object),
			}),
		);
	});

	it("fetches and normalizes announcement list rows", async () => {
		localStorage.setItem("auth_token", "token-123");
		mockGet.mockResolvedValueOnce({
			data: {
				posts: [
					{
						author_name: "staff@example.com",
						body: "Worker update",
						id: "8",
						image_url: "https://cms.example.test/image.jpg",
						posted: "2026-05-11T01:00:00Z",
						title: "Factory announcement",
					},
				],
			},
		});

		const result = await fetchAnnouncements();

		expect(result).toEqual([
			{
				comments_count: 0,
				description: "Worker update",
				id: 8,
				image_url: "https://cms.example.test/image.jpg",
				like_count: 0,
				love_count: 0,
				posted: "2026-05-11T01:00:00Z",
				sad_count: 0,
				title: "Factory announcement",
				username: "staff@example.com",
			},
		]);
		expect(mockGet).toHaveBeenCalledWith(
			expect.stringContaining("/message-board/manage"),
			{
				headers: {
					Authorization: "Bearer token-123",
				},
				params: {
					page: 1,
					page_size: 100,
				},
			},
		);
	});

	it("fetches message board post detail from cascade endpoint", async () => {
		mockGet.mockResolvedValueOnce({
			data: {
				comments: [],
				id: 19,
				title: "Post detail",
			},
		});

		await fetchAnnouncementDetail(19);

		expect(mockGet).toHaveBeenCalledWith(
			expect.stringContaining("/message-board/manage/19"),
			expect.objectContaining({
				headers: expect.any(Object),
			}),
		);
	});

	it("posts comments to the cascade message board endpoint", async () => {
		mockPost.mockResolvedValueOnce({
			data: {
				author_name: "Supplier User",
				content: "Hi workers",
				created_at: "2026-05-11T01:00:00Z",
				id: 22,
				is_anonymous: false,
			},
		});

		await postAnnouncementComment(44, {
			authorName: "Supplier User",
			content: "Hi workers",
			sessionKey: "session-1",
		});

		expect(mockPost).toHaveBeenCalledWith(
			expect.stringContaining("/message-board/manage/44/comments"),
			expect.objectContaining({
				author_name: "Supplier User",
				content: "Hi workers",
			}),
			expect.objectContaining({
				headers: expect.any(Object),
			}),
		);
	});

	it("marks a post as read via cascade endpoint", async () => {
		mockPost.mockResolvedValueOnce({
			data: { ok: true },
			status: 200,
		});

		await markAnnouncementAsRead(31);

		expect(mockPost).toHaveBeenCalledWith(
			expect.stringContaining("/message-board/manage/31/read"),
			undefined,
			expect.objectContaining({
				headers: expect.any(Object),
			}),
		);
	});

	it("creates and removes reactions via cascade endpoint", async () => {
		mockPost.mockResolvedValueOnce({
			data: { ok: true },
			status: 201,
		});
		mockDelete.mockResolvedValueOnce({
			data: { ok: true },
			status: 200,
		});

		await addAnnouncementReaction(12, "love");
		await removeAnnouncementReaction(12, "love");

		expect(mockPost).toHaveBeenCalledWith(
			expect.stringContaining("/message-board/manage/12/reactions"),
			{
				reaction: "love",
			},
			expect.objectContaining({
				headers: expect.any(Object),
			}),
		);
		expect(mockDelete).toHaveBeenCalledWith(
			expect.stringContaining("/message-board/manage/12/reactions"),
			expect.objectContaining({
				data: {
					reaction: "love",
				},
			}),
		);
	});
});
