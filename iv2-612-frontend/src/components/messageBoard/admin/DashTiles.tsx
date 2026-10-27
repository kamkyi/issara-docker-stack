import type { BoardPost } from "$src/assets/mock/message-board";
import type { PostStateMap } from "$src/routes/message-board";
import { isCommentsEnabled } from "../featureFlags";
import { postNeedsReply } from "./consoleHelpers";
import { I } from "./icons";

interface DashTilesProps {
	posts: BoardPost[];
	state: PostStateMap;
	onJump: (tab: "posts" | "comments") => void;
}

export function DashTiles({ posts, state, onJump }: DashTilesProps) {
	const ackPosts = posts.filter((p) => p.ackRequired);
	const pendingReceipts = ackPosts.reduce((n, p) => {
		const total = p.ackTotal ?? 0;
		const acked = state[p.id]?.ackCount ?? 0;
		return n + Math.max(0, total - acked);
	}, 0);
	const awaitingReply = posts.filter((p) =>
		postNeedsReply(state[p.id]?.comments ?? []),
	).length;
	const nextEvent = posts.find((p) => p.type === "event");

	return (
		<div className="tiles">
			<div className="tile">
				<div className="tlabel">
					<span className="tic amber">
						<I.clock />
					</span>{" "}
					Receipts pending
				</div>
				<div className="tnum">{pendingReceipts}</div>
				<div className="tsub">
					across {ackPosts.length} acknowledgement{" "}
					{ackPosts.length === 1 ? "post" : "posts"}
				</div>
			</div>
			{isCommentsEnabled() && (
				<div className="tile">
					<div className="tlabel">
						<span className="tic teal">
							<I.comment />
						</span>{" "}
						Comments awaiting reply
					</div>
					<div className="tnum">{awaitingReply}</div>
					{awaitingReply > 0 ? (
						<button
							className="tsub act"
							onClick={() => onJump("comments")}
							style={{ background: "none", border: 0, padding: 0 }}
							type="button"
						>
							Open comments inbox <I.arrow />
						</button>
					) : (
						<div className="tsub">All partner comments answered</div>
					)}
				</div>
			)}
			<div className="tile">
				<div className="tlabel">
					<span className="tic coral">
						<I.cal />
					</span>{" "}
					Next event
				</div>
				{nextEvent?.event ? (
					<>
						<div className="tnext">{nextEvent.event.when.split(" · ")[0]}</div>
						<div className="tsub">{nextEvent.title}</div>
					</>
				) : (
					<>
						<div className="tnum">—</div>
						<div className="tsub">No upcoming events</div>
					</>
				)}
			</div>
		</div>
	);
}
