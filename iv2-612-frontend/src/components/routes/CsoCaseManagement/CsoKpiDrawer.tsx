import {
	Cross2Icon,
	EnterFullScreenIcon,
	ExitFullScreenIcon,
} from "@radix-ui/react-icons";
import { Badge, Button, Flex, IconButton, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import WorkerVoiceCallDetails from "$src/components/routes/WorkerVoiceCalls/WorkerVoiceCallDetails";
import SectionCard from "$src/components/ui/SectionCard";
import {
	useCsoCaseCall,
	useCsoKpiDetail,
	useCsoKpiHistory,
} from "$src/queries/csoCaseManagement";
import type {
	CsoKpi,
	CsoKpiHistory,
} from "$src/services/csoCaseManagementService";
import CsoKpiEditForm from "./CsoKpiEditForm";

const formatDate = (value: string | null | undefined) =>
	value ? value.slice(0, 10) : "—";

const asText = (value: string | number | null | undefined) =>
	value === null || value === undefined || value === "" ? "—" : String(value);

/**
 * Legacy groups the drawer into fixed sections -- Overview, Remediation,
 * Payments, Documents, Systems Change, Next Step -- rather than one flat list
 * of fields, and CSOs read them in that order. The grouping is reproduced here
 * with CASCADE section cards.
 */
function FieldList({
	fields,
}: {
	fields: ReadonlyArray<readonly [string, string | number | null | undefined]>;
}) {
	return (
		<dl className="grid gap-m sm:grid-cols-2">
			{fields.map(([label, value]) => (
				<div className="border-b border-[var(--color-border)] pb-s" key={label}>
					<dt className="text-sm text-caption">{label}</dt>
					<dd className="whitespace-pre-wrap text-sm text-ink">
						{asText(value)}
					</dd>
				</div>
			))}
		</dl>
	);
}

type KpiView = CsoKpi | CsoKpiHistory;

function OverviewSection({ kpi }: { kpi: KpiView }) {
	return (
		<SectionCard title="Overview">
			<p className="mb-m text-body">{kpi.description}</p>
			<Flex className="mb-m" gap="3" wrap="wrap">
				<Badge>{kpi.status_name}</Badge>
				<Badge>Level {kpi.level}</Badge>
				<Badge>{kpi.affected_workers ?? 0} affected</Badge>
			</Flex>
			<FieldList
				fields={[
					["Supplier", kpi.supplier_name],
					["Category", kpi.category],
					...("days_open" in kpi
						? [["Days active", kpi.days_open] as const]
						: []),
					["Open since", formatDate(kpi.opened_at)],
					["Closed", formatDate(kpi.closed_at)],
					["Closure quality", kpi.closed_quality],
					["Closure rationale", kpi.closed_notes],
				]}
			/>
		</SectionCard>
	);
}

function RemediationSection({ kpi }: { kpi: KpiView }) {
	return (
		<SectionCard title="Remediation">
			<FieldList
				fields={[
					["Issara recommendations", kpi.remediation_issara_recommendation],
					["Progress on remediation", kpi.remediation_progress],
					["How aligned are the responses", kpi.remediation_aligned],
					["Business steps taken", kpi.remediation_business_steps_taken],
					[
						"Business steps remaining",
						kpi.remediation_business_steps_remaining,
					],
				]}
			/>
		</SectionCard>
	);
}

function PaymentsSection({ kpi }: { kpi: KpiView }) {
	return (
		<SectionCard title="Payments">
			<FieldList
				fields={[
					["Thai baht owed", kpi.remediation_owed_baht],
					["Myanmar kyat owed", kpi.remediation_owed_kyat],
					["Malaysian ringgit owed", kpi.remediation_owed_ringitt],
					["USD owed", kpi.remediation_owed_usd],
					["Thai baht paid", kpi.remediation_paid_baht],
					["Myanmar kyat paid", kpi.remediation_paid_kyat],
					["Malaysian ringgit paid", kpi.remediation_paid_ringitt],
					["USD paid", kpi.remediation_paid_usd],
					["Workers paid", kpi.remediation_workers_paid],
					["Payment deadline", formatDate(kpi.remediation_payment_deadline)],
				]}
			/>
		</SectionCard>
	);
}

function DocumentsSection({ kpi }: { kpi: KpiView }) {
	return (
		<SectionCard title="Documents">
			<FieldList
				fields={[
					["Owed", kpi.remediation_documents_owed],
					["Provided", kpi.remediation_documents_provided],
					[
						"Documents deadline",
						formatDate(kpi.remediation_documents_deadline),
					],
				]}
			/>
		</SectionCard>
	);
}

function SystemsChangeSection({ kpi }: { kpi: KpiView }) {
	return (
		<SectionCard title="Systems change">
			<FieldList
				fields={[
					["Issara recommendations", kpi.systems_change_issara_recommendation],
					["Progress", kpi.systems_change_progress],
					["How aligned are the responses", kpi.systems_change_aligned],
					["Business steps taken", kpi.systems_change_business_steps_taken],
					[
						"Business steps remaining",
						kpi.systems_change_business_steps_remaining,
					],
					["Systems change deadline", formatDate(kpi.systems_change_deadline)],
				]}
			/>
		</SectionCard>
	);
}

function NextStepSection({ kpi }: { kpi: KpiView }) {
	return (
		<SectionCard title="Next step">
			<FieldList
				fields={[
					["Description", kpi.next_description],
					["Deadline", formatDate(kpi.deadline)],
					["Escalated to buyers", kpi.issue_escalated_to_buyer ? "Yes" : "No"],
				]}
			/>
		</SectionCard>
	);
}

export default function CsoKpiDrawer({
	id,
	selectedOrganizationId,
	statuses,
	onClose,
	onSaved,
}: {
	id: number | null;
	selectedOrganizationId?: number | null;
	statuses: Array<{ id: number; name: string }>;
	onClose: () => void;
	onSaved: () => void;
}) {
	const detail = useCsoKpiDetail(id, selectedOrganizationId);
	const history = useCsoKpiHistory(id, selectedOrganizationId);
	const [selectedCallId, setSelectedCallId] = useState<number | null>(null);
	const callDetail = useCsoCaseCall(id, selectedCallId, selectedOrganizationId);
	const [historicalUpdateId, setHistoricalUpdateId] = useState<number | null>(
		null,
	);
	const [editing, setEditing] = useState(false);
	const [fullScreen, setFullScreen] = useState(false);
	const historicalUpdate = history.data?.find(
		(item) => item.id === historicalUpdateId,
	);
	const displayedKpi =
		historicalUpdateId === null ? detail.data : historicalUpdate;
	const isHistorical = historicalUpdateId !== null;

	useEffect(() => {
		setEditing(false);
		setHistoricalUpdateId(null);
		setSelectedCallId(null);
	}, [id, selectedOrganizationId]);
	useEffect(() => {
		if (id === null) setFullScreen(false);
	}, [id]);

	// Escape closes the drawer, matching every other overlay in CASCADE.
	useEffect(() => {
		if (id === null) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [id, onClose]);

	if (id === null) return null;

	return (
		<div className="fixed inset-0 z-50">
			<button
				aria-label="Close KPI details"
				className="absolute inset-0"
				onClick={onClose}
				type="button"
			/>
			<aside
				aria-label={`Supplier KPI ${id}`}
				className={`absolute top-0 right-0 flex h-full flex-col overflow-y-auto bg-[var(--color-surface)] shadow-xl ${
					fullScreen ? "w-full" : "w-full max-w-[min(1280px,70vw)]"
				}`}
			>
				<Flex
					align="center"
					className="sticky top-0 z-10 border-[var(--color-border)] border-b bg-[var(--color-surface)] p-l"
					justify="between"
				>
					<div>
						<Text as="div" size="5" weight="bold">
							{isHistorical
								? `Supplier KPI Update #${historicalUpdateId} (Historical View)`
								: `Supplier KPI #${id}`}
						</Text>
						<Text as="div" className="text-body" size="2">
							{isHistorical
								? "Read-only snapshot"
								: "Case Management and KPI update history"}
						</Text>
					</div>
					<Flex gap="2">
						{isHistorical && (
							<Button
								onClick={() => setHistoricalUpdateId(null)}
								size="1"
								variant="soft"
							>
								Back to current KPI
							</Button>
						)}
						<IconButton
							aria-label={fullScreen ? "Exit full screen" : "Full screen"}
							onClick={() => setFullScreen((value) => !value)}
							variant="ghost"
						>
							{fullScreen ? <ExitFullScreenIcon /> : <EnterFullScreenIcon />}
						</IconButton>
						<IconButton
							aria-label="Close KPI details"
							onClick={onClose}
							variant="ghost"
						>
							<Cross2Icon />
						</IconButton>
					</Flex>
				</Flex>

				<div className="grid gap-l p-l">
					{detail.isLoading && <Text>Loading KPI details…</Text>}
					{detail.isError && <Text>Could not load this KPI.</Text>}
					{isHistorical && history.isLoading && (
						<Text>Loading historical update…</Text>
					)}
					{isHistorical && !history.isLoading && !historicalUpdate && (
						<Text>This historical update is unavailable.</Text>
					)}
					{displayedKpi && (
						<>
							<OverviewSection kpi={displayedKpi} />
							<RemediationSection kpi={displayedKpi} />
							<PaymentsSection kpi={displayedKpi} />
							<DocumentsSection kpi={displayedKpi} />
							<SystemsChangeSection kpi={displayedKpi} />
							<NextStepSection kpi={displayedKpi} />

							{!isHistorical && detail.data && (
								<SectionCard
									title={`Related Worker Voice cases (${detail.data.calls.length})`}
								>
									<div className="grid gap-s">
										{detail.data.calls.map((call) => (
											<div
												className="rounded-lg border border-[var(--color-border)] p-m"
												key={call.id}
											>
												<Flex align="center" justify="between">
													<Text weight="medium">
														Call #{call.id} · {asText(call.client_nickname)}
													</Text>
													<Button
														className="cascade-btn cascade-btn--alt2"
														onClick={() => setSelectedCallId(call.id)}
														size="1"
													>
														View Worker Voice
													</Button>
												</Flex>
												<Text className="mt-s block" size="2">
													{asText(call.interaction_summary)}
												</Text>
												<Text className="mt-s block" size="2">
													{asText(call.next_steps)}
												</Text>
											</div>
										))}
										{detail.data.calls.length === 0 && (
											<Text>No calls in the current KPI cycle.</Text>
										)}
									</div>
								</SectionCard>
							)}

							{!isHistorical && selectedCallId !== null && (
								<>
									{callDetail.isLoading && <Text>Loading this call…</Text>}
									{callDetail.isError && <Text>Could not load this call.</Text>}
									{callDetail.data && (
										<WorkerVoiceCallDetails
											callId={selectedCallId}
											callOverride={callDetail.data}
											onClose={() => setSelectedCallId(null)}
										/>
									)}
								</>
							)}

							<SectionCard title="Update history">
								{history.isLoading && <Text>Loading history…</Text>}
								{history.data?.map((item) => (
									<button
										className="w-full cursor-pointer border-[var(--color-border)] border-b bg-transparent py-s text-left"
										key={item.id}
										onClick={() => {
											setHistoricalUpdateId(item.id);
											setSelectedCallId(null);
											setEditing(false);
										}}
										type="button"
									>
										<Text size="2">
											Update #{item.id} · {item.status_name} ·{" "}
											{formatDate(item.opened_at)} ·{" "}
											{asText(item.remediation_progress)}
										</Text>
									</button>
								))}
								{!history.isLoading && (history.data?.length ?? 0) === 0 && (
									<Text>No updates recorded yet.</Text>
								)}
							</SectionCard>

							{!isHistorical && detail.data?.can_edit && (
								<SectionCard
									actions={
										<Button
											className="cascade-btn cascade-btn--alt2"
											onClick={() => setEditing((value) => !value)}
										>
											{editing ? "Cancel" : "Edit KPI"}
										</Button>
									}
									title="Update this KPI"
								>
									{editing && (
										<CsoKpiEditForm
											key={detail.data.id}
											kpi={detail.data}
											onSaved={onSaved}
											statuses={statuses}
										/>
									)}
								</SectionCard>
							)}
						</>
					)}
				</div>
			</aside>
		</div>
	);
}
