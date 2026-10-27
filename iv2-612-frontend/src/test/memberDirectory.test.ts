import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	fetchAllGlobalBuyerPages,
	getGlobalBuyersApiUrl,
} from "$src/hooks/useGlobalBuyers";
import {
	canViewGlobalBuyerDetailsForRole,
	canViewGlobalBuyersForRole,
	getCompanyLocation,
	getCompanyLogo,
	getPolicyApiEntries,
	getPolicyEntries,
	mergePolicyEntries,
	resolveAssetUrl,
} from "$src/utils/memberDirectory";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

vi.mock("axios");

afterEach(() => {
	vi.clearAllMocks();
});

describe("member directory global buyer access", () => {
	it("allows suppliers to view the Global Buyers directory tab", () => {
		expect(canViewGlobalBuyersForRole("org-supplier")).toBe(true);
		expect(canViewGlobalBuyersForRole("Supplier")).toBe(true);
	});

	it("does not show the Global Buyers directory tab to global partners", () => {
		expect(canViewGlobalBuyersForRole("org-global-partner")).toBe(false);
		expect(canViewGlobalBuyersForRole("global_partner")).toBe(false);
	});

	it("allows global partners to view Global Buyer detail pages directly", () => {
		expect(canViewGlobalBuyerDetailsForRole("org-global-partner")).toBe(true);
		expect(canViewGlobalBuyerDetailsForRole("global_partner")).toBe(true);
	});

	it("keeps internal tester access tied to supplier view mode", () => {
		expect(canViewGlobalBuyersForRole("org-test-user")).toBe(false);
		expect(canViewGlobalBuyersForRole("org-test-user", "supplier-view")).toBe(
			true,
		);
	});
});

describe("member directory logo resolution", () => {
	it("uses strategic partner logo values without changing absolute URLs", () => {
		expect(
			getCompanyLogo({
				logo: "https://example.com/logos/buyer.png",
				imageicon: 42,
			}),
		).toBe("https://example.com/logos/buyer.png");
	});

	it("resolves Django media URLs from the ILM API base", () => {
		expect(
			getCompanyLogo({
				logo: "/media/partners/shared/buyer.png",
			}),
		).toBe(`${apiBaseUrl}/media/partners/shared/buyer.png`);
	});

	it("resolves shared file objects from imageicon", () => {
		expect(
			getCompanyLogo({
				imageicon: {
					file_path: "/media/partners/shared/buyer.png",
				},
			}),
		).toBe(`${apiBaseUrl}/media/partners/shared/buyer.png`);
	});

	it("does not treat numeric imageicon ids as image URLs", () => {
		expect(
			getCompanyLogo({
				imageicon: 42,
			}),
		).toBe("");
	});
});

describe("member directory location formatting", () => {
	it("formats city and country from direct location strings", () => {
		expect(
			getCompanyLocation({
				city: "Yangon",
				country: "Myanmar",
			}),
		).toBe("Yangon, Myanmar");
	});

	it("uses resolved city and country names for location ids", () => {
		expect(
			getCompanyLocation(
				{
					addresses: [
						{
							city_id: 2,
							country_id: 9,
						},
					],
				},
				{
					cityName: "Bangkok",
					countryName: "Thailand",
				},
			),
		).toBe("Bangkok, Thailand");
	});

	it("uses resolved city and country names from a singular address", () => {
		expect(
			getCompanyLocation(
				{
					address: {
						city_id: 2,
						country_id: 9,
					},
				},
				{
					cityName: "Mueang Samut Sakhon",
					countryName: "Thailand",
				},
			),
		).toBe("Mueang Samut Sakhon, Thailand");
	});

	it("does not display unresolved numeric location ids", () => {
		expect(
			getCompanyLocation({
				city: 2,
				country: 9,
			}),
		).toBe("");

		expect(
			getCompanyLocation({
				city: "2",
				country: "9",
			}),
		).toBe("");
	});

	it("does not duplicate matching city and country text", () => {
		expect(
			getCompanyLocation({
				city: "Thailand",
				country: "Thailand",
			}),
		).toBe("Thailand");
	});
});

