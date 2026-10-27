import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PostComposerForm } from "$src/components/messageBoard/PostComposerForm";
import { showToast } from "$src/components/toast/toastUtil";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { useCreatePost } from "$src/queries/useMessageBoardMutations";
import { requireIssaraStaffAuth } from "$src/utils/auth";

export const Route = createFileRoute("/message-board_/compose")({
	beforeLoad: async () => {
		const { isAuthenticated, role } = authStatus();
		requireIssaraStaffAuth({ isAuthenticated, role });
	},
	component: ComposeRoute,
});

function ComposeRoute(): ReactNode {
	const navigate = useNavigate();
	const createMut = useCreatePost();

	return (
		<GuestLayout>
			<PostComposerForm
				mode="create"
				onCancel={() => navigate({ to: "/message-board" })}
				onSubmit={(values) =>
					createMut.mutate(values, {
						onSuccess: () => {
							showToast.success("Post published");
							navigate({ to: "/message-board" });
						},
						onError: (err) => {
							console.error(err);
							showToast.error("Could not publish post.");
						},
					})
				}
				submitting={createMut.isPending}
			/>
		</GuestLayout>
	);
}
