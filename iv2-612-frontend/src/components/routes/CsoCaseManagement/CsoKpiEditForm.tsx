import { ChevronDownIcon } from "@radix-ui/react-icons";
import { Badge, Button, Flex, Tabs, Text } from "@radix-ui/themes";
import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { showToast } from "$src/components/toast/toastUtil";
import { usePatchCsoKpi } from "$src/queries/csoCaseManagement";
import "./caseManagement.css";
import type {
	CsoKpi,
	CsoKpiPatch,
} from "$src/services/csoCaseManagementService";

const formatDate = (value: string | null | undefined) =>
	value ? value.slice(0, 10) : "—";

/**
 * How the four groups of fields are presented.
 *
 * `tabs` is the legacy shape and suits the drawer, where one KPI has the whole
 * panel to itself. `sections` is for the bulk queue: a tab strip repeated down
 * a stack of cards is a lot of chrome, the strips compete with each other for
 * attention, and none of them shows where the unsaved edits are. Collapsible
 * sections stack quietly, open to the group being worked on, and can carry an
 * edited-count badge on the header.
 */
export type EditFormVariant = "tabs" | "sections";

export default function CsoKpiEditForm({
	kpi,
	statuses,
	onSaved,
	variant = "tabs",
}: {
	kpi: CsoKpi;
	statuses: Array<{ id: number; name: string }>;
	/** Receives the saved record, so the caller can react to its new status. */
	onSaved: (updated: CsoKpi) => void;
	variant?: EditFormVariant;
}) {
	const { t } = useTranslation();
	const mutation = usePatchCsoKpi();
	const formId = useId();
	const [draft, setDraft] = useState<CsoKpiPatch>({});
	const [tab, setTab] = useState("status");
	const [openSection, setOpenSection] = useState<string | null>("status");
	const statusId = draft.status ?? kpi.status;
	const selectedStatus = statuses.find((item) => item.id === statusId);
	const isClosing = /closed|unresolved/i.test(selectedStatus?.name ?? "");
	// Legacy's update form has no client-side validation at all -- only
	// `disabled={saving}`. Ours has to check, because the adapter's
	// `CsoKpiPatchSerializer.validate` rejects these, but it must not nag: most
	// legacy rows have never had the retaliation questions answered, so a banner
	// shown on load would be red before the user typed anything. The message
	// waits for a save attempt instead.
	const [attemptedSave, setAttemptedSave] = useState(false);
	// Keyed as well as labelled, so the message can name what is missing and the
	// fields themselves can be marked without matching on label text.
	const missing = (
		[
			!(draft.opened_at ?? kpi.opened_at) && {
				key: "opened_at" as const,
				label: "Opened at",
			},
			(draft.retaliation ?? kpi.retaliation) === null && {
				key: "retaliation" as const,
				label: "Retaliation against workers",
			},
			(draft.retaliation_cso ?? kpi.retaliation_cso) === null && {
				key: "retaliation_cso" as const,
				label: "Retaliation against CSO",
			},
			isClosing &&
				!(draft.closed_at ?? kpi.closed_at) && {
					key: "closed_at" as const,
					label: "Closed at",
				},
		] as Array<false | { key: keyof CsoKpiPatch; label: string }>
	).filter((item): item is { key: keyof CsoKpiPatch; label: string } =>
		Boolean(item),
	);
	const missingFields = missing.map((item) => item.label);
	const missingRequired = missing.length > 0;
	const invalid = (key: keyof CsoKpiPatch) =>
		attemptedSave && missing.some((item) => item.key === key);
	const fieldClass = (key: keyof CsoKpiPatch) =>
		`cso-field rounded-lg border border-[var(--color-border)] p-s text-ink focus-visible:ring-2 focus-visible:ring-[var(--color-secondary)]${
			invalid(key) ? " cso-field--invalid" : ""
		}`;
	const invalidIn = (keys: Array<keyof CsoKpiPatch>) => keys.some(invalid);
	const hint = (key: keyof CsoKpiPatch) =>
		invalid(key) ? <span className="cso-hint">Required</span> : null;
	const update = (
		key: keyof CsoKpiPatch,
		value: string | number | boolean | null,
	) => setDraft((previous) => ({ ...previous, [key]: value }));
	const formRef = useRef<HTMLDivElement>(null);
	const submit = async () => {
		setAttemptedSave(true);
		if (missingRequired) {
			// Every required field lives in the status group, so open it rather
			// than leaving the user to hunt for what the toast refers to.
			setTab("status");
			setOpenSection("status");
			showToast.error(
				missingFields.length === 1
					? `${missingFields[0]} is required before this update can be saved.`
					: `${missingFields.slice(0, -1).join(", ")} and ${
							missingFields[missingFields.length - 1]
						} are required before this update can be saved.`,
				// One id, so repeated attempts replace the toast instead of stacking.
				{ id: `cso-kpi-${kpi.id}-required` },
			);
			// Wait for the group to open before scrolling, or the field is still
			// zero-height and the browser scrolls to the wrong place.
			requestAnimationFrame(() => {
				const field = formRef.current?.querySelector('[aria-invalid="true"]');
				field?.scrollIntoView({ behavior: "smooth", block: "center" });
			});
			return;
		}
		const updated = await mutation.mutateAsync({ id: kpi.id, payload: draft });
		// Legacy confirms every save with an alert listing what it updated; a
		// toast is the CASCADE equivalent, and in the bulk queue it is the only
		// signal that the card you just left actually saved.
		showToast.success(`Supplier KPI #${kpi.id} updated.`, {
			id: `cso-kpi-${kpi.id}-saved`,
		});
		setAttemptedSave(false);
		setDraft({});
		onSaved(updated);
	};
	const textInput = (label: string, key: keyof CsoKpiPatch, long = false) => (
		<label
			className="flex flex-col gap-xs text-sm text-body"
			htmlFor={`${formId}-${key}`}
			key={key}
		>
			<span>{label}</span>
			{long ? (
				<textarea
					aria-invalid={invalid(key) || undefined}
					className={`min-h-24 ${fieldClass(key)}`}
					id={`${formId}-${key}`}
					onChange={(event) => update(key, event.target.value)}
					value={String(draft[key] ?? kpi[key as keyof CsoKpi] ?? "")}
				/>
			) : (
				<input
					aria-invalid={invalid(key) || undefined}
					className={fieldClass(key)}
					id={`${formId}-${key}`}
					onChange={(event) => update(key, event.target.value)}
					value={String(draft[key] ?? kpi[key as keyof CsoKpi] ?? "")}
				/>
			)}
			{hint(key)}
		</label>
	);
	const dateInput = (label: string, key: keyof CsoKpiPatch) => (
		<label className="flex flex-col gap-xs text-sm text-body" key={key}>
			<span>{label}</span>
			<input
				aria-invalid={invalid(key) || undefined}
				className={fieldClass(key)}
				onChange={(event) => update(key, event.target.value || null)}
				type="date"
				value={formatDate(
					String(draft[key] ?? kpi[key as keyof CsoKpi] ?? ""),
				).replace("—", "")}
			/>
			{hint(key)}
		</label>
	);
	const numberInput = (label: string, key: keyof CsoKpiPatch) => (
		<label className="flex flex-col gap-xs text-sm text-body" key={key}>
			<span>{label}</span>
			<input
				aria-invalid={invalid(key) || undefined}
				className={fieldClass(key)}
				min="0"
				onChange={(event) => update(key, Number(event.target.value))}
				type="number"
				value={Number(draft[key] ?? kpi[key as keyof CsoKpi] ?? 0)}
			/>
			{hint(key)}
		</label>
	);
	const yesNo = (label: string, key: keyof CsoKpiPatch) => (
		<label className="flex flex-col gap-xs text-sm text-body" key={key}>
			<span>{label}</span>
			<select
				aria-invalid={invalid(key) || undefined}
				className={fieldClass(key)}
				onChange={(event) =>
					update(
						key,
						event.target.value === "" ? null : event.target.value === "true",
					)
				}
				value={String(draft[key] ?? kpi[key as keyof CsoKpi] ?? "")}
			>
				<option value="">Not recorded</option>
				<option value="true">Yes</option>
				<option value="false">No</option>
			</select>
			{hint(key)}
		</label>
	);
	const choice = (label: string, key: keyof CsoKpiPatch, options: string[]) => (
		<label className="flex flex-col gap-xs text-sm text-body" key={key}>
			<span>{label}</span>
			<select
				aria-invalid={invalid(key) || undefined}
				className={fieldClass(key)}
				onChange={(event) => update(key, event.target.value || null)}
				value={String(draft[key] ?? kpi[key as keyof CsoKpi] ?? "")}
			>
				<option value="">Not recorded</option>
				{options.map((option) => (
					<option key={option} value={option}>
						{option}
					</option>
				))}
			</select>
			{hint(key)}
		</label>
	);
	// One definition of the four groups, rendered either as tabs or as
	// collapsible sections. `keys` is what the edited-count badge counts, so a
	// section advertises unsaved work without being opened.
	const panels: Array<{
		id: string;
		keys: Array<keyof CsoKpiPatch>;
		fields: React.ReactNode;
	}> = [
		{
			id: "status",
			keys: [
				"status",
				"opened_at",
				"closed_at",
				"closed_quality",
				"closed_notes",
				"affected_workers",
				"retaliation",
				"retaliation_cso",
				"hide",
			],
			fields: (
				<>
					<label className="flex flex-col gap-xs text-sm text-body">
						<span>Status</span>
						<select
							className="rounded-lg border border-[var(--color-border)] p-s text-ink"
							onChange={(event) => update("status", Number(event.target.value))}
							value={statusId ?? ""}
						>
							{statuses.map((item) => (
								<option key={item.id} value={item.id}>
									{item.name}
								</option>
							))}
						</select>
					</label>
					{dateInput("Opened at", "opened_at")}
					{isClosing && dateInput("Closed at", "closed_at")}
					{isClosing &&
						choice("Closure quality", "closed_quality", [
							"Poor",
							"Fair",
							"Good",
							"Excellent",
						])}
					{isClosing && textInput("Closure rationale", "closed_notes", true)}
					{numberInput("Affected workers", "affected_workers")}
					{yesNo("Retaliation against workers", "retaliation")}
					{yesNo("Retaliation against CSO", "retaliation_cso")}
					{yesNo("Hide from supplier dashboard", "hide")}
				</>
			),
		},
		{
			id: "remediation",
			keys: [
				"remediation_issara_recommendation",
				"remediation_progress",
				"remediation_aligned",
				"remediation_business_steps_taken",
				"remediation_business_steps_remaining",
				"remediation_payment_deadline",
				"remediation_owed_baht",
				"remediation_owed_kyat",
				"remediation_owed_ringitt",
				"remediation_owed_usd",
				"remediation_paid_baht",
				"remediation_paid_kyat",
				"remediation_paid_ringitt",
				"remediation_paid_usd",
				"remediation_workers_paid",
				"remediation_documents_owed",
				"remediation_documents_provided",
				"remediation_documents_deadline",
			],
			fields: (
				<>
					{textInput(
						"Organization's remediation recommendation",
						"remediation_issara_recommendation",
						true,
					)}
					{choice("Remediation progress", "remediation_progress", [
						"None",
						"A little",
						"A lot",
					])}
					{choice("Remediation aligned", "remediation_aligned", [
						"None",
						"A little",
						"A lot",
					])}
					{textInput("Steps taken", "remediation_business_steps_taken", true)}
					{textInput(
						"Steps remaining",
						"remediation_business_steps_remaining",
						true,
					)}
					{dateInput("Payment deadline", "remediation_payment_deadline")}
					{numberInput("Thai baht owed", "remediation_owed_baht")}
					{numberInput("Myanmar kyat owed", "remediation_owed_kyat")}
					{numberInput("Malaysian ringgit owed", "remediation_owed_ringitt")}
					{numberInput("USD owed", "remediation_owed_usd")}
					{numberInput("Thai baht paid", "remediation_paid_baht")}
					{numberInput("Myanmar kyat paid", "remediation_paid_kyat")}
					{numberInput("Malaysian ringgit paid", "remediation_paid_ringitt")}
					{numberInput("USD paid", "remediation_paid_usd")}
					{numberInput("Workers paid", "remediation_workers_paid")}
					{numberInput("Documents owed", "remediation_documents_owed")}
					{numberInput("Documents provided", "remediation_documents_provided")}
					{dateInput("Documents deadline", "remediation_documents_deadline")}
				</>
			),
		},
		{
			id: "systems",
			keys: [
				"systems_change_issara_recommendation",
				"systems_change_progress",
				"systems_change_aligned",
				"systems_change_business_steps_taken",
				"systems_change_business_steps_remaining",
				"systems_change_deadline",
			],
			fields: (
				<>
					{textInput(
						"Organization's systems-change recommendation",
						"systems_change_issara_recommendation",
						true,
					)}
					{choice("Systems-change progress", "systems_change_progress", [
						"None",
						"A little",
						"A lot",
					])}
					{choice("Systems-change aligned", "systems_change_aligned", [
						"None",
						"A little",
						"A lot",
					])}
					{textInput(
						"Steps taken",
						"systems_change_business_steps_taken",
						true,
					)}
					{textInput(
						"Steps remaining",
						"systems_change_business_steps_remaining",
						true,
					)}
					{dateInput("Systems-change deadline", "systems_change_deadline")}
				</>
			),
		},
		{
			id: "next",
			keys: ["next_description", "deadline", "issue_escalated_to_buyer"],
			fields: (
				<>
					{textInput("Next steps", "next_description", true)}
					{dateInput("Deadline", "deadline")}
					{yesNo("Escalated to buyers", "issue_escalated_to_buyer")}
				</>
			),
		},
	];

	const editedCount = (keys: Array<keyof CsoKpiPatch>) =>
		keys.filter((key) => key in draft).length;

	const gridClass = "grid gap-m sm:grid-cols-2";

	return (
		<div className="mt-l" ref={formRef}>
			{variant === "tabs" ? (
				<Tabs.Root onValueChange={setTab} value={tab}>
					<Tabs.List className="mb-l flex flex-wrap gap-s">
						{panels.map((item) => (
							<Tabs.Trigger
								className="cascade-tab"
								key={item.id}
								value={item.id}
							>
								{t(`workerVoicePage.cases.tabs.${item.id}`)}
								{invalidIn(item.keys) ? (
									<Badge className="ml-s" color="red" radius="full">
										Required
									</Badge>
								) : (
									editedCount(item.keys) > 0 && (
										<Badge className="ml-s" radius="full">
											{editedCount(item.keys)}
										</Badge>
									)
								)}
							</Tabs.Trigger>
						))}
					</Tabs.List>
					{panels.map((item) => (
						<Tabs.Content className={gridClass} key={item.id} value={item.id}>
							{item.fields}
						</Tabs.Content>
					))}
				</Tabs.Root>
			) : (
				<div className="grid gap-s">
					{panels.map((item) => {
						const open = openSection === item.id;
						const edited = editedCount(item.keys);
						return (
							<div
								className="overflow-hidden rounded-lg border border-[var(--color-border)]"
								key={item.id}
							>
								<button
									aria-expanded={open}
									className={`flex w-full items-center gap-s p-s text-left transition-colors ${
										open
											? "bg-[var(--color-action-teal)] text-[var(--color-primary)]"
											: "bg-transparent hover:bg-[var(--color-action-cream)]"
									}`}
									onClick={() => setOpenSection(open ? null : item.id)}
									type="button"
								>
									<ChevronDownIcon
										className="cso-section-chevron shrink-0"
										data-open={open}
									/>
									<Text className="flex-1" size="2" weight="medium">
										{t(`workerVoicePage.cases.tabs.${item.id}`)}
									</Text>
									{edited > 0 && <Badge radius="full">{edited} edited</Badge>}
									{invalidIn(item.keys) && (
										<Badge color="red" radius="full">
											Required
										</Badge>
									)}
								</button>
								{/* Stays mounted while collapsed -- `hidden`, so it costs no
								    layout -- which keeps edits in a closed group alive. */}
								<div
									className="cso-section-body"
									hidden={!open}
									key={`${item.id}-${open}`}
								>
									<div className={`${gridClass} p-m`}>{item.fields}</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{mutation.isError && (
				<Text className="mt-m block text-[var(--color-action-coral)]" size="2">
					Could not save this KPI update.
				</Text>
			)}
			<Flex className="mt-l" justify="end">
				<Button
					className="cascade-btn cascade-btn--primary"
					disabled={mutation.isPending || Object.keys(draft).length === 0}
					onClick={() => void submit()}
				>
					{mutation.isPending ? "Saving…" : "Save KPI update"}
				</Button>
			</Flex>
		</div>
	);
}
