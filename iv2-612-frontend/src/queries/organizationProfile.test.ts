import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// Mock axios to prevent the router → routeTree.gen → marketplace → MUI icons
// import chain from exhausting OS file handles during module resolution.
vi.mock("$src/api/axios", () => ({
	api: {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		patch: vi.fn(),
		delete: vi.fn(),
	},
}));

import { api } from "$src/api/axios";
import {
	getProfileStrength,
	ORGANIZATION_PROFILE_QUERY_KEY,
	type OrganizationImage,
	type OrganizationProfile,
	resolveOrganizationAssetUrl,
	unwrapOrganizationImages,
	useUploadOrganizationLogo,
} from "./organizationProfile";

const emptyProfile: OrganizationProfile = {
	id: 1,
	name: "",
	logo: null,
	description: null,
	website: null,
	organization_type: null,
	countries_of_registration: [],
	countries_of_operation: [],
	languages_supported: [],
	core_focus_areas: [],
	stakeholder_groups: [],
	nace_codes: [],
	created_at: null,
	updated_at: null,
};

describe("getProfileStrength", () => {
	it("is 0 before the profile has loaded", () => {
		expect(getProfileStrength(undefined)).toBe(0);
	});

	it("is 0 for a profile with nothing filled in", () => {
		expect(getProfileStrength(emptyProfile)).toBe(0);
	});

	it("is 100 once every field carries a value", () => {
		expect(
			getProfileStrength({
				...emptyProfile,
				name: "WageIndicator",
				description: "Wage transparency.",
				website: "https://wageindicator.org",
				organization_type: "international_ngo",
				countries_of_registration: [1],
				countries_of_operation: [1, 2],
				languages_supported: ["en"],
				core_focus_areas: ["living_wage"],
				stakeholder_groups: ["women_workers"],
				nace_codes: ["02.20"],
			}),
		).toBe(100);
	});

	it("counts each filled field once", () => {
		expect(
			getProfileStrength({
				...emptyProfile,
				name: "WageIndicator",
				description: "Wage transparency.",
			}),
		).toBe(20);
	});

	// An empty selection is a field the CSO has not answered, even though the
	// API returns [] rather than null for it.
	it("does not count an empty list as filled", () => {
		expect(
			getProfileStrength({
				...emptyProfile,
				nace_codes: [],
				name: "Only name",
			}),
		).toBe(10);
	});

	it("does not count whitespace as filled", () => {
		expect(getProfileStrength({ ...emptyProfile, name: "   " })).toBe(0);
	});
});

describe("unwrapOrganizationImages", () => {
	const image: OrganizationImage = {
		id: 1,
		image: "/media/organization.png",
		created_at: "2026-08-20T00:00:00Z",
	};

	it("accepts Django REST Framework's paginated list shape", () => {
		expect(unwrapOrganizationImages({ results: [image] })).toEqual([image]);
	});

	it("also accepts an unpaginated list", () => {
		expect(unwrapOrganizationImages([image])).toEqual([image]);
	});
});

describe("resolveOrganizationAssetUrl", () => {
	it("keeps absolute and temporary preview URLs unchanged", () => {
		expect(resolveOrganizationAssetUrl("https://cdn.example/logo.png")).toBe(
			"https://cdn.example/logo.png",
		);
		expect(resolveOrganizationAssetUrl("blob:preview-id")).toBe(
			"blob:preview-id",
		);
	});
});

describe("useUploadOrganizationLogo", () => {
	it("uploads the logo and updates the cached organization profile", async () => {
		const queryClient = new QueryClient({
			defaultOptions: { mutations: { retry: false } },
		});
		queryClient.setQueryData(ORGANIZATION_PROFILE_QUERY_KEY, emptyProfile);
		vi.mocked(api.post).mockResolvedValueOnce({
			data: { logo: "/media/organizations/logo.png" },
		});
		const wrapper = ({ children }: { children: ReactNode }) =>
			createElement(QueryClientProvider, { client: queryClient }, children);
		const { result } = renderHook(() => useUploadOrganizationLogo(), {
			wrapper,
		});
		const file = new File(["logo"], "logo.png", { type: "image/png" });

		await act(async () => {
			await result.current.mutateAsync(file);
		});

		expect(api.post).toHaveBeenCalledOnce();
		const [url, body] = vi.mocked(api.post).mock.calls[0];
		expect(url).toMatch(/\/cascade\/organizations\/me\/logo\/$/);
		expect(body).toBeInstanceOf(FormData);
		expect((body as FormData).get("logo")).toBe(file);
		expect(
			queryClient.getQueryData<OrganizationProfile>(
				ORGANIZATION_PROFILE_QUERY_KEY,
			)?.logo,
		).toMatch(/\/media\/organizations\/logo\.png$/);
	});
});
