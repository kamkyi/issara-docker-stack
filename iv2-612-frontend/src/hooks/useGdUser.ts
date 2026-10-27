import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateGdUserAvatar } from "$src/services/gdUserService";

export const useUpdateGdUserAvatar = (gdUserId: number | null) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (file: File) => {
			if (gdUserId == null) {
				throw new Error("gdUserId is required");
			}
			return updateGdUserAvatar(gdUserId, file);
		},
		onSuccess: () => {
			if (gdUserId != null) {
				queryClient.invalidateQueries({ queryKey: ["gd-user", gdUserId] });
			}
		},
	});
};
