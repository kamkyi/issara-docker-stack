import { Component, type ErrorInfo, type ReactNode } from "react";

interface GrievanceErrorBoundaryProps {
	children: ReactNode;
}

interface GrievanceErrorBoundaryState {
	error: Error | null;
}

/**
 * Scoped fallback for the supplier grievance form. Without this, an
 * uncaught render error anywhere in the 4-step accordion unmounts the whole
 * app to a blank page with no visible cause. This contains the crash to the
 * form and surfaces the actual error so it's reportable/fixable instead of
 * just "white screen, no console error".
 */
export default class GrievanceErrorBoundary extends Component<
	GrievanceErrorBoundaryProps,
	GrievanceErrorBoundaryState
> {
	state: GrievanceErrorBoundaryState = { error: null };

	static getDerivedStateFromError(error: Error): GrievanceErrorBoundaryState {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		// eslint-disable-next-line no-console
		console.error("GrievanceErrorBoundary caught an error:", error, info);
	}

	render() {
		if (this.state.error) {
			return (
				<div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
					<p className="font-semibold">
						Something went wrong loading the case update form.
					</p>
					<p className="mt-1 whitespace-pre-wrap font-mono text-xs text-rose-600">
						{this.state.error.message}
					</p>
					<button
						className="mt-3 rounded-md border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700"
						onClick={() => this.setState({ error: null })}
						type="button"
					>
						Try again
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}
