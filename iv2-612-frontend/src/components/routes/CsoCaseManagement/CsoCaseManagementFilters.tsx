import {
	ChevronDownIcon,
	ChevronUpIcon,
	MagnifyingGlassIcon,
	ReloadIcon,
} from "@radix-ui/react-icons";
import { Button, Flex, SegmentedControl, Text } from "@radix-ui/themes";
import { useEffect, useId, useState } from "react";
import { MultiSelect } from "$src/components/ui/MultiSelect";
import { useSupplierSearch } from "$src/queries/suppliers";

export type SupplyScope = "all" | "supply" | "non";

export interface CaseManagementFilterState {
	search: string;
	supplierIds: string[];
	openedAfter: string;
	openedBefore: string;
	daysOpenMin: string;
	daysOpenMax: string;
	showClosed: boolean;
	supplyScope: SupplyScope;
}

export const EMPTY_FILTERS: CaseManagementFilterState = {
	search: "",
	supplierIds: [],
	openedAfter: "",
	openedBefore: "",
	daysOpenMin: "",
	daysOpenMax: "",
	showClosed: false,
	supplyScope: "all",
};

/** Pixels of scroll before the bar condenses. Roughly one queue header. */
const CONDENSE_AFTER_PX = 120;

/** Short labels for whatever is currently narrowing the queue. */
function activeFilterLabels(value: CaseManagementFilterState): string[] {
	const labels: string[] = [];
	if (value.supplierIds.length > 0)
		labels.push(
			`${value.supplierIds.length} supplier${value.supplierIds.length === 1 ? "" : "s"}`,
		);
	if (value.openedAfter || value.openedBefore) labels.push("Date range");
	if (value.daysOpenMin || value.daysOpenMax) labels.push("Days active");
	if (value.showClosed) labels.push("Closed shown");
	if (value.supplyScope === "supply") labels.push("Supply chain");
	if (value.supplyScope === "non") labels.push("Non-supply chain");
	return labels;
}

const fieldClass =
	"rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-s text-ink";

const labelClass = "flex flex-col gap-xs text-sm text-body";

/**
 * The one filter bar both queue tables read from, mirroring legacy
 * `CsoSupplierKpiFilters` / `SupplierKpiFilters`: it sits above the tables,
 * stays put while the queue scrolls, and its Refresh button reloads both
 * tables at once rather than each table owning its own controls.
 *
 * Supply chain and non-supply chain are mutually exclusive in legacy (ticking
 * one clears the other), which is why they are one segmented control here
 * instead of two checkboxes that could contradict each other.
 */
