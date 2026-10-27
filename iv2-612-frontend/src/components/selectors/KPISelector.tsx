import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { Box, Card, Flex, ScrollArea, Tabs, Text } from "@radix-ui/themes";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { KPI, KPICategory, KPISelectorProps } from "$src/types/components";
import { useKPICategories, useKPIs } from "../../queries/kpis";
import "./KPISelector.css";

export type { KPICategory, KPI };

const KPISelector: React.FC<KPISelectorProps> = ({
	selectedKpis = {},
	onSelectKpi,
	displayOnlyMode = false,
}) => {
	const [editMode, setEditMode] = useState(
		Object.keys(selectedKpis).length === 0,
	);
	const [selectedTab, setSelectedTab] = useState("0");
	const [showLeftScroll, setShowLeftScroll] = useState(false);
	const [showRightScroll, setShowRightScroll] = useState(false);

	const tabsListRef = useRef<HTMLDivElement>(null);

	const { data: kpiCategories = [], isLoading: isLoadingCategories } =
		useKPICategories();

	const { data: kpis = [], isLoading: isLoadingKpis } = useKPIs();

	useEffect(() => {
		if (Object.keys(selectedKpis).length > 0) {
			setEditMode(false);
		}
	}, [selectedKpis]);

	// Ensure kpis and kpiCategories are always arrays to prevent filter/map errors
	const kpisArray = Array.isArray(kpis) ? kpis : [];
	const kpiCategoriesArray = Array.isArray(kpiCategories) ? kpiCategories : [];

	// Show all categories, not filtered by issueCategory
	const filteredKpiCategories = kpiCategoriesArray;

	// Check if tabs need scroll indicators
	useEffect(() => {
		const checkForScrollbar = () => {
			if (tabsListRef.current) {
				const { scrollWidth, clientWidth, scrollLeft } = tabsListRef.current;
				setShowRightScroll(
					scrollWidth > clientWidth &&
						scrollWidth - clientWidth - scrollLeft > 10,
				);
				setShowLeftScroll(scrollLeft > 10);
			}
		};

		// Check on component mount and window resize
		checkForScrollbar();
		window.addEventListener("resize", checkForScrollbar);

		// Add listener for tab list scrolling
		const tabsList = tabsListRef.current;
		if (tabsList) {
			tabsList.addEventListener("scroll", checkForScrollbar);
		}

		return () => {
			window.removeEventListener("resize", checkForScrollbar);
			if (tabsList) {
				tabsList.removeEventListener("scroll", checkForScrollbar);
			}
		};
	}, [filteredKpiCategories.length]);

	// Handle scrolling the tabs
	const scrollTabs = (direction: "left" | "right") => {
		if (tabsListRef.current) {
			const scrollAmount = direction === "left" ? -200 : 200;
			tabsListRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
		}
	};

	const handleSelectKpi = (
		categoryId: number,
		kpiId: number,
		tabValue: string,
	) => {
		onSelectKpi(categoryId, kpiId);
		setSelectedTab(tabValue);
	};

	// Get all selected KPIs for the summary view
	const selectedKpiSummary = kpisArray.filter((kpi) => {
		const categoryId = kpi.kpi_category.id;
		return selectedKpis[categoryId]?.includes(kpi.id);
	});

	// Create the KPI list display for each category
	const tabContents = filteredKpiCategories.map((category, categoryIndex) => {
		const categoryKpis = kpisArray.filter(
			(kpi) => kpi.kpi_category.id === category.id,
		);

		return {
			value: categoryIndex.toString(),
			trigger: category.name,
			content: (
				<ScrollArea
					className="pr-2"
					scrollbars="vertical"
					style={{ height: 350 }}
					type="hover"
				>
					<Flex className="kpi-category-content" direction="column" gap="2">
						{categoryKpis.map((kpi) => (
							<div className="kpi-item" key={kpi.id}>
								<div className="kpi-checkbox-wrapper">
									<input
										checked={
											selectedKpis[kpi.kpi_category.id]?.includes(kpi.id) ||
											false
										}
										className="kpi-checkbox"
										id={`kpi-${kpi.id}`}
										onChange={() =>
											handleSelectKpi(
												kpi.kpi_category.id,
												kpi.id,
												categoryIndex.toString(),
											)
										}
										type="checkbox"
									/>
								</div>
								<label className="kpi-label" htmlFor={`kpi-${kpi.id}`}>
									{kpi.description}
								</label>
							</div>
						))}
					</Flex>
				</ScrollArea>
			),
		};
	});

	// Display the summary/display view
	if (displayOnlyMode || (!editMode && filteredKpiCategories.length > 0)) {
		return (
			<Card className="kpi-selector-card shadow-sm">
				<Flex direction="column" gap="3">
					<Flex align="center" justify="between">
						<Text size={{ initial: "4", sm: "5" }} weight="bold">
							Issue Categories
						</Text>
						{!displayOnlyMode && (
							<button className="edit-button" onClick={() => setEditMode(true)}>
								Edit
							</button>
						)}
					</Flex>

					{selectedKpiSummary.length > 0 ? (
						<Box className="kpi-summary-table">
							<table className="w-full">
								<thead>
									<tr>
										<th>Category</th>
										<th>KPI</th>
										<th>Level</th>
										<th>Goal</th>
									</tr>
								</thead>
								<tbody>
									{selectedKpiSummary.map((kpi) => (
										<tr key={kpi.id}>
											<td title={kpi.kpi_category.name}>
												{kpi.kpi_category.name &&
												kpi.kpi_category.name.length > 25
													? `${kpi.kpi_category.name.substring(0, 25)}...`
													: kpi.kpi_category.name}
											</td>
											<td title={kpi.description}>
												{kpi.description && kpi.description.length > 25
													? `${kpi.description.substring(0, 25)}...`
													: kpi.description}
											</td>
											<td>{kpi.level}</td>
											<td title={kpi.goal}>
												{kpi.goal &&
												typeof kpi.goal === "string" &&
												kpi.goal.length > 25
													? `${kpi.goal.substring(0, 25)}...`
													: kpi.goal}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</Box>
					) : (
						<Text color="gray" size="2">
							No KPIs selected
						</Text>
					)}
				</Flex>
			</Card>
		);
	}

	// Display the edit mode
	return (
		<Card className="kpi-selector-card shadow-sm">
			<Flex direction="column" gap="3">
				<Text size={{ initial: "4", sm: "5" }} weight="bold">
					Issue Categories
				</Text>

				<Flex direction="column" gap="3">
					{isLoadingCategories || isLoadingKpis ? (
						<Flex align="center" justify="center" py="4">
							<Text color="gray" size="2">
								Loading KPIs...
							</Text>
						</Flex>
					) : filteredKpiCategories.length > 0 && kpisArray.length > 0 ? (
						<Box className="kpi-tabs-container">
							<Tabs.Root
								className="kpi-tabs"
								onValueChange={setSelectedTab}
								value={selectedTab}
							>
								{/* Tab navigator with scroll indicators */}
								<div className="tabs-container-with-indicators">
									{/* Left scroll indicator */}
									{showLeftScroll && (
										<div
											className="scroll-indicator left"
											onClick={() => scrollTabs("left")}
										>
											<div className="scroll-indicator-icon">
												<ChevronLeftIcon height={16} width={16} />
											</div>
										</div>
									)}

									{/* Tab list with ref for scroll detection */}
									<Tabs.List
										onScroll={() => {
											if (tabsListRef.current) {
												const { scrollWidth, clientWidth, scrollLeft } =
													tabsListRef.current;
												setShowRightScroll(
													scrollWidth > clientWidth &&
														scrollWidth - clientWidth - scrollLeft > 10,
												);
												setShowLeftScroll(scrollLeft > 10);
											}
										}}
										ref={tabsListRef}
									>
										{tabContents.map((tab) => (
											<Tabs.Trigger key={tab.value} value={tab.value}>
												{tab.trigger}
											</Tabs.Trigger>
										))}
									</Tabs.List>

									{/* Right scroll indicator */}
									{showRightScroll && (
										<div
											className="scroll-indicator right"
											onClick={() => scrollTabs("right")}
										>
											<div className="scroll-indicator-icon">
												<ChevronRightIcon height={16} width={16} />
											</div>
										</div>
									)}
								</div>

								{/* Tab content */}
								{tabContents.map((tab) => (
									<Tabs.Content key={tab.value} value={tab.value}>
										{tab.content}
									</Tabs.Content>
								))}
							</Tabs.Root>
						</Box>
					) : (
						<Box className="py-4 text-center">
							<Text color="gray" size="2">
								No KPIs available
							</Text>
						</Box>
					)}
				</Flex>
			</Flex>
		</Card>
	);
};

export default KPISelector;
