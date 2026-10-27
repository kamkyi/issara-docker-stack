import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useActiveLanguage } from "$src/hooks/useActiveLanguage";
import getSupplierIdFromMergedMainUser from "$src/utils/getSupplierId";

const SUPPLIER_ID = 17792;
const STAGING_CMS_URL = import.meta.env.VITE_API_BASE_URL;

const API_BASE_URL = import.meta.env.VITE_APP_CASCADE_API_URL || "";

// Helper to check if user is org-test-user
const isOrgTestUser = () => {
	try {
		const authUserRaw = localStorage.getItem("auth_user");
		const authUser = authUserRaw ? JSON.parse(authUserRaw) : {};
		let role = authUser?.role_slug || null;
		if (
			!role &&
			authUser?.groups &&
			Array.isArray(authUser.groups) &&
			authUser.groups.length > 0
		) {
			role = authUser.groups[0];
		}
		return role === "org-test-user";
	} catch {
		return false;
	}
};

export interface SupplierKpiTimelineFilters {
	supplier?: string | string[];
	partner?: string;
	country?: string;
	industry?: string;
	startTime?: string;
	endTime?: string;
	category?: number | null;
}

export function useSupplierKpiTimeline({
	supplier,
	partner,
	country,
	industry,
	startTime,
	endTime,
	category,
}: SupplierKpiTimelineFilters) {
	const lang = useActiveLanguage();
	// Use provided value, then localStorage merged_main_user, then fallback
	const supplierIdFromLS = getSupplierIdFromMergedMainUser();
	let supplierParam: string | string[] | number | null = null;

	const testUser = isOrgTestUser();

	if (testUser) {
		supplierParam = SUPPLIER_ID;
	} else if (supplier !== undefined && supplier !== null) {
		supplierParam = supplier;
	} else if (
		supplierIdFromLS !== null &&
		!Number.isNaN(Number(supplierIdFromLS))
	) {
		supplierParam = Number(supplierIdFromLS);
	} else {
		supplierParam = SUPPLIER_ID;
	}

	const partnerId =
		partner && !Number.isNaN(Number(partner)) ? Number(partner) : null;

	const kpiCategoryId = category ?? 5;
	const start = startTime ?? "2025-01-01T00:00:00Z";
	const end = endTime ?? "2025-12-31T23:59:59Z";

	const hasSupplier =
		supplierParam != null &&
		(!Array.isArray(supplierParam) ||
			(Array.isArray(supplierParam) && supplierParam.length > 0));

	return useQuery({
		queryKey: [
			"supplier-kpi-timeline-chart",
			supplierParam,
			partnerId,
			country ?? null,
			industry ?? null,
			kpiCategoryId,
			start,
			end,
			lang,
		],
		enabled: Boolean(
			(hasSupplier || partnerId) && kpiCategoryId && start && end,
		),
		queryFn: async () => {
			const token = localStorage.getItem("auth_token");
			if (!token) throw new Error("No auth token found");

			const baseUrl = testUser ? STAGING_CMS_URL : API_BASE_URL;
			const endpoint = "/cascade/supplier_kpi_timeline_chart/";
			const url = `${baseUrl}${endpoint}`;

			const params: any = {
				kpi_category_id: kpiCategoryId,
				start_time: start,
				end_time: end,
				lang,
			};

			// Add supplier_id or partner_id based on what's available
			if (partnerId) {
				params.partner_id = partnerId;
			} else if (supplierParam) {
				// supplierParam may be a number, CSV string, or array
				params.supplier_id = supplierParam as any;
			}

			// Optional demographic filters (comma-separated multi-values)
			if (country) {
				params.country = country;
			}
			if (industry) {
				params.industry = industry;
			}

			const res = await axios.get(url, {
				params,
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
			return res.data;
		},
	});
}
