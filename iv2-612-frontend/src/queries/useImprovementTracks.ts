import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";
import improvementTracksMock from "$src/assets/mock/improvement-tracks.json";
import { useMockData } from "$src/utils/config";

export type ActivityStatus = "done" | "progress" | "todo";

export interface TrackActivity {
	name: string;
	status: ActivityStatus;
	slug?: string | null;
}

export interface TrackStage {
	key: string;
	label: string;
	status: ActivityStatus;
	activities: TrackActivity[];
}

export interface ImprovementTrack {
	key: string;
	label: string;
	color: string;
	stages: TrackStage[];
	totals: { done: number; progress: number; todo: number; total: number };
}

export interface EngagementRow {
	activity: string;
	track: string;
	location: string;
	date: string;
	user: string;
	role: string;
}

export interface ImprovementTracksResponse {
	supplier_id: string | null;
	stages: { key: string; label: string }[];
	tracks: ImprovementTrack[];
	engagement: EngagementRow[];
}

export interface ImprovementTracksParams {
	supplierId?: string | number | null;
}

export function useImprovementTracks(params?: ImprovementTracksParams) {
	const { supplierId } = params || {};
	const shouldUseMock = useMockData();

	const queryParams = new URLSearchParams();
	if (supplierId) queryParams.append("supplier_id", `${supplierId},`);
	// In mock mode we still hit the real endpoint so we get the real Marketplace
	// solutions/categories/types — the backend only fabricates the per-activity
	// status (done / in progress / not started) and the engagement feed.
	if (shouldUseMock) queryParams.append("mock", "true");
	const queryString = queryParams.toString();
	const API_URL = `${import.meta.env.VITE_APP_CASCADE_API_URL}/cascade/improvement_tracks/${
		queryString ? `?${queryString}` : ""
	}`;

	return useQuery<ImprovementTracksResponse>({
		queryKey: ["cascade-improvement-tracks", supplierId, shouldUseMock],
		placeholderData: keepPreviousData,
		queryFn: async () => {
			try {
				const res = await api.get(API_URL);
				return res.data as ImprovementTracksResponse;
			} catch (err) {
				// Offline / API unavailable: fall back to the bundled mock so the
				// dashboard still renders for tester / mock users.
				if (shouldUseMock) {
					return improvementTracksMock as ImprovementTracksResponse;
				}
				throw err;
			}
		},
	});
}
