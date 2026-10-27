import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useMemo } from "react";
import {
	PostComposerForm,
	type PostComposerInitial,
} from "$src/components/messageBoard/PostComposerForm";
import { showToast } from "$src/components/toast/toastUtil";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { useMessageBoard } from "$src/queries/useMessageBoard";
import { useUpdatePost } from "$src/queries/useMessageBoardMutations";
import { requireIssaraStaffAuth } from "$src/utils/auth";

export const Route = createFileRoute("/message-board_/$postId/edit")({
	beforeLoad: async () => {
		const { isAuthenticated, role } = authStatus();
		requireIssaraStaffAuth({ isAuthenticated, role });
	},
	component: EditRoute,
});

function EditRoute(): ReactNode {
	const navigate = useNavigate();
	const { postId } = Route.useParams();
	const { data: allPosts, isLoading } = useMessageBoard();
	const updateMut = useUpdatePost();

	const initial = useMemo<PostComposerInitial | undefined>(() => {
		const post = allPosts?.find((p) => p.id === postId);
		if (!post) return undefined;
		return {
			post_type: post.type,
			title: post.title,
			description: post.body,
			pinned: post.pinned,
			ack_required: post.ackRequired,
			ack_by: post.ackBy ?? null,
			image_url: typeof post.image === "string" ? post.image : null,
			existing_attachments: (post.attachments ?? [])
				.filter((a): a is typeof a & { id: number } => typeof a.id === "number")
				.map((a) => ({ id: a.id, name: a.name, url: a.url ?? null })),
			event_starts_at: post.eventStartsAt ?? null,
			event_ends_at: post.eventEndsAt ?? null,
			event_location: post.eventLocation ?? null,
			strategic_partner: post.strategicPartnerId ?? undefined,
			sort_number: post.sortNumber ?? null,
		};
	}, [allPosts, postId]);

	if (isLoading || !initial) {
		return (
			<GuestLayout>
				<div className="mx-auto max-w-3xl p-6 text-[#56666C]">
					{isLoading ? "Loading post…" : "Post not found."}
				</div>
			</GuestLayout>
		);
	}

	return (
		<GuestLayout>
			<PostComposerForm
				initial={initial}
				mode="edit"
				onCancel={() => navigate({ to: "/message-board" })}
				onSubmit={(values) =>
					updateMut.mutate(
						{ postId, values },
						{
							onSuccess: () => {
								showToast.success("Post updated");
								navigate({ to: "/message-board" });
							},
							onError: (err) => {
								console.error(err);
								showToast.error("Could not update post.");
							},
						},
					)
				}
				submitting={updateMut.isPending}
			/>
		</GuestLayout>
	);
}
