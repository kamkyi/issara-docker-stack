import { useCallback, useEffect, useState } from "react";
import { acceptTerms, getTermsStatus } from "$src/utils/termsApi";
import { handleForceSignOut } from "$src/utils/workos-utils";

interface UseTermsGateArgs {
	isAuthenticated: boolean;
	signOut: () => Promise<void>;
	session?: string | null;
}

interface UseTermsGateResult {
	open: boolean;
	isSubmitting: boolean;
	error: string | null;
	onAccept: () => Promise<void>;
	onDecline: () => Promise<void>;
}

export function useTermsGate({
	isAuthenticated,
	signOut,
	session,
}: UseTermsGateArgs): UseTermsGateResult {
	const [open, setOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!isAuthenticated) {
			setOpen(false);
			setError(null);
			return;
		}
		let cancelled = false;
		(async () => {
			try {
				const status = await getTermsStatus();
				if (!cancelled && status.needs_acceptance) setOpen(true);
			} catch (err) {
				console.error("Failed to load terms status:", err);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [isAuthenticated]);

	const onAccept = useCallback(async () => {
		setError(null);
		setIsSubmitting(true);
		try {
			await acceptTerms();
			setOpen(false);
		} catch (err) {
			console.error("Failed to record terms acceptance:", err);
			setError("Could not save your acceptance. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	}, []);

	const onDecline = useCallback(async () => {
		setOpen(false);
		await handleForceSignOut({ signOut, session });
	}, [signOut, session]);

	return { open, isSubmitting, error, onAccept, onDecline };
}
