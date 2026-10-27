import { useQuery } from "@tanstack/react-query";
import { progressDashboardService } from "../services/progressDashboardService";

const retryUnless404 = (failureCount: number, error: unknown) => {
	const status = (error as { response?: { status?: number } })?.response
		?.status;
	if (status === 404) {
		return false;
	}
	return failureCount < 2;
};

// Hook for Activity Progress
export const useActivityProgress = (spId: number) => {
	return useQuery({
		queryKey: ["activityProgress", spId],
		queryFn: () => progressDashboardService.getActivityProgress(spId),
		enabled: !!spId,
	});
};

// Hook for All Cases
export const useAllCases = (spId: number) => {
	return useQuery({
		queryKey: ["allCases", spId],
		queryFn: () => progressDashboardService.getAllCases(spId),
		enabled: !!spId,
	});
};

// Hook for Work Plan
export const useWorkPlan = (spId: number) => {
	return useQuery({
		queryKey: ["workPlan", spId],
		queryFn: () => progressDashboardService.getWorkPlan(spId),
		enabled: !!spId,
	});
};

// Hook for Worker Reimbursement
export const useWorkerReimbursement = (spId: number) => {
	return useQuery({
		queryKey: ["workerReimbursement", spId],
		queryFn: () => progressDashboardService.getWorkerReimbursement(spId),
		enabled: !!spId,
		retry: retryUnless404,
		refetchOnWindowFocus: false,
	});
};

// Hook for Issues
export const useIssues = (spId: number) => {
	return useQuery({
		queryKey: ["issues", spId],
		queryFn: () => progressDashboardService.getIssues(spId),
		enabled: !!spId,
		retry: retryUnless404,
		refetchOnWindowFocus: false,
	});
};

// Hook for Worker Voice Bar Chart
export const useWorkerVoiceBarChart = (spId: number) => {
	return useQuery({
		queryKey: ["workerVoiceBarChart", spId],
		queryFn: () => progressDashboardService.getWorkerVoiceBarChart(spId),
		enabled: !!spId,
		retry: retryUnless404,
		refetchOnWindowFocus: false,
	});
};

// Hook for ILM Suppliers
export const useILMSuppliers = (spId: number) => {
	return useQuery({
		queryKey: ["ilmSuppliers", spId],
		queryFn: () => progressDashboardService.getILMSuppliers(spId),
		enabled: !!spId,
		retry: retryUnless404,
		refetchOnWindowFocus: false,
	});
};

// Hook for Priority Activity Bases
export const usePriorityActivityBases = () => {
	return useQuery({
		queryKey: ["priorityActivityBases"],
		queryFn: () => progressDashboardService.getPriorityActivityBases(),
	});
};

// Hook for Trainings
export const useTrainings = (spId: number) => {
	return useQuery({
		queryKey: ["trainings", spId],
		queryFn: () => progressDashboardService.getTrainings(spId),
		enabled: !!spId,
	});
};
