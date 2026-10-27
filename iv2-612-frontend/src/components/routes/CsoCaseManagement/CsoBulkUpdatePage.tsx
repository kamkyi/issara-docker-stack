import { Badge, Button, Flex, Text } from "@radix-ui/themes";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import SectionCard from "$src/components/ui/SectionCard";
import { useCsoKpiDetail } from "$src/queries/csoCaseManagement";
import CsoKpiEditForm from "./CsoKpiEditForm";

/** Legacy treats a KPI saved in the last 10 minutes as "recent". */
const RECENT_WINDOW_MS = 10 * 60 * 1000;

/** Legacy re-renders every 30s so the "x min ago" ribbons stay honest. */
const TICK_MS = 30_000;

const timeAgo = (at: number) => {
	const seconds = Math.floor((Date.now() - at) / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes} min ago`;
	return `${Math.floor(minutes / 60)} hr ago`;
};

const isClosedStatus = (name: string) => /closed|unresolved/i.test(name);

export const parseIds = (raw: string): number[] => {
	const seen = new Set<number>();
	for (const part of raw.split(",")) {
		const id = Number(part.trim());
		if (Number.isInteger(id) && id > 0) seen.add(id);
	}
	return [...seen];
};

/**
 * One KPI in the bulk queue: the same edit form the drawer uses, wrapped in a
 * card that keeps its own "saved" state so the user can see what they have
 * already worked through without leaving the page.
 */
function BulkKpiCard({
	id,
	statuses,
	selectedOrganizationId,
	savedAt,
	onSaved,
}: {
	id: number;
	statuses: Array<{ id: number; name: string }>;
	selectedOrganizationId?: number | null;
	savedAt?: number;
	onSaved: (id: number, closed: boolean) => void;
}) {
	const detail = useCsoKpiDetail(id, selectedOrganizationId);
	const recent =
		savedAt !== undefined && Date.now() - savedAt < RECENT_WINDOW_MS;

	if (detail.isLoading) {
		return (
			<SectionCard title={`Supplier KPI #${id}`}>
				<Text>Loading KPI…</Text>
			</SectionCard>
		);
	}
	if (detail.isError || !detail.data) {
		return (
			<SectionCard title={`Supplier KPI #${id}`}>
				<Text>
					Could not load this KPI. It may be outside your organization.
				</Text>
			</SectionCard>
		);
	}

	const kpi = detail.data;
	return (
		<div
			className={
				recent
					? "rounded-xl ring-2 ring-[var(--color-action-green,#4caf50)]"
					: ""
			}
			data-testid={`bulk-card-${id}`}
		>
			<SectionCard
				actions={
					recent ? (
						<Text className="text-caption" size="1">
							Saved · {timeAgo(savedAt as number)}
						</Text>
					) : undefined
				}
				title={`Supplier KPI #${id} · ${kpi.supplier_name}`}
			>
				{/* Legacy pairs a read-only context panel with the edit form so the
				    user can see what they are updating without scrolling away. */}
				<div className="grid gap-l lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
					<div className="grid h-fit gap-s rounded-lg bg-[var(--color-action-cream)] p-m">
						<Text size="2" weight="medium">
							{kpi.category}
						</Text>
						<Text className="text-body" size="2">
							{kpi.description}
						</Text>
						<Flex gap="2" wrap="wrap">
							<Badge>{kpi.status_name}</Badge>
							<Badge>Level {kpi.level}</Badge>
							<Badge>{kpi.affected_workers ?? 0} affected</Badge>
						</Flex>
						<Text className="text-caption" size="1">
							Opened {kpi.opened_at?.slice(0, 10) ?? "—"} · {kpi.days_open} days
							active
						</Text>
						<Text className="text-caption" size="1">
							{kpi.calls.length} associated{" "}
							{kpi.calls.length === 1 ? "call" : "calls"}
						</Text>
					</div>
					<div>
						{kpi.can_edit ? (
							<CsoKpiEditForm
								key={kpi.id}
								kpi={kpi}
								// Read the status off the saved record, not the copy this
								// card rendered with -- that one still holds the status from
								// before the edit.
								onSaved={(updated) =>
									onSaved(id, isClosedStatus(updated.status_name))
								}
								statuses={statuses}
								variant="sections"
							/>
						) : (
							<Text>
								This KPI belongs to another organization and is read-only.
							</Text>
						)}
					</div>
				</div>
			</SectionCard>
		</div>
	);
}

