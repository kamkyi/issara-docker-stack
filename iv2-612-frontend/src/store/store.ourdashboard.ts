import { create } from "zustand";

type State = {
	quarterA: Date;
	quarterB: Date;
	startDate: Date | null;
	endDate: Date | null;
};

type Action = {
	updateQuarterA: (quartreA: State["quarterA"]) => void;
	updateQuarterB: (quarterB: State["quarterB"]) => void;
	setStartDate: (date: Date) => void;
	setEndDate: (date: Date) => void;
};

const now = new Date();
const sixMonthsAgo = new Date(
	now.getFullYear(),
	now.getMonth() - 6,
	now.getDate(),
);

const useCompanyDashboardStore = create<State & Action>((set) => ({
	quarterA: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
	quarterB: new Date(),
	startDate: sixMonthsAgo,

	endDate: now,
	updateQuarterA: (qA) => set({ quarterA: qA }),
	updateQuarterB: (qB) => set({ quarterB: qB }),
	setStartDate: (date) => set({ startDate: date }),
	setEndDate: (date) => set({ endDate: date }),
}));

export default useCompanyDashboardStore;
