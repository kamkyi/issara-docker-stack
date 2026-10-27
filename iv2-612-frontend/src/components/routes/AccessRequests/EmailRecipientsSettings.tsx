import { EnvelopeClosedIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Button, Switch, Text, TextField } from "@radix-ui/themes";
import { useEffect, useMemo, useState } from "react";
import {
	type AccessRequestEmailRecipient,
	useAccessRequestEmailRecipients,
	useUpdateAccessRequestEmailRecipients,
} from "$src/queries/accessRequests";

/**
 * Management-only settings: choose which Issara Management users receive the
 * "new access request" notification email. The in-app Noti-panel alert always
 * goes to all staff/management; this only controls the email recipients.
 */
function initials(name: string | null, email: string): string {
	const source = name?.trim() || email;
	const parts = source.split(/[\s@._-]+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function EmailRecipientsSettings() {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const { data, isLoading, isError } = useAccessRequestEmailRecipients(open);
	const { mutate, isPending, isSuccess } =
		useUpdateAccessRequestEmailRecipients();

	const [recipients, setRecipients] = useState<AccessRequestEmailRecipient[]>(
		[],
	);

	useEffect(() => {
		if (data) setRecipients(data);
	}, [data]);

	const toggle = (userId: string, enabled: boolean) =>
		setRecipients((prev) =>
			prev.map((r) => (r.workos_user_id === userId ? { ...r, enabled } : r)),
		);

	const selectedCount = recipients.filter((r) => r.enabled).length;

	// Rank rows by their *saved* state (from the server), so selected recipients
	// sit at the top on load and after each save — without a row jumping the
	// moment you flip its switch mid-session.
	const savedEnabled = useMemo(() => {
		const set = new Set<string>();
		for (const r of data ?? []) {
			if (r.enabled) set.add(r.workos_user_id);
		}
		return set;
	}, [data]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		const base = q
			? recipients.filter(
					(r) =>
						(r.name ?? "").toLowerCase().includes(q) ||
						r.email.toLowerCase().includes(q),
				)
			: recipients;
		return [...base].sort((a, b) => {
			const aSel = savedEnabled.has(a.workos_user_id);
			const bSel = savedEnabled.has(b.workos_user_id);
			if (aSel !== bSel) return aSel ? -1 : 1;
			return (a.name ?? a.email).localeCompare(b.name ?? b.email);
		});
	}, [recipients, query, savedEnabled]);

	const setAll = (enabled: boolean) =>
		setRecipients((prev) => prev.map((r) => ({ ...r, enabled })));

	return (
		<div
			className="mb-5 rounded-xl p-4"
			style={{
				backgroundColor: "var(--color-surface)",
				border: "1px solid var(--color-border)",
			}}
		>
			<button
				className="flex w-full items-center justify-between gap-4 text-left"
				onClick={() => setOpen((v) => !v)}
				type="button"
			>
				<div className="flex items-center gap-3">
					<span
						aria-hidden
						className="flex h-9 w-9 flex-none items-center justify-center rounded-lg"
						style={{
							backgroundColor:
								"color-mix(in srgb, var(--color-secondary) 14%, transparent)",
							color: "var(--color-secondary)",
						}}
					>
						<EnvelopeClosedIcon height="18" width="18" />
					</span>
					<div>
						<Text
							as="div"
							size="3"
							style={{
								fontFamily: '"DM Sans", sans-serif',
								color: "var(--text-primary)",
							}}
							weight="bold"
						>
							Email notifications
						</Text>
						<Text as="div" size="1" style={{ color: "var(--color-body)" }}>
							Choose which Issara Management users get an email when a new
							request comes in.
						</Text>
					</div>
				</div>
				<Text
					className="flex-none font-medium"
					size="2"
					style={{ color: "var(--color-secondary)" }}
				>
					{open ? "Hide" : "Configure"}
				</Text>
			</button>

			{open && (
				<div
					className="mt-4 pt-4"
					style={{ borderTop: "1px solid var(--color-border)" }}
				>
					{isLoading && (
						<Text size="2" style={{ color: "var(--color-body)" }}>
							Loading team…
						</Text>
					)}
					{isError && (
						<Text color="red" size="2">
							Failed to load management users.
						</Text>
					)}
					{!isLoading && !isError && recipients.length === 0 && (
						<Text size="2" style={{ color: "var(--color-body)" }}>
							No Issara Management users found.
						</Text>
					)}

					{recipients.length > 0 && (
						<>
							{/* Search + select summary */}
							<div className="mb-3 flex flex-wrap items-center gap-3">
								<div className="min-w-[200px] flex-1">
									<TextField.Root
										onChange={(e) => setQuery(e.target.value)}
										placeholder="Search by name or email"
										value={query}
									>
										<TextField.Slot>
											<MagnifyingGlassIcon height="15" width="15" />
										</TextField.Slot>
									</TextField.Root>
								</div>
								<Text
									className="flex-none"
									size="1"
									style={{
										fontFamily: '"DM Mono", monospace',
										color: "var(--color-caption)",
									}}
								>
									{selectedCount} of {recipients.length} selected
								</Text>
							</div>

							<div className="mb-3 flex gap-3">
								<button
									className="text-xs font-medium underline underline-offset-2 hover:opacity-70"
									onClick={() => setAll(true)}
									style={{ color: "var(--color-secondary)" }}
									type="button"
								>
									Select all
								</button>
								<button
									className="text-xs font-medium underline underline-offset-2 hover:opacity-70"
									onClick={() => setAll(false)}
									style={{ color: "var(--color-caption)" }}
									type="button"
								>
									Clear
								</button>
							</div>

							{/* Recipient rows */}
							<div
								className="flex max-h-72 flex-col overflow-y-auto rounded-lg"
								style={{ border: "1px solid var(--color-border)" }}
							>
								{filtered.length === 0 && (
									<Text
										className="px-3 py-6 text-center"
										size="2"
										style={{ color: "var(--color-body)" }}
									>
										No users match “{query}”.
									</Text>
								)}
								{filtered.map((r, i) => (
									<label
										className="flex cursor-pointer items-center gap-3 px-3 py-2.5"
										htmlFor={`switch-${r.workos_user_id}`}
										key={r.workos_user_id}
										style={{
											borderTop:
												i === 0 ? undefined : "1px solid var(--color-border)",
										}}
									>
										<span
											aria-hidden
											className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-xs font-semibold"
											style={{
												backgroundColor:
													"color-mix(in srgb, var(--color-secondary) 12%, transparent)",
												color: "var(--color-secondary)",
												fontFamily: '"DM Sans", sans-serif',
											}}
										>
											{initials(r.name, r.email)}
										</span>
										<div className="min-w-0 flex-1">
											{r.name && (
												<Text
													as="div"
													className="truncate"
													size="2"
													style={{
														color: "var(--text-primary)",
														fontWeight: 500,
													}}
												>
													{r.name}
												</Text>
											)}
											<Text
												as="div"
												className="truncate"
												size="1"
												style={{ color: "var(--color-body)" }}
											>
												{r.email}
											</Text>
										</div>
										<Switch
											checked={r.enabled}
											id={`switch-${r.workos_user_id}`}
											onCheckedChange={(checked) =>
												toggle(r.workos_user_id, checked === true)
											}
										/>
									</label>
								))}
							</div>

							<div className="mt-4 flex items-center gap-3">
								<Button
									disabled={isPending}
									onClick={() => mutate(recipients)}
									style={{ cursor: "pointer" }}
								>
									{isPending ? "Saving…" : "Save recipients"}
								</Button>
								{isSuccess && !isPending && (
									<Text color="green" size="1">
										Saved.
									</Text>
								)}
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
}