describe("member directory policy entries", () => {
	it("uses only workplan-backed file fields", () => {
		expect(
			getPolicyEntries({
				policy_compliances: [
					{
						id: 1,
						policy_compliance: { name: "Human Rights Policy" },
						text_value: "Human Rights, Forced Labor",
						file: {
							url: "/media/other/shared/human-rights.pdf",
							name: "human-rights.pdf",
						},
					},
				],
				policy_files: [
					{
						id: 2,
						document_type_display: "Ethical Recruitment",
						file_path: "/media/other/shared/recruitment.pdf",
						name: "recruitment.pdf",
					},
				],
			}),
		).toEqual([
			{
				id: "workplan-2",
				label: "Ethical Recruitment",
				text: "",
				tags: [],
				link: "",
				fileUrl: `${apiBaseUrl}/media/other/shared/recruitment.pdf`,
				fileName: "recruitment.pdf",
				sourceType: "file",
			},
		]);
	});

	it("falls back to workplan-backed file fields", () => {
		expect(
			getPolicyEntries({
				policy_files: [
					{
						id: 11,
						document_name: "Human Rights Policy",
						document_type_display: "Human Rights",
						file_path: "other/shared/human-rights.pdf",
						name: "human-rights.pdf",
					},
				],
				compliance_files: [
					{
						id: 12,
						document_type_display: "Audit Reports",
						file_path: "other/shared/audit-report.pdf",
						name: "audit-report.pdf",
						description: "Latest report",
					},
				],
			}),
		).toEqual([
			{
				id: "workplan-11",
				label: "Human Rights Policy",
				text: "",
				tags: [],
				link: "",
				fileUrl: resolveAssetUrl("other/shared/human-rights.pdf"),
				fileName: "human-rights.pdf",
				sourceType: "file",
			},
		]);
	});

	it("omits supply chain and audit report documents", () => {
		expect(
			getPolicyEntries({
				workplan_files: [
					{
						id: 41,
						document_type: "supply_chain",
						document_type_display: "Supply Chain",
						file_path: "other/shared/supply-chain.pdf",
						name: "supply-chain.pdf",
					},
					{
						id: 42,
						document_type: "audit_reports",
						document_type_display: "Audit Reports",
						file_path: "other/shared/audit-report.pdf",
						name: "audit-report.pdf",
					},
					{
						id: 43,
						document_type: "worker_voice",
						document_type_display: "Worker Voice",
						file_path: "other/shared/worker-voice.pdf",
						name: "worker-voice.pdf",
					},
				],
			}),
		).toEqual([
			{
				id: "workplan-43",
				label: "Worker Voice",
				text: "",
				tags: ["Worker Voice"],
				link: "",
				fileUrl: resolveAssetUrl("other/shared/worker-voice.pdf"),
				fileName: "worker-voice.pdf",
				sourceType: "file",
			},
		]);
	});

	it("keeps documents that have no document type", () => {
		expect(
			getPolicyEntries({
				workplan_files: [
					{
						id: 51,
						document_name: "Untyped Policy",
						file_path: "other/shared/untyped.pdf",
						name: "untyped.pdf",
					},
				],
			}),
		).toEqual([
			{
				id: "workplan-51",
				label: "Untyped Policy",
				text: "",
				tags: [],
				link: "",
				fileUrl: resolveAssetUrl("other/shared/untyped.pdf"),
				fileName: "untyped.pdf",
				sourceType: "file",
			},
		]);
	});

	it("includes extra workplan files when policy and compliance buckets are present", () => {
		expect(
			getPolicyEntries({
				policy_files: [
					{
						id: 11,
						document_name: "Human Rights Policy",
						document_type_display: "Human Rights",
						file_path: "other/shared/human-rights.pdf",
						name: "human-rights.pdf",
					},
				],
				compliance_files: [
					{
						id: 12,
						document_type_display: "Audit Reports",
						file_path: "other/shared/audit-report.pdf",
						name: "audit-report.pdf",
					},
				],
				workplan_files: [
					{
						id: 11,
						document_name: "Human Rights Policy",
						document_type_display: "Human Rights",
						file_path: "other/shared/human-rights.pdf",
						name: "human-rights.pdf",
					},
					{
						id: 13,
						document_type_display: "Worker Voice",
						file_path: "other/shared/worker-voice.pdf",
						name: "worker-voice.pdf",
					},
				],
			}),
		).toEqual([
			{
				id: "workplan-11",
				label: "Human Rights Policy",
				text: "",
				tags: [],
				link: "",
				fileUrl: resolveAssetUrl("other/shared/human-rights.pdf"),
				fileName: "human-rights.pdf",
				sourceType: "file",
			},
			{
				id: "workplan-13",
				label: "Worker Voice",
				text: "",
				tags: [],
				link: "",
				fileUrl: resolveAssetUrl("other/shared/worker-voice.pdf"),
				fileName: "worker-voice.pdf",
				sourceType: "file",
			},
		]);
	});

	it("collapses repeated workplan document types for the same file", () => {
		expect(
			getPolicyEntries({
				workplan_files: [
					{
						id: 31,
						document_type: "human_rights",
						document_type_display: "Human Rights",
						file_path: "other/shared/file-sample.pdf",
						name: "file-sample.pdf",
					},
					{
						id: 31,
						document_type: "ethical_recruitment",
						document_type_display: "Ethical Recruitment",
						file_path: "other/shared/file-sample.pdf",
						name: "file-sample.pdf",
					},
				],
			}),
		).toEqual([
			{
				id: "workplan-31",
				label: "Human Rights",
				text: "",
				tags: ["Human Rights", "Ethical Recruitment"],
				link: "",
				fileUrl: resolveAssetUrl("other/shared/file-sample.pdf"),
				fileName: "file-sample.pdf",
				sourceType: "file",
			},
		]);
	});

	it("turns valid workplan document URLs into shortened link rows", () => {
		expect(
			getPolicyEntries({
				policy_files: [
					{
						id: 22,
						document_name: "https://www.google.com",
						file_path: "other/shared/screenshot.png",
						name: "screenshot 2026-06-04 at 18.33.01 (1).png",
					},
				],
			}),
		).toEqual([
			{
				id: "workplan-22",
				label: "www.google.com",
				text: "",
				tags: [],
				link: resolveAssetUrl("other/shared/screenshot.png"),
				fileUrl: resolveAssetUrl("other/shared/screenshot.png"),
				fileName: "screenshot 2026-06-04 at 18.33.01 (1).png",
				sourceType: "file",
			},
		]);
	});

	it("maps company-profile policy API records into directory rows", () => {
		expect(
			getPolicyApiEntries([
				{
					id: 2,
					title: "Human Rights Policy",
					type: "file",
					category_slugs: ["human-rights", "forced-labor"],
					file_url: "/media/other/shared/human-rights.pdf",
					file_name: "human-rights.pdf",
				},
				{
					id: 3,
					title: "Climate Transition Plan 2030",
					type: "link",
					category_slugs: ["climate"],
					link_url: "https://example.com/climate",
				},
				{
					id: 4,
					title: "First Global Ha Ha",
					type: "text",
					category_slugs: ["human-rights", "forced-labor", "recruitment"],
					text_value: "First Global",
				},
			]),
		).toEqual([
			{
				id: "policy-2",
				label: "Human Rights Policy",
				text: "Human rights, Forced labor",
				description: undefined,
				tags: ["Human rights", "Forced labor"],
				link: undefined,
				fileUrl: `${apiBaseUrl}/media/other/shared/human-rights.pdf`,
				fileName: "human-rights.pdf",
				sourceType: "file",
			},
			{
				id: "policy-3",
				label: "Climate Transition Plan 2030",
				text: "Climate resilience",
				description: undefined,
				tags: ["Climate resilience"],
				link: "https://example.com/climate",
				fileUrl: undefined,
				fileName: "",
				sourceType: "link",
			},
			{
				id: "policy-4",
				label: "First Global Ha Ha",
				text: "Human rights, Forced labor, Ethical / responsible recruitment",
				description: "First Global",
				tags: [
					"Human rights",
					"Forced labor",
					"Ethical / responsible recruitment",
				],
				link: undefined,
				fileUrl: undefined,
				fileName: "",
				sourceType: "text",
			},
		]);
	});

	it("merges policy rows without duplicating the same action", () => {
		expect(
			mergePolicyEntries([
				{
					id: "workplan-1",
					label: "Human Rights Policy",
					fileUrl: "https://example.com/human-rights.pdf",
				},
				{
					id: "policy-1",
					label: "Human Rights Policy",
					fileUrl: "https://example.com/human-rights.pdf",
				},
				{
					id: "policy-2",
					label: "Climate Plan",
					link: "https://example.com/climate",
				},
			]),
		).toEqual([
			{
				description: undefined,
				fileName: undefined,
				id: "workplan-1",
				label: "Human Rights Policy",
				fileUrl: "https://example.com/human-rights.pdf",
				link: undefined,
				tags: [],
				text: undefined,
			},
			{
				id: "policy-2",
				label: "Climate Plan",
				link: "https://example.com/climate",
			},
		]);
	});

	it("merges policy file rows with different hosts but the same media path", () => {
		expect(
			mergePolicyEntries([
				{
					id: "workplan-31",
					label: "Supply Chain File",
					fileUrl:
						"https://legacy.example.test/media/other/shared/supply-chain.pdf",
					fileName: "supply-chain.pdf",
					sourceType: "file",
					tags: ["Human Rights"],
				},
				{
					id: "policy-12",
					label: "Updated Supply Chain File",
					fileUrl:
						"https://api.example.test/media/other/shared/supply-chain.pdf",
					fileName: "supply-chain.pdf",
					sourceType: "file",
					tags: ["Forced labor"],
				},
			]),
		).toEqual([
			{
				description: undefined,
				fileName: "supply-chain.pdf",
				fileUrl:
					"https://legacy.example.test/media/other/shared/supply-chain.pdf",
				id: "workplan-31",
				label: "Supply Chain File",
				link: undefined,
				sourceType: "file",
				tags: ["Human Rights", "Forced labor"],
				text: undefined,
			},
		]);
	});

	it("uses file name fallback when a saved policy file has no URL", () => {
		expect(
			mergePolicyEntries([
				{
					id: "workplan-31",
					label: "Supply Chain File",
					fileUrl:
						"https://legacy.example.test/media/other/shared/supply-chain.pdf",
					fileName: "supply-chain.pdf",
					sourceType: "file",
				},
				{
					id: "policy-12",
					label: "Updated Supply Chain File",
					fileName: "supply-chain.pdf",
					sourceType: "file",
				},
			]),
		).toEqual([
			{
				description: undefined,
				fileName: "supply-chain.pdf",
				fileUrl:
					"https://legacy.example.test/media/other/shared/supply-chain.pdf",
				id: "workplan-31",
				label: "Supply Chain File",
				link: undefined,
				sourceType: "file",
				tags: [],
				text: undefined,
			},
		]);
	});
});

