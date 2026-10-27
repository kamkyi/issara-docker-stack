import { useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";
import { getCascadeApiUrl } from "$src/utils/config";

/**
 * NACE Rev. 2.1 — the EU standard classification of economic activities,
 * published by Eurostat. Backed by cascade-api `/nace-codes`.
 *
 * This is a standalone reference list for CSO-facing dropdowns. It is
 * deliberately NOT mapped onto the existing ILM `industries` /
 * `sub_industries` data, which stays the source of truth for suppliers.
 */

/** 1 = section (A), 2 = division (01), 3 = group (01.1), 4 = class (01.11). */
export const NACE_LEVEL = {
	SECTION: 1,
	DIVISION: 2,
	GROUP: 3,
	CLASS: 4,
} as const;

export type NaceLevel = (typeof NACE_LEVEL)[keyof typeof NACE_LEVEL];

export interface NaceCode {
	id: number;
	/** NACE notation as displayed: "A", "01", "01.1", "01.11". */
	code: string;
	level: NaceLevel;
	parent_code: string | null;
	/** Section letter, denormalised so the UI can group without walking up. */
	section_code: string;
	label: string;
	/** Official publication order — the list arrives already sorted by it. */
	sort_order: number;
}

/** Kept lowercase mid-heading, the way the classification itself prints them. */
const MINOR_WORDS = new Set([
	"and",
	"as",
	"at",
	"by",
	"for",
	"from",
	"in",
	"of",
	"on",
	"or",
	"the",
	"to",
	"with",
]);

/** Section labels arrive ALL CAPS from the source; soften them for display. */
export function naceTitleCase(text: string): string {
	let startOfSegment = true;
	return text.toLowerCase().replace(/[a-z]+|[;.]/g, (token) => {
		if (token === ";" || token === ".") {
			startOfSegment = true;
			return token;
		}
		const capitalized = `${token.charAt(0).toUpperCase()}${token.slice(1)}`;
		const rendered =
			startOfSegment || !MINOR_WORDS.has(token) ? capitalized : token;
		startOfSegment = false;
		return rendered;
	});
}

function requireBase(): string {
	const base = getCascadeApiUrl();
	if (!base) {
		throw new Error("Cascade API URL is not configured");
	}
	return base;
}

/**
 * The full classification (1047 entries), in official order.
 *
 * The list is static reference data, so it is fetched once and cached for the
 * session rather than re-requested per dropdown.
 */
export const useNaceCodes = () =>
	useQuery<NaceCode[]>({
		queryKey: ["nace-codes"],
		queryFn: async () => {
			const response = await api.get<{ data: { nace_codes: NaceCode[] } }>(
				`${requireBase()}/nace-codes`,
			);
			return response.data.data.nace_codes;
		},
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: Number.POSITIVE_INFINITY,
	});
