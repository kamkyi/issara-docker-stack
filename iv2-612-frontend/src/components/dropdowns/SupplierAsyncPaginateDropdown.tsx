/**
 * Async, server-paginated supplier picker (IV2-582).
 *
 * The behaviour of ILM-fronted's `SuppliersPaginateDropdown`, rebuilt for this
 * codebase: the supplier table is ~10k rows, so it is never loaded up front.
 * Typing searches server-side (`?name=`), scrolling to the bottom of the menu
 * asks for the next cursor page, and a preselected id is resolved with a
 * single `?id=` lookup so the edit form can show a label it never listed.
 *
 * Deliberately standalone and lookup-only: it knows nothing about the Worker
 * Voice form, and hands back the whole `Supplier` so a caller can do more than
 * store the id. Requests go through `$src/api/axios`, so they carry the CSO's
 * AuthKit bearer token.
 *
 * Not to be confused with `SupplierDropdown.tsx`, which fetches `page_size=2000`
 * against cascade-api. That one is unused and is left alone.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { GroupBase, OptionsOrGroups, StylesConfig } from "react-select";
import { AsyncPaginate } from "react-select-async-paginate";
import {
	fetchSupplierById,
	fetchSupplierPage,
	type Supplier,
} from "$src/queries/suppliers";

export interface SupplierOption {
	value: number;
	label: string;
	supplier: Supplier;
}

interface Additional {
	cursor: string | null;
}

interface SupplierAsyncPaginateDropdownProps {
	/** Currently selected supplier id, or null. Controlled by the caller. */
	value: number | null;
	/** Fires with the whole supplier, or null when the selection is cleared. */
	onChange: (supplier: Supplier | null) => void;
	controlId?: string;
	placeholder?: string;
	disabled?: boolean;
	invalid?: boolean;
	className?: string;
}

const toOption = (supplier: Supplier): SupplierOption => ({
	value: supplier.id,
	label: supplier.name,
	supplier,
});

/**
 * Matches the `case-call-type-trigger` look the rest of the Worker Voice form
 * uses, so the supplier row does not read as a control from another app.
 */
const selectStyles: StylesConfig<SupplierOption, false> = {
	control: (base, state) => ({
		...base,
		minHeight: "2.5rem",
		borderRadius: "0.375rem",
		borderColor: state.isFocused ? "#2563eb" : "#d1d5db",
		boxShadow: state.isFocused ? "0 0 0 1px #2563eb" : "none",
		"&:hover": { borderColor: state.isFocused ? "#2563eb" : "#9ca3af" },
	}),
	menu: (base) => ({ ...base, borderRadius: "0.375rem", zIndex: 50 }),
	menuPortal: (base) => ({ ...base, zIndex: 9999 }),
	option: (base, state) => ({
		...base,
		backgroundColor: state.isSelected
			? "#2563eb"
			: state.isFocused
				? "#e5e7eb"
				: undefined,
		color: state.isSelected ? "#ffffff" : "#374151",
		cursor: "pointer",
	}),
};

const SupplierAsyncPaginateDropdown: React.FC<
	SupplierAsyncPaginateDropdownProps
> = ({
	value,
	onChange,
	controlId,
	placeholder,
	disabled,
	invalid,
	className = "",
}) => {
	const { t } = useTranslation();
	const [selected, setSelected] = useState<SupplierOption | null>(null);
	const [loadError, setLoadError] = useState(false);

	/**
	 * Resolve a supplier id the component never listed -- reopening a saved
	 * call, or a caller setting the value itself. Skipped once the option is
	 * already in hand, so picking from the menu costs no extra request.
	 */
	const requestedIdRef = useRef<number | null>(null);
	useEffect(() => {
		if (value === null) {
			setSelected(null);
			requestedIdRef.current = null;
			return;
		}
		if (selected?.value === value || requestedIdRef.current === value) {
			return;
		}
		requestedIdRef.current = value;
		let active = true;
		fetchSupplierById(value)
			.then((supplier) => {
				// A later selection landed while this was in flight; its own
				// effect run owns the label now.
				if (active && supplier && requestedIdRef.current === value) {
					setSelected(toOption(supplier));
				}
			})
			.catch(() => {
				// The id stays selected in form state either way -- failing to
				// render its name must not silently drop the supplier.
			});
		return () => {
			active = false;
		};
	}, [value, selected?.value]);

	const loadOptions = useCallback(
		async (
			search: string,
			_loaded: OptionsOrGroups<SupplierOption, GroupBase<SupplierOption>>,
			additional?: Additional,
		) => {
			try {
				const { suppliers, nextCursor } = await fetchSupplierPage(
					search.trim(),
					additional?.cursor ?? null,
				);
				setLoadError(false);
				return {
					options: suppliers.map(toOption),
					hasMore: nextCursor !== null,
					additional: { cursor: nextCursor },
				};
			} catch {
				// Surfaced through `noOptionsMessage` rather than thrown: an
				// AsyncPaginate that rejects wedges its menu until remount.
				setLoadError(true);
				return { options: [], hasMore: false, additional: { cursor: null } };
			}
		},
		[],
	);

	return (
		<div className={`supplier-async-paginate ${className}`.trim()}>
			<AsyncPaginate
				additional={{ cursor: null }}
				aria-invalid={invalid || undefined}
				aria-label={placeholder ?? t("workerVoiceForm.fields.supplier.label")}
				debounceTimeout={300}
				inputId={controlId}
				isClearable
				isDisabled={disabled}
				isSearchable
				loadingMessage={() => t("common.loading")}
				loadOptions={loadOptions}
				menuPortalTarget={
					typeof document === "undefined" ? undefined : document.body
				}
				noOptionsMessage={() =>
					loadError
						? t("workerVoiceForm.fields.supplier.error")
						: t("workerVoiceForm.fields.supplier.empty")
				}
				onChange={(option) => {
					const next = option as SupplierOption | null;
					setSelected(next);
					requestedIdRef.current = next?.value ?? null;
					onChange(next?.supplier ?? null);
				}}
				placeholder={placeholder ?? ""}
				styles={selectStyles}
				value={selected}
			/>
		</div>
	);
};

export default SupplierAsyncPaginateDropdown;
