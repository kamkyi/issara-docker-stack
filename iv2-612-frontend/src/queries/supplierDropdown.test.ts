/**
 * The request layer behind the Worker Voice supplier picker (IV2-582).
 *
 * Django paginates `/supplier_list_dropdown/` with a DRF cursor, so "load more"
 * means lifting the opaque cursor out of the `next` URL rather than counting
 * pages. That extraction is the whole of the pagination logic, so it is pinned
 * here alongside the request shapes the endpoint expects.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "$src/api/axios";

vi.mock("$src/api/axios", () => ({ api: { get: vi.fn() } }));

import {
	cursorFromNextUrl,
	fetchSupplierById,
	fetchSupplierLocation,
	fetchSupplierPage,
} from "./suppliers";

const requestedUrl = () => vi.mocked(api.get).mock.calls[0][0] as string;

beforeEach(() => {
	vi.mocked(api.get).mockReset();
});

describe("cursorFromNextUrl", () => {
	it("lifts the cursor out of the next page URL", () => {
		expect(
			cursorFromNextUrl(
				"http://localhost:8000/api/v2/supplier_list_dropdown/?cursor=cD0xODA1NQ%3D%3D&name=sea",
			),
		).toBe("cD0xODA1NQ==");
	});

	it("reads the last page as having no next cursor", () => {
		expect(cursorFromNextUrl(null)).toBeNull();
	});

	it("does not throw on a URL it cannot parse", () => {
		expect(cursorFromNextUrl("not a url")).toBeNull();
	});
});

describe("fetchSupplierPage", () => {
	it("searches server-side and reports there is another page", async () => {
		vi.mocked(api.get).mockResolvedValue({
			data: {
				next: "http://localhost:8000/api/v2/supplier_list_dropdown/?cursor=abc",
				previous: null,
				results: [{ id: 1, name: "Alpha Seafood" }],
			},
		} as never);

		const page = await fetchSupplierPage("alpha", null);

		expect(requestedUrl()).toContain("/supplier_list_dropdown/?name=alpha");
		expect(page.suppliers).toHaveLength(1);
		expect(page.nextCursor).toBe("abc");
	});

	it("asks for the next page by cursor, not by re-listing", async () => {
		vi.mocked(api.get).mockResolvedValue({
			data: { next: null, previous: null, results: [] },
		} as never);

		const page = await fetchSupplierPage("alpha", "abc");

		expect(requestedUrl()).toContain("name=alpha");
		expect(requestedUrl()).toContain("cursor=abc");
		expect(page.nextCursor).toBeNull();
	});

	it("sends no name at all for an empty search", async () => {
		vi.mocked(api.get).mockResolvedValue({
			data: { next: null, previous: null, results: [] },
		} as never);

		await fetchSupplierPage("", null);

		expect(requestedUrl()).not.toContain("name=");
	});
});

describe("fetchSupplierById", () => {
	it("resolves a single saved id through the ?id= filter", async () => {
		vi.mocked(api.get).mockResolvedValue({
			data: {
				next: null,
				previous: null,
				results: [{ id: 18055, name: "India-Supplier" }],
			},
		} as never);

		const supplier = await fetchSupplierById(18055);

		expect(requestedUrl()).toContain("id=18055");
		expect(supplier?.name).toBe("India-Supplier");
	});

	it("reads a supplier the CSO cannot see as absent rather than throwing", async () => {
		vi.mocked(api.get).mockResolvedValue({
			data: { next: null, previous: null, results: [] },
		} as never);

		expect(await fetchSupplierById(18055)).toBeNull();
	});
});

describe("fetchSupplierLocation", () => {
	it("reads the location off the existing supplier-detail endpoint", async () => {
		// The same endpoint the legacy call wizard reads for its auto-fill, so
		// the `suppliers` row stays the one source of supplier location.
		vi.mocked(api.get).mockResolvedValue({
			data: { country: 18, province: 204, district: 3011 },
		} as never);

		const location = await fetchSupplierLocation(18055);

		expect(requestedUrl()).toContain("/suppliers/18055/");
		expect(location).toEqual({
			countryId: 18,
			provinceId: 204,
			districtId: 3011,
		});
	});

	it("reads a supplier with no location on file as empty, not undefined", async () => {
		vi.mocked(api.get).mockResolvedValue({
			data: { country: 18, province: null, district: null },
		} as never);

		expect(await fetchSupplierLocation(18055)).toEqual({
			countryId: 18,
			provinceId: null,
			districtId: null,
		});
	});
});
