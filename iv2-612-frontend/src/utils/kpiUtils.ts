import moment from "moment";

const STATUS_BY_ID: Record<number, string> = {
	1: "No Progress",
	2: "Some Progress",
	3: "Closed",
	4: "Old",
};

const PURPLE = "#7B1FA2";
const BLOOD_RED = "#B71C1C";
const YELLOW = "#ffe599";
const ORANGE = "#ff9800";
const BLACK = "#000000";
const GREY = "#b7b7b7";

const getSupplierKpiStatusFromId = (statusId: number): string => {
	return STATUS_BY_ID[statusId] || "No Progress";
};

export const KPI_STATUS_LEGENDS = [
	{ label: "Active Under 15 days", color: BLACK },
	{ label: "Some Progress (16-59 days)", color: YELLOW },
	{ label: "No Progress (31-59 days)", color: ORANGE },
	{ label: "Some Progress (60+ days)", color: PURPLE },
	{ label: "No Progress (60+ days)", color: BLOOD_RED },
] as const;

export const CLOSED_QUALITY_LEGENDS = [
	{ label: "Poor", color: "#EF4444" },
	{ label: "Fair", color: "#F97316" },
	{ label: "Good", color: "#EAB308" },
	{ label: "Excellent", color: "#22C55E" },
] as const;

export const kpiUtils = {
	getAffectedWorkersRangeForSupplier: (
		affectedWorkers: number | null | undefined,
	): string => {
		if (
			affectedWorkers === null ||
			affectedWorkers === undefined ||
			affectedWorkers <= 10
		) {
			return "1-10";
		}
		if (affectedWorkers <= 50) return "11-50";
		if (affectedWorkers <= 100) return "51-100";
		if (affectedWorkers <= 500) return "101-500";
		if (affectedWorkers <= 1000) return "501-1000";
		return "1000+";
	},
	getDaysActive: (openedAt: string): number => moment().diff(openedAt, "days"),
	getStatusColor: (daysActive: number, statusId: number): string => {
		const status = getSupplierKpiStatusFromId(statusId);
		if (status === "Some Progress" && daysActive >= 60) return PURPLE;
		if (status === "No Progress" && daysActive >= 60) return BLOOD_RED;
		if (daysActive > 30 && daysActive < 60 && status === "No Progress") {
			return ORANGE;
		}
		if (daysActive > 15 && daysActive < 60 && status === "Some Progress") {
			return YELLOW;
		}
		if (daysActive <= 15) return BLACK;
		return GREY;
	},
	getStatusString: (daysActive: number, statusId: number): string => {
		const status = getSupplierKpiStatusFromId(statusId);
		if (daysActive <= 15) return "Active Under 15 days";
		if (status === "Some Progress") {
			if (daysActive >= 60) return "Some Progress for over 60 days";
			return "Some Progress";
		}
		if (status === "No Progress") {
			if (daysActive >= 60) return "No Progress for over 60 days";
			return "No Progress";
		}
		return "No Progress";
	},
};
