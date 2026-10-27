/**
 * Step 4's Issue Categories control: one tab per KPI category with that
 * category's KPI checkboxes underneath.
 *
 * The existing `KPISelector` renders the same data but flips into a read-only
 * summary as soon as anything is selected, which fights a create form. It is
 * also live in the supplier Worker Feedback form, so it is left untouched and
 * this component reuses only the shared KPI query hooks.
 */
import { Text } from "@radix-ui/themes";
import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useKPICategories, useKPIs } from "$src/queries/kpis";

interface IssueCategoryKpiTabsProps {
	/** categoryId -> selected KPI ids. */
	selectedKpis: Record<number, number[]>;
	onToggleKpi: (categoryId: number, kpiId: number) => void;
}

const IssueCategoryKpiTabs: React.FC<IssueCategoryKpiTabsProps> = ({
	selectedKpis,
	onToggleKpi,
}) => {
	const { t } = useTranslation();
	const { data: categories = [], isLoading: isLoadingCategories } =
		useKPICategories();
	const { data: kpis = [], isLoading: isLoadingKpis } = useKPIs();
	const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);

	const categoryList = Array.isArray(categories) ? categories : [];
	const kpiList = Array.isArray(kpis) ? kpis : [];

	if (isLoadingCategories || isLoadingKpis) {
		return (
			<Text as="p" className="text-gray-500" size="2">
				{t("workerVoiceForm.issueCategories.loading")}
			</Text>
		);
	}

	if (categoryList.length === 0) {
		return (
			<Text as="p" className="text-gray-500" size="2">
				{t("workerVoiceForm.issueCategories.empty")}
			</Text>
		);
	}

	const activeCategory =
		categoryList.find((category) => category.id === activeCategoryId) ??
		categoryList[0];
	const activeKpis = kpiList.filter(
		(kpi) => kpi.kpi_category?.id === activeCategory.id,
	);
	const totalSelected = Object.values(selectedKpis).flat().length;

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<Text as="p" className="text-gray-500" size="1">
					{t("workerVoiceForm.issueCategories.hint")}
				</Text>
				{totalSelected > 0 && (
					<span className="wv-selected-count rounded-full px-2.5 py-0.5 text-xs font-semibold">
						{t("workerVoiceForm.issueCategories.selectedCount", {
							count: totalSelected,
						})}
					</span>
				)}
			</div>

			{/* No gap between the tab row and the panel: the active tab overlaps the
			    panel border so the two read as one folder tab. */}
			<div>
				<div className="flex flex-wrap gap-x-1" role="tablist">
					{categoryList.map((category) => {
						const isActive = category.id === activeCategory.id;
						const count = selectedKpis[category.id]?.length ?? 0;
						return (
							<button
								aria-selected={isActive}
								className="wv-tab"
								data-state={isActive ? "active" : "inactive"}
								key={category.id}
								onClick={() => setActiveCategoryId(category.id)}
								role="tab"
								type="button"
							>
								{category.name}
								{count > 0 && <span className="wv-tab-count">{count}</span>}
							</button>
						);
					})}
				</div>

				<div className="wv-tab-panel" role="tabpanel">
					{activeKpis.length === 0 ? (
						<Text as="p" className="text-gray-500" size="2">
							{t("workerVoiceForm.issueCategories.noKpis")}
						</Text>
					) : (
						<div className="flex flex-col gap-1">
							{activeKpis.map((kpi) => {
								const isChecked =
									selectedKpis[activeCategory.id]?.includes(kpi.id) ?? false;
								return (
									<label
										className="wv-kpi flex cursor-pointer items-start gap-2 px-3 py-2 text-sm"
										data-selected={isChecked}
										key={kpi.id}
									>
										<input
											checked={isChecked}
											className="mt-0.5"
											onChange={() => onToggleKpi(activeCategory.id, kpi.id)}
											type="checkbox"
										/>
										<span className="leading-snug">{kpi.description}</span>
									</label>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default IssueCategoryKpiTabs;
