import { useQuery } from "@tanstack/react-query";
import {
	type JobPositionCategory,
	jobPositionCategoriesService,
} from "$src/services/jobPositionCategoriesService";

export const useJobPositionCategories = (lang: string = "en") => {
	return useQuery({
		queryKey: ["jobPositionCategories", lang],
		queryFn: async (): Promise<JobPositionCategory[]> => {
			const data = await jobPositionCategoriesService.getAll(lang);

			if (!data) {
				throw new Error("No data returned");
			}

			return data;
		},
		staleTime: 1000 * 60 * 60,
	});
};
