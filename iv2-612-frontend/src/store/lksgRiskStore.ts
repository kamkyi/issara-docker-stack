import { create } from "zustand";

export type OptionType =
	| "Voluntary for direct and indirect suppliers"
	| "Mandatory for direct and indirect suppliers"
	| null;

export interface LksgRiskValues {
	workerVoiceMechanism: OptionType;
	remediationSupport: OptionType;
	humanRightsOfficerConfirmed: boolean;
	humanRightsOfficerName: string;
	seniorManagementReportingConfirmed: boolean;
	seniorManagementReportingDate: string;
}

interface LksgRiskStore extends LksgRiskValues {
	saved: LksgRiskValues;
	isDirty: boolean;
	setWorkerVoiceMechanism: (val: OptionType) => void;
	setRemediationSupport: (val: OptionType) => void;
	setHumanRightsOfficerConfirmed: (val: boolean) => void;
	setHumanRightsOfficerName: (val: string) => void;
	setSeniorManagementReportingConfirmed: (val: boolean) => void;
	setSeniorManagementReportingDate: (val: string) => void;
	setSavedState: (data: Partial<LksgRiskValues>) => void;
	saveChanges: () => void;
	/** Marks only the given fields as saved, leaving other pending edits dirty. */
	commitFields: (keys: (keyof LksgRiskValues)[]) => void;
	/** Reverts only the given fields to their last saved values. */
	resetFields: (keys: (keyof LksgRiskValues)[]) => void;
	resetChanges: () => void;
	clearStore: () => void;
}

const emptyValues: LksgRiskValues = {
	workerVoiceMechanism: null,
	remediationSupport: null,
	humanRightsOfficerConfirmed: false,
	humanRightsOfficerName: "",
	seniorManagementReportingConfirmed: false,
	seniorManagementReportingDate: "",
};

const valueKeys = Object.keys(emptyValues) as (keyof LksgRiskValues)[];

const pickValues = (state: LksgRiskValues): LksgRiskValues => ({
	workerVoiceMechanism: state.workerVoiceMechanism,
	remediationSupport: state.remediationSupport,
	humanRightsOfficerConfirmed: state.humanRightsOfficerConfirmed,
	humanRightsOfficerName: state.humanRightsOfficerName,
	seniorManagementReportingConfirmed: state.seniorManagementReportingConfirmed,
	seniorManagementReportingDate: state.seniorManagementReportingDate,
});

const isDirtyAgainst = (current: LksgRiskValues, saved: LksgRiskValues) =>
	valueKeys.some((key) => current[key] !== saved[key]);

export const useLksgRiskStore = create<LksgRiskStore>((set) => {
	// Each setter applies one field, then recomputes dirtiness against `saved`.
	const setField = <K extends keyof LksgRiskValues>(
		key: K,
		val: LksgRiskValues[K],
	) =>
		set((state) => {
			const next = { ...pickValues(state), [key]: val };
			return { ...next, isDirty: isDirtyAgainst(next, state.saved) };
		});

	return {
		...emptyValues,
		saved: emptyValues,
		isDirty: false,
		setWorkerVoiceMechanism: (val) => setField("workerVoiceMechanism", val),
		setRemediationSupport: (val) => setField("remediationSupport", val),
		setHumanRightsOfficerConfirmed: (val) =>
			setField("humanRightsOfficerConfirmed", val),
		setHumanRightsOfficerName: (val) => setField("humanRightsOfficerName", val),
		setSeniorManagementReportingConfirmed: (val) =>
			setField("seniorManagementReportingConfirmed", val),
		setSeniorManagementReportingDate: (val) =>
			setField("seniorManagementReportingDate", val),
		setSavedState: (data) =>
			set((state) => {
				if (state.isDirty) return state;
				const next = { ...emptyValues, ...data };
				return { ...next, saved: next, isDirty: false };
			}),
		saveChanges: () =>
			set((state) => ({ saved: pickValues(state), isDirty: false })),
		commitFields: (keys) =>
			set((state) => {
				const saved = { ...state.saved };
				for (const key of keys) {
					(saved as any)[key] = state[key];
				}
				return { saved, isDirty: isDirtyAgainst(pickValues(state), saved) };
			}),
		resetFields: (keys) =>
			set((state) => {
				const next = { ...pickValues(state) };
				for (const key of keys) {
					(next as any)[key] = state.saved[key];
				}
				return { ...next, isDirty: isDirtyAgainst(next, state.saved) };
			}),
		resetChanges: () => set((state) => ({ ...state.saved, isDirty: false })),
		clearStore: () =>
			set({ ...emptyValues, saved: emptyValues, isDirty: false }),
	};
});