export default function CsoCaseManagementFilters({
	value,
	onChange,
	onRefresh,
	isRefreshing,
}: {
	value: CaseManagementFilterState;
	onChange: (next: CaseManagementFilterState) => void;
	onRefresh: () => void;
	isRefreshing: boolean;
}) {
	const searchId = useId();
	const supplierFieldId = useId();
	const [supplierSearch, setSupplierSearch] = useState("");
	const suppliers = useSupplierSearch(supplierSearch);

	// The full panel is tall, and on a phone it would eat the screen once it
	// sticks. Past the first scroll it condenses to a single row -- search, a
	// count of what is active, refresh -- and expands again on demand or when
	// the user scrolls back to the top.
	const [condensed, setCondensed] = useState(false);
	const [expandedByUser, setExpandedByUser] = useState(false);
	useEffect(() => {
		const onScroll = () => {
			const past = window.scrollY > CONDENSE_AFTER_PX;
			setCondensed(past);
			if (!past) setExpandedByUser(false);
		};
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	const showFullPanel = !condensed || expandedByUser;
	const activeLabels = activeFilterLabels(value);

	const set = <K extends keyof CaseManagementFilterState>(
		key: K,
		next: CaseManagementFilterState[K],
	) => onChange({ ...value, [key]: next });

	const supplierOptions = (suppliers.data ?? []).map(
		(supplier: { id: number; name: string }) => ({
			value: String(supplier.id),
			label: supplier.name,
		}),
	);

	return (
		<div
			className={`sticky top-0 z-20 grid rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-200 ${
				showFullPanel ? "gap-m p-l" : "gap-s p-s shadow-md"
			}`}
		>
			{!showFullPanel && (
				<Flex align="center" gap="2" wrap="nowrap">
					<div className="relative min-w-0 flex-1">
						<MagnifyingGlassIcon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-s text-caption" />
						<input
							aria-label="Search all fields"
							className={`${fieldClass} w-full py-xs pl-xl`}
							onChange={(event) => set("search", event.target.value)}
							placeholder="Search"
							value={value.search}
						/>
					</div>
					<Button
						aria-expanded={false}
						className="cascade-btn cascade-btn--alt2 shrink-0"
						onClick={() => setExpandedByUser(true)}
					>
						Filters
						{activeLabels.length > 0 ? ` (${activeLabels.length})` : ""}
						<ChevronDownIcon />
					</Button>
					<Button
						aria-label="Refresh data"
						className="cascade-btn cascade-btn--primary shrink-0"
						disabled={isRefreshing}
						onClick={onRefresh}
					>
						<ReloadIcon className={isRefreshing ? "animate-spin" : undefined} />
					</Button>
				</Flex>
			)}
			{!showFullPanel && activeLabels.length > 0 && (
				<Flex gap="1" wrap="wrap">
					{activeLabels.map((label) => (
						<Text className="text-caption" key={label} size="1">
							{label}
						</Text>
					))}
				</Flex>
			)}
			{showFullPanel && (
				<>
					<div className="grid gap-m md:grid-cols-2 xl:grid-cols-4">
						<label className={labelClass} htmlFor={searchId}>
							<span>Search all fields</span>
							<input
								className={fieldClass}
								id={searchId}
								onChange={(event) => set("search", event.target.value)}
								placeholder="Supplier, KPI, category or call ID"
								value={value.search}
							/>
						</label>
						<div className={labelClass}>
							<span>Suppliers</span>
							<MultiSelect
								id={supplierFieldId}
								loading={suppliers.isLoading}
								onChange={(ids) => set("supplierIds", ids)}
								onSearchChange={setSupplierSearch}
								options={supplierOptions}
								placeholder="All suppliers"
								values={value.supplierIds}
							/>
						</div>
						<label className={labelClass}>
							<span>Opened after</span>
							<input
								className={fieldClass}
								onChange={(event) => set("openedAfter", event.target.value)}
								type="date"
								value={value.openedAfter}
							/>
						</label>
						<label className={labelClass}>
							<span>Opened before</span>
							<input
								className={fieldClass}
								onChange={(event) => set("openedBefore", event.target.value)}
								type="date"
								value={value.openedBefore}
							/>
						</label>
						<label className={labelClass}>
							<span>Days active — min</span>
							<input
								className={fieldClass}
								min="0"
								onChange={(event) => set("daysOpenMin", event.target.value)}
								type="number"
								value={value.daysOpenMin}
							/>
						</label>
						<label className={labelClass}>
							<span>Days active — max</span>
							<input
								className={fieldClass}
								min="0"
								onChange={(event) => set("daysOpenMax", event.target.value)}
								type="number"
								value={value.daysOpenMax}
							/>
						</label>
					</div>
					<Flex align="center" gap="3" wrap="wrap">
						<SegmentedControl.Root
							onValueChange={(next) => set("supplyScope", next as SupplyScope)}
							value={value.supplyScope}
						>
							<SegmentedControl.Item value="all">
								All suppliers
							</SegmentedControl.Item>
							<SegmentedControl.Item value="supply">
								Supply chain
							</SegmentedControl.Item>
							<SegmentedControl.Item value="non">
								Non-supply chain
							</SegmentedControl.Item>
						</SegmentedControl.Root>
						<label className="flex items-center gap-s text-sm text-body">
							<input
								checked={value.showClosed}
								onChange={(event) => set("showClosed", event.target.checked)}
								type="checkbox"
							/>
							Show closed
						</label>
						<Text className="text-body" size="1">
							Closed KPIs sort by closed date, as in the legacy queue.
						</Text>
						<Flex className="ml-auto" gap="2">
							<Button
								className="cascade-btn cascade-btn--alt2"
								onClick={() => onChange(EMPTY_FILTERS)}
							>
								Reset filters
							</Button>
							<Button
								className="cascade-btn cascade-btn--primary"
								disabled={isRefreshing}
								onClick={onRefresh}
							>
								<ReloadIcon
									className={isRefreshing ? "animate-spin" : undefined}
								/>
								Refresh data
							</Button>
							{condensed && (
								<Button
									className="cascade-btn cascade-btn--alt2"
									onClick={() => setExpandedByUser(false)}
								>
									Collapse
									<ChevronUpIcon />
								</Button>
							)}
						</Flex>
					</Flex>
				</>
			)}
		</div>
	);
}
