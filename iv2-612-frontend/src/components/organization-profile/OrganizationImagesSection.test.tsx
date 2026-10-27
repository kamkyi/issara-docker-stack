import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMocks = vi.hoisted(() => ({
	upload: vi.fn(),
	remove: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
	success: vi.fn(),
	error: vi.fn(),
}));

vi.mock("$src/queries/organizationProfile", () => {
	return {
		ORGANIZATION_IMAGES_QUERY_KEY: ["organization-profile-images"],
		useOrganizationImages: () => ({ data: [], isLoading: false }),
		useUploadOrganizationImage: () => ({
			mutateAsync: queryMocks.upload,
			isPending: false,
		}),
		useDeleteOrganizationImage: () => ({
			mutateAsync: queryMocks.remove,
			isPending: false,
		}),
	};
});

vi.mock("$src/components/toast/toastUtil", () => ({
	showToast: toastMocks,
}));

import OrganizationImagesSection from "./OrganizationImagesSection";

const renderSection = () => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const invalidate = vi.spyOn(queryClient, "invalidateQueries");
	const view = render(
		<QueryClientProvider client={queryClient}>
			<OrganizationImagesSection />
		</QueryClientProvider>,
	);
	return { ...view, invalidate };
};

describe("OrganizationImagesSection uploads", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Object.defineProperty(URL, "createObjectURL", {
			configurable: true,
			value: vi.fn(() => "blob:organization-preview"),
		});
		Object.defineProperty(URL, "revokeObjectURL", {
			configurable: true,
			value: vi.fn(),
		});
	});

	it("keeps one stable preview and shows progress until the server accepts it", async () => {
		let finishUpload: ((value: unknown) => void) | undefined;
		queryMocks.upload.mockImplementation(
			({ onProgress }: { onProgress: (percentage: number) => void }) => {
				onProgress(42);
				return new Promise((resolve) => {
					finishUpload = resolve;
				});
			},
		);

		const { container, invalidate } = renderSection();
		fireEvent.click(screen.getByRole("button", { name: /edit/i }));

		const fileInput =
			container.querySelector<HTMLInputElement>('input[type="file"]');
		expect(fileInput).not.toBeNull();
		fireEvent.change(fileInput as HTMLInputElement, {
			target: {
				files: [
					new File(["image"], "team.png", {
						type: "image/png",
						lastModified: 1,
					}),
				],
			},
		});

		expect(screen.getAllByRole("img", { name: "team.png" })).toHaveLength(1);
		fireEvent.click(screen.getByRole("button", { name: /save/i }));

		expect(await screen.findByText("Uploading 42%")).toBeInTheDocument();
		expect(screen.getAllByRole("img", { name: "team.png" })).toHaveLength(1);
		expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();

		await act(async () => {
			finishUpload?.({
				id: 12,
				image: "/media/team.png",
				created_at: "2026-08-20T00:00:00Z",
			});
		});

		await waitFor(() => expect(toastMocks.success).toHaveBeenCalledOnce());
		expect(invalidate).toHaveBeenCalledOnce();
		expect(URL.revokeObjectURL).toHaveBeenCalledWith(
			"blob:organization-preview",
		);
	});
});
