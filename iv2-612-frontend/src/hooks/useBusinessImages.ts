import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BusinessImage } from "$src/services/businessImagesService";
import {
	deleteBusinessImage,
	deleteEmployerCoverImage,
	fetchBusinessImages,
	fetchEmployerCoverImages,
	uploadBusinessImage,
	uploadEmployerCoverImage,
} from "$src/services/businessImagesService";

// ── Supplier: employer-cover-images ──────────────────────────────────────────

export const useEmployerCoverImages = (employerProfileId: number | null) => {
	return useQuery({
		queryKey: ["employer-cover-images", employerProfileId],
		queryFn: () => {
			if (employerProfileId == null) {
				throw new Error("employerProfileId is required");
			}
			return fetchEmployerCoverImages(employerProfileId);
		},
		enabled: employerProfileId != null && employerProfileId > 0,
	});
};

export const useUploadEmployerCoverImage = (employerProfileId: number) => {
	const queryClient = useQueryClient();
	const queryKey = ["employer-cover-images", employerProfileId];
	return useMutation({
		mutationFn: (file: File) =>
			uploadEmployerCoverImage(file, employerProfileId),
		onSuccess: (newImage) => {
			queryClient.setQueryData<BusinessImage[]>(queryKey, (prev = []) => [
				...prev,
				newImage,
			]);
			queryClient.invalidateQueries({ queryKey });
		},
	});
};

export const useDeleteEmployerCoverImage = (employerProfileId: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: number) => deleteEmployerCoverImage(id),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["employer-cover-images", employerProfileId],
			});
		},
	});
};

// ── RA: bussiness-images ──────────────────────────────────────────────────────

export const useRaBusinessImages = (gdUserId?: number | null) => {
	return useQuery({
		queryKey: ["ra-bussiness-images", gdUserId],
		queryFn: () => fetchBusinessImages(gdUserId),
	});
};

export const useUploadRaBusinessImage = (gdUserId?: number | null) => {
	const queryClient = useQueryClient();
	const queryKey = ["ra-bussiness-images", gdUserId];
	return useMutation({
		mutationFn: (file: File) => uploadBusinessImage(file, gdUserId),
		onSuccess: (newImage) => {
			queryClient.setQueryData<BusinessImage[]>(queryKey, (prev = []) => [
				...prev,
				newImage,
			]);
			queryClient.invalidateQueries({ queryKey });
		},
	});
};

export const useDeleteRaBusinessImage = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: number) => deleteBusinessImage(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["ra-bussiness-images"] });
		},
	});
};
