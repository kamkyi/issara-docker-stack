import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useActiveLanguage } from "$src/hooks/useActiveLanguage";
import type { KPI, KPICategory } from "../components/selectors/KPISelector";

type CascadeKpiCategoryResponse = {
	status: "success";
	data: {
		kpi_categories: KPICategory[];
	};
};

type CascadeKpiResponse = {
	status: "success";
	data: {
		kpis: KPI[];
	};
};

/**
 * Fetch KPI Categories
 */
export const useKPICategories = () => {
	const baseUrl = import.meta.env.VITE_APP_CASCADE_API_URL || "";
	const lang = useActiveLanguage();

	return useQuery({
		queryKey: ["kpiCategories", lang],
		queryFn: async () => {
			const response = await axios.get<CascadeKpiCategoryResponse>(
				`${baseUrl}/kpi-categories?lang=${lang}`,
			);
			return response.data.data.kpi_categories;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});
};

/**
 * Fetch KPIs
 */
export const useKPIs = () => {
	const baseUrl = import.meta.env.VITE_APP_CASCADE_API_URL || "";
	const lang = useActiveLanguage();

	return useQuery({
		queryKey: ["kpis", lang],
		queryFn: async () => {
			const response = await axios.get<CascadeKpiResponse>(
				`${baseUrl}/kpi?lang=${lang}`,
			);
			return response.data.data.kpis;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});
};

/**
 * Fetch Supplier KPIs
 */
export const useSupplierKPIs = (params?: Record<string, string | boolean>) => {
	// const clientVersion = import.meta.env.VITE_CLIENT_VERSION || '3.0'
	const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
	const lang = useActiveLanguage();

	const queryParams = new URLSearchParams({
		lang,
		supplychain: "false",
		Non_supplychain: "false",
		suppliersupplychain: "false",
		filterbyday: "false",
		days: "false",
		...params,
	}).toString();

	return useQuery({
		queryKey: ["supplierKPIs", lang, params],
		queryFn: async () => {
			const token = localStorage.getItem("auth_token");
			if (!token) {
				throw new Error("Authentication token not found");
			}

			const response = await axios.get<any[]>(
				`${baseUrl}/api/v2/supplierkpis_raw?${queryParams}`,
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${token}`,
					},
				},
			);
			return response.data;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});
};

/**
 * Fetch Supplier KPI Updates
 */
export const useSupplierKPIUpdates = (params?: Record<string, string>) => {
	// const clientVersion = import.meta.env.VITE_CLIENT_VERSION || '3.0'
	const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
	const lang = useActiveLanguage();

	const queryParams = new URLSearchParams({
		lang,
		...params,
	}).toString();

	return useQuery({
		queryKey: ["supplierKPIUpdates", lang, params],
		queryFn: async () => {
			const token = localStorage.getItem("auth_token");
			if (!token) {
				throw new Error("Authentication token not found");
			}

			const response = await axios.get<{ results: any[] }>(
				`${baseUrl}/api/v2/supplier-kpi-updates/?${queryParams}`,
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${token}`,
					},
				},
			);
			return response.data.results;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});
};
