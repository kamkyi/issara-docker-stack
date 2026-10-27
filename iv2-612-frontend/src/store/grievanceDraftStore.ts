import { create } from "zustand";
import type { GrievanceData } from "$src/components/Grievance/GrievanceForm";

export type RemediationEntry = NonNullable<
	NonNullable<GrievanceData["list_of_text_fields"]>["remediations"]
>[number];

// Stable empty reference so the selector below returns the same array identity
// for KPIs with no draft — avoids re-render loops under zustand v5's Object.is
// equality.
const EMPTY: RemediationEntry[] = [];

interface GrievanceDraftState {
	// In-memory only (no persist middleware): typed-but-unsaved remediation
	// updates live here for the session so the KPI-detail panel can show them
	// instantly as the supplier types, and they survive collapsing/re-expanding
	// the row. They are lost on a full page reload — persistence to the backend
	// still happens only on explicit Save Draft / Submit.
	remediationsByKpi: Record<number, RemediationEntry[]>;
	setRemediations: (kpiId: number, entries: RemediationEntry[]) => void;
	clearRemediations: (kpiId: number) => void;
}

export const useGrievanceDraftStore = create<GrievanceDraftState>((set) => ({
	remediationsByKpi: {},
	setRemediations: (kpiId, entries) =>
		set((state) => ({
			remediationsByKpi: { ...state.remediationsByKpi, [kpiId]: entries },
		})),
	clearRemediations: (kpiId) =>
		set((state) => {
			if (!(kpiId in state.remediationsByKpi)) return state;
			const next = { ...state.remediationsByKpi };
			delete next[kpiId];
			return { remediationsByKpi: next };
		}),
}));

/** Live remediation entries for a single KPI (empty array when none/unknown). */
export const useRemediationDraft = (kpiId?: number): RemediationEntry[] =>
	useGrievanceDraftStore((state) =>
		kpiId != null && Number.isFinite(kpiId)
			? (state.remediationsByKpi[kpiId] ?? EMPTY)
			: EMPTY,
	);
