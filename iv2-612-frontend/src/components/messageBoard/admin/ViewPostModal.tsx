import { useMemo } from "react";
import type { BoardPost } from "$src/assets/mock/message-board";
import { useStrategicPartners } from "$src/hooks/useSupplyChain";
import { ComposerPreview } from "./ComposerPreview";
import { boardPostToPreview } from "./consoleHelpers";
import { I } from "./icons";

interface ViewPostModalProps {
	post: BoardPost | null;
	open: boolean;
	onClose: () => void;
}

// Read-only modal that shows a post exactly as a strategic partner sees it.
// Reuses ComposerPreview (the "Partner preview" surface) so the Team Console's
// view matches the partner reader without re-implementing the post markup.
export function ViewPostModal({ post, open, onClose }: ViewPostModalProps) {
	const { data: spData } = useStrategicPartners();
	const partners = useMemo(
		() => (Array.isArray(spData) ? spData : []),
		[spData],
	);

	// Audience precedence must mirror how the post was actually saved, otherwise a
	// hand-picked custom multi-select (strategicPartnerId null, but explicit
	// audiencePartnerIds) is misread as a broadcast to every partner:
	//   single SP FK  →  custom id list  →  grouping  →  broadcast (all).
	const customIds =
		post?.audiencePartnerIds && post.audiencePartnerIds.length > 0
			? post.audiencePartnerIds
			: null;
	const grouping = post?.audienceGrouping ?? null;
	const partnerName =
		post && post.strategicPartnerId != null
			? (partners.find((p) => p.id === post.strategicPartnerId)?.name ??
				"Selected partner")
			: null;
	const customNames = customIds
		? customIds.map(
				(id) => partners.find((p) => p.id === id)?.name ?? `Partner ${id}`,
			)
		: [];
	const isAll =
		post != null &&
		post.strategicPartnerId == null &&
		customIds == null &&
		grouping == null;

	return (
		<div
			className={`cmp-back${open && post ? " show" : ""}`}
			onClick={onClose}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
		>
			{open && post && (
				<div
					className="cmp form"
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => e.stopPropagation()}
				>
					<div className="cmp-head">
						<h3>View post</h3>
						<button className="x" onClick={onClose} type="button">
							<I.x />
						</button>
					</div>
					<div className="cmp-body">
						<div className="cmp-preview">
							<div className="pvlabel">
								<I.user /> Audience
							</div>
							{isAll ? (
								<details className="view-audience">
									<summary>
										All strategic partners
										<span className="view-audience-count">
											{partners.length}
										</span>
									</summary>
									<ul className="view-audience-list">
										{partners.map((p) => (
											<li key={p.id}>{p.name}</li>
										))}
									</ul>
								</details>
							) : customIds ? (
								<details className="view-audience">
									<summary>
										{grouping ?? "Selected partners"}
										<span className="view-audience-count">
											{customIds.length}
										</span>
									</summary>
									<ul className="view-audience-list">
										{customNames.map((name, i) => (
											<li key={customIds[i]}>{name}</li>
										))}
									</ul>
								</details>
							) : grouping ? (
								<div className="view-audience-single">{grouping}</div>
							) : (
								<div className="view-audience-single">{partnerName}</div>
							)}

							<div className="pvlabel" style={{ marginTop: 18 }}>
								<I.eye /> Partner preview
							</div>
							<ComposerPreview d={boardPostToPreview(post)} />
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
