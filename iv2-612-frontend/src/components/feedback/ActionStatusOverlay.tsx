import { useActionStatus } from "$src/store/actionStatusStore";
import "./action-status.css";

// Single global overlay driven by the action-status store. Loading is blocking
// (dim backdrop); success/error are passive (no backdrop, click-through) and
// auto-dismiss.
export function ActionStatusOverlay() {
	const { kind, message } = useActionStatus();
	if (!kind) return null;
	const passive = kind !== "loading";

	return (
		<div
			aria-live="polite"
			className={`action-status-back${passive ? " passive" : ""}`}
		>
			<div className="action-status-card">
				{kind === "loading" && <span className="action-status-spinner" />}
				{kind === "success" && (
					<span className="action-status-icon success">
						<svg fill="none" height="30" viewBox="0 0 24 24" width="30">
							<title>Success</title>
							<path
								d="M5 13l4 4L19 7"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2.6"
							/>
						</svg>
					</span>
				)}
				{kind === "error" && (
					<span className="action-status-icon error">
						<svg fill="none" height="30" viewBox="0 0 24 24" width="30">
							<title>Error</title>
							<path
								d="M6 6l12 12M18 6L6 18"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2.6"
							/>
						</svg>
					</span>
				)}
				<div className="action-status-msg">{message}</div>
			</div>
		</div>
	);
}
