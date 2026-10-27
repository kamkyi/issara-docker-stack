import {
	Box,
	Button,
	Checkbox,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControlLabel,
	Typography,
} from "@mui/material";
import { useState } from "react";

/**
 * Bump this version string whenever T&C content changes.
 * Returning users will be shown the gate again when the version changes.
 */
export const CURRENT_TERMS_VERSION = "1.0" as const;

interface TermsGateModalProps {
	open: boolean;
	/** Called when the user accepts T&C and is ready to be sent to WorkOS login. */
	onAgree: () => void;
	/** Called when the user declines — modal closes, nothing happens. */
	onDecline: () => void;
}

export function TermsGateModal({
	open,
	onAgree,
	onDecline,
}: TermsGateModalProps) {
	const [checked, setChecked] = useState(false);

	const handleDecline = () => {
		setChecked(false);
		onDecline();
	};

	const handleAgree = () => {
		if (!checked) return;
		setChecked(false);
		onAgree();
	};

	return (
		<Dialog
			aria-labelledby="terms-gate-dialog-title"
			fullWidth
			maxWidth="md"
			onClose={handleDecline}
			open={open}
			scroll="paper"
		>
			<DialogTitle
				id="terms-gate-dialog-title"
				sx={{ fontWeight: 700, fontSize: "1.25rem", pb: 1 }}
			>
				Terms of Service &amp; Privacy Policy
			</DialogTitle>

			<DialogContent dividers sx={{ maxHeight: "55vh", overflowY: "auto" }}>
				<Typography color="text.secondary" mb={2} variant="body2">
					Please read the following terms carefully before accessing ILM
					Cascade. You must agree in order to continue.
				</Typography>

				{/* ── Section 1 ─────────────────────────────── */}
				<Typography fontWeight={600} mb={1} mt={2} variant="h6">
					1. Acceptance of Terms
				</Typography>
				<Typography color="text.secondary" variant="body2">
					By accessing and using ILM Cascade, you accept and agree to be bound
					by the terms and provisions of this agreement. If you do not agree to
					these terms, you may not access or use this platform.
				</Typography>

				{/* ── Section 2 ─────────────────────────────── */}
				<Typography fontWeight={600} mb={1} mt={3} variant="h6">
					2. Use License
				</Typography>
				<Typography color="text.secondary" mb={1} variant="body2">
					Permission is granted to temporarily access the materials on this
					platform for personal, non-commercial transitory viewing only. Under
					this license you may not:
				</Typography>
				<Box component="ul" sx={{ pl: 3, "& li": { mb: 0.5 } }}>
					<Typography color="text.secondary" component="li" variant="body2">
						Modify or copy the materials
					</Typography>
					<Typography color="text.secondary" component="li" variant="body2">
						Use the materials for any commercial purpose
					</Typography>
					<Typography color="text.secondary" component="li" variant="body2">
						Attempt to decompile or reverse engineer any software contained on
						this platform
					</Typography>
					<Typography color="text.secondary" component="li" variant="body2">
						Remove any copyright or other proprietary notations from the
						materials
					</Typography>
				</Box>

				{/* ── Section 3 ─────────────────────────────── */}
				<Typography fontWeight={600} mb={1} mt={3} variant="h6">
					3. Data Privacy
				</Typography>
				<Typography color="text.secondary" variant="body2">
					We collect and process personal data in accordance with applicable
					data protection laws. Your data will be used solely for platform
					operations and will not be sold to third parties. By using this
					platform, you consent to the collection and processing of your data as
					described in our Privacy Policy.
				</Typography>

				{/* ── Section 4 ─────────────────────────────── */}
				<Typography fontWeight={600} mb={1} mt={3} variant="h6">
					4. Disclaimer
				</Typography>
				<Typography color="text.secondary" variant="body2">
					The materials on this platform are provided on an &quot;as is&quot;
					basis. We make no warranties, expressed or implied, and hereby
					disclaim and negate all other warranties including, without
					limitation, implied warranties or conditions of merchantability,
					fitness for a particular purpose, or non-infringement of intellectual
					property or other violation of rights.
				</Typography>

				{/* ── Section 5 ─────────────────────────────── */}
				<Typography fontWeight={600} mb={1} mt={3} variant="h6">
					5. Limitations
				</Typography>
				<Typography color="text.secondary" variant="body2">
					In no event shall Issara Institute or its suppliers be liable for any
					damages (including, without limitation, damages for loss of data or
					profit, or due to business interruption) arising out of the use or
					inability to use the materials on this platform.
				</Typography>

				{/* ── Section 6 ─────────────────────────────── */}
				<Typography fontWeight={600} mb={1} mt={3} variant="h6">
					6. Governing Law
				</Typography>
				<Typography color="text.secondary" variant="body2">
					These terms and conditions are governed by and construed in accordance
					with applicable laws. You irrevocably submit to the exclusive
					jurisdiction of the courts in that location.
				</Typography>

				{/* ── Section 7 ─────────────────────────────── */}
				<Typography fontWeight={600} mb={1} mt={3} variant="h6">
					7. Contact Information
				</Typography>
				<Typography color="text.secondary" variant="body2">
					If you have any questions about these Terms of Service, please contact
					us at{" "}
					<Box
						component="a"
						href="mailto:support@issarainstitute.org"
						sx={{ color: "primary.main" }}
					>
						support@issarainstitute.org
					</Box>
					.
				</Typography>
			</DialogContent>

			<Divider />

			<DialogActions
				sx={{
					flexDirection: "column",
					alignItems: "flex-start",
					gap: 1.5,
					p: 2.5,
				}}
			>
				<FormControlLabel
					control={
						<Checkbox
							checked={checked}
							color="primary"
							onChange={(e) => setChecked(e.target.checked)}
						/>
					}
					label={
						<Typography fontWeight={500} variant="body2">
							I have read and agree to the Terms of Service and Privacy Policy
						</Typography>
					}
				/>

				<Box sx={{ display: "flex", gap: 1.5, alignSelf: "flex-end" }}>
					<Button
						color="inherit"
						onClick={handleDecline}
						size="medium"
						variant="outlined"
					>
						Decline
					</Button>
					<Button
						disabled={!checked}
						onClick={handleAgree}
						size="medium"
						sx={{ fontWeight: 700, minWidth: 200 }}
						variant="contained"
					>
						I Agree — Continue to Login
					</Button>
				</Box>
			</DialogActions>
		</Dialog>
	);
}
