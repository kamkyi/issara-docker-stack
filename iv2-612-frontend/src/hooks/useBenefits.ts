import { useQuery } from "@tanstack/react-query";
import {
	type Benefit,
	type BenefitCategory,
	benefitsService,
} from "$src/services/benefitsService";
import { useActiveLanguage } from "./useActiveLanguage";

export const useBenefits = (langOverride?: string) => {
	const activeLang = useActiveLanguage();
	const lang = langOverride ?? activeLang;
	return useQuery({
		queryKey: ["benefits", lang],
		queryFn: (): Promise<Benefit[] | null> => benefitsService.getAll(lang),
		staleTime: 1000 * 60 * 60, // 1 hour
		gcTime: 1000 * 60 * 60 * 24, // 24 hours
	});
};

export const useBenefit = (id: number, langOverride?: string) => {
	const activeLang = useActiveLanguage();
	const lang = langOverride ?? activeLang;
	return useQuery({
		queryKey: ["benefit", id, lang],
		queryFn: (): Promise<Benefit | null> => benefitsService.getById(id, lang),
		enabled: !!id,
		staleTime: 1000 * 60 * 60, // 1 hour
	});
};

export const useBenefitCategories = (langOverride?: string) => {
	const activeLang = useActiveLanguage();
	const lang = langOverride ?? activeLang;
	return useQuery({
		queryKey: ["benefitCategories", lang],
		queryFn: (): Promise<BenefitCategory[] | null> =>
			benefitsService.getCategories(lang),
		staleTime: 1000 * 60 * 60, // 1 hour
		gcTime: 1000 * 60 * 60 * 24, // 24 hours
	});
};