/**
 * Bulk update, following legacy `SupplierKpiBulkUpdate`: the ids picked in the
 * queue arrive in the URL, every KPI gets its own full edit card stacked down
 * the page, and the user works through them without bouncing back to the
 * table. Saving a card marks it saved in place; closing a KPI drops it out of
 * the queue, and once the queue empties the user goes back to Case Management.
 *
 * The ids live in the URL rather than in component state so the page can be
 * reloaded or shared, exactly as legacy does.
 */
export default function CsoBulkUpdatePage({
	ids,
	statuses,
	selectedOrganizationId,
	onIdsChange,
}: {
	ids: number[];
	statuses: Array<{ id: number; name: string }>;
	selectedOrganizationId?: number | null;
	onIdsChange: (ids: number[]) => void;
}) {
	const navigate = useNavigate();
	const [savedAt, setSavedAt] = useState<Record<number, number>>({});
	const [hideRecent, setHideRecent] = useState(false);
	const [, setTick] = useState(0);

	useEffect(() => {
		const timer = setInterval(() => setTick((value) => value + 1), TICK_MS);
		return () => clearInterval(timer);
	}, []);

	const backToQueue = useCallback(
		() => void navigate({ to: "/worker-voice-calls/cases" }),
		[navigate],
	);

	const handleSaved = (id: number, closed: boolean) => {
		setSavedAt((previous) => ({ ...previous, [id]: Date.now() }));
		if (!closed) return;
		// A closed KPI leaves the queue, as in legacy -- there is nothing left to
		// work on, and leaving it would make the remaining count misleading.
		const remaining = ids.filter((value) => value !== id);
		if (remaining.length === 0) {
			// Go straight back rather than writing an empty `ids` to the URL and
			// letting the redirect effect pick it up: that round trip is a second
			// navigation for no benefit.
			backToQueue();
			return;
		}
		onIdsChange(remaining);
	};

	useEffect(() => {
		if (ids.length === 0) backToQueue();
	}, [ids.length, backToQueue]);

	const recentCount = ids.filter(
		(id) =>
			savedAt[id] !== undefined && Date.now() - savedAt[id] < RECENT_WINDOW_MS,
	).length;
	const visible = hideRecent
		? ids.filter(
				(id) =>
					savedAt[id] === undefined ||
					Date.now() - savedAt[id] >= RECENT_WINDOW_MS,
			)
		: ids;

	return (
		<div className="grid gap-l">
			<div className="sticky top-0 z-20 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-m shadow-md">
				<Flex align="center" gap="3" justify="between" wrap="wrap">
					<div className="min-w-0">
						<Text as="div" size="4" weight="bold">
							Bulk KPI update queue
						</Text>
						<Text as="div" className="text-caption" size="1">
							{ids.length} total · {recentCount} recently saved
						</Text>
					</div>
					<Flex align="center" gap="2" wrap="wrap">
						<label className="flex items-center gap-s text-sm text-body">
							<input
								checked={hideRecent}
								onChange={(event) => setHideRecent(event.target.checked)}
								type="checkbox"
							/>
							Hide recently updated
						</label>
						<Button
							className="cascade-btn cascade-btn--alt2"
							onClick={backToQueue}
						>
							Back to Case Management
						</Button>
					</Flex>
				</Flex>
			</div>

			{ids.length > 0 && visible.length === 0 && (
				<SectionCard>
					<Text>
						Recently updated KPIs are hidden. Switch off “Hide recently updated”
						to review what you just saved.
					</Text>
				</SectionCard>
			)}

			{visible.map((id) => (
				<BulkKpiCard
					id={id}
					key={id}
					onSaved={handleSaved}
					savedAt={savedAt[id]}
					selectedOrganizationId={selectedOrganizationId}
					statuses={statuses}
				/>
			))}
		</div>
	);
}
