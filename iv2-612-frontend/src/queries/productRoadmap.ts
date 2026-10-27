import { useQuery } from "@tanstack/react-query";
import { getProductRoadmap } from "$src/services/productRoadmap";

export const QUERY_KEYS = {
	productRoadmap: ["product-roadmap"],
};

export function useProductRoadmap() {
	return useQuery({
		queryKey: QUERY_KEYS.productRoadmap,
		queryFn: getProductRoadmap,
	});
}
