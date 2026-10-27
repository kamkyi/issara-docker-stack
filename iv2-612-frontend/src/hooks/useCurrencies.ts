import { useQuery } from "@tanstack/react-query";
import { type Currency, currencyService } from "$src/services/currencyService";

export const useCurrencies = () => {
	return useQuery({
		queryKey: ["currencies"],
		queryFn: async (): Promise<Currency[]> => {
			const data = await currencyService.getAll();
			if (!data) {
				throw new Error("No data returned");
			}
			return data;
		},
		staleTime: 1000 * 60 * 60, // 1 hour
	});
};