describe("global buyers API URL resolution", () => {
	it("uses the local app API URL in local mode", () => {
		expect(
			getGlobalBuyersApiUrl("local", "http://localhost:8000/api/v2/"),
		).toBe("http://localhost:8000/api/v2");
	});

	it("uses the staging CMS API URL in staging mode", () => {
		expect(
			getGlobalBuyersApiUrl("staging", "http://localhost:8000/api/v2"),
		).toBe("https://staging.cms.issarainstitute.org/api/v2");
	});

	it("uses the production CMS API URL in production mode", () => {
		expect(
			getGlobalBuyersApiUrl(
				"production",
				"https://staging.cms.issarainstitute.org/api/v2",
			),
		).toBe("https://cms.issarainstitute.org/api/v2");
	});
});

describe("global buyers pagination", () => {
	it("fetches all strategic partner pages before filtering", async () => {
		vi.mocked(axios.get)
			.mockResolvedValueOnce({
				data: {
					results: [{ id: 10 }],
					next: "https://example.com/api/v2/strategicpartners/?page=2",
				},
			})
			.mockResolvedValueOnce({
				data: {
					results: [{ id: 49 }, { id: 50 }],
					next: null,
				},
			});

		await expect(
			fetchAllGlobalBuyerPages(
				"https://example.com/api/v2/strategicpartners/?page_size=100",
			),
		).resolves.toEqual([{ id: 10 }, { id: 49 }, { id: 50 }]);

		expect(axios.get).toHaveBeenCalledTimes(2);
	});
});
