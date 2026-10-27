// src/hooks/useLocalization.ts
// Centralized exports for all localization hooks

export { useCities } from "./useCities";
export { useCountries } from "./useCommonData";
// Re-export existing hooks for convenience
export { useIndustries } from "./useIndustries";
export { useStates } from "./useStates";

// Types for localization data
export interface Country {
	id: number;
	name: string;
	code?: string;
}

export interface State {
	id: number;
	name: string;
	country_id: number;
	code?: string;
}

export interface City {
	id: number;
	name: string;
	state_id: number;
	country_id: number;
	code?: string;
}

export interface Industry {
	id: number;
	name: string;
	description?: string;
}
