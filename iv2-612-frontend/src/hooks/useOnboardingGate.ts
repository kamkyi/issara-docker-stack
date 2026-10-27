import { useCallback, useEffect, useState } from "react";

const ONBOARDING_STORAGE_KEY = "cascade.onboarding.completed";

interface UseOnboardingGateArgs {
	enabled: boolean;
}

interface UseOnboardingGateResult {
	open: boolean;
	onComplete: () => void;
	onReplay: () => void;
}

export function useOnboardingGate({
	enabled,
}: UseOnboardingGateArgs): UseOnboardingGateResult {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (!enabled) {
			setOpen(false);
			return;
		}
		try {
			const completed = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
			if (!completed) setOpen(true);
		} catch {
			setOpen(true);
		}
	}, [enabled]);

	const onComplete = useCallback(() => {
		try {
			window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
		} catch {
			// Ignore storage failures; the overlay still dismisses.
		}
		setOpen(false);
	}, []);

	const onReplay = useCallback(() => {
		try {
			window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
		} catch {
			// Ignore storage failures.
		}
		setOpen(true);
	}, []);

	return { open, onComplete, onReplay };
}
