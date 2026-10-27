import Checkbox from "@mui/material/Checkbox";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Box } from "@radix-ui/themes";
import { createFileRoute } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import CircularProgressChart from "$src/components/charts/CircularProgressChart";
import DataTable from "$src/components/tables/DataTable";
import DataTableFilterBar from "$src/components/tables/DataTableFilterBar";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { requireSupplierOrGlobalPartnerAuth } from "$src/utils/auth";
import companiesData from "../assets/mock/recruitment-agencies.json";

const addIdToCompanies = (companies: any[]) =>
	companies.map((c, index) => ({ ...c, id: c.name || index }));

export const Route = createFileRoute("/recruitment-agencies")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireSupplierOrGlobalPartnerAuth({ isAuthenticated, role });
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { theme } = useTheme();

	const initialDesignerCompanies = addIdToCompanies(
		companiesData.companies,
	).map((c) => ({
		...c,
		include: false,
	}));

	const initialCurrentCompanies = addIdToCompanies(
		companiesData.companies2,
	).map((c) => ({
		...c,
		include: true,
	}));
	const initialCurrentIncludedCount = initialCurrentCompanies.length;
	const initialCurrentScore =
		initialCurrentIncludedCount > 0
			? initialCurrentCompanies.reduce(
					(sum, company) => sum + company.eps * 20,
					0,
				) / initialCurrentIncludedCount
			: 0;

	const currentScore = initialCurrentScore;
	const [designerScore, setDesignerScore] = useState(initialCurrentScore);
	const [includedCount, setIncludedCount] = useState(
		initialCurrentIncludedCount,
	);

	const [currentIncludedCount, setCurrentIncludedCount] = useState(
		initialCurrentIncludedCount,
	);

	const [selectedCountry, setSelectedCountry] = useState("All");
	const [selectedIndustry, setSelectedIndustry] = useState("All");
	const [selectedEps, setSelectedEps] = useState("All");
	const [selectedWorkerVoice, setSelectedWorkerVoice] = useState("All");
	const [selectedEppPolicy, setSelectedEppPolicy] = useState("All");

	const [currentSelectedCountry, setCurrentSelectedCountry] = useState("All");
	const [currentSelectedIndustry, setCurrentSelectedIndustry] = useState("All");
	const [currentSelectedEps, setCurrentSelectedEps] = useState("All");
	const [currentSelectedWorkerVoice, setCurrentSelectedWorkerVoice] =
		useState("All");
	const [currentSelectedEppPolicy, setCurrentSelectedEppPolicy] =
		useState("All");

	const scrollRef = useRef<HTMLDivElement>(null);

	const handleWheel = (e: WheelEvent) => {
		e.preventDefault();
		if (scrollRef.current) {
			scrollRef.current.scrollBy({
				left: e.deltaY,
				behavior: "smooth",
			});
		}
	};

	useEffect(() => {
		const current = scrollRef.current;
		if (current) {
			current.addEventListener("wheel", handleWheel, { passive: false });
			return () => current.removeEventListener("wheel", handleWheel);
		}
	}, []);

	const [allCompanies, setAllCompanies] = useState(initialDesignerCompanies);
	const [companiesState, setCompaniesState] = useState(
		initialDesignerCompanies,
	);

	const [allCurrentCompanies, setAllCurrentCompanies] = useState(
		initialCurrentCompanies,
	);
	const [currentCompanyState, setCurrentCompanyState] = useState(
		initialCurrentCompanies,
	);

	const handleCheckboxChange = (id: any, field: string, isChecked: boolean) => {
		let companyToUpdate: any;
		const updatedAllCompanies = allCompanies.map((c) => {
			if (c.id === id) {
				companyToUpdate = { ...c, [field]: isChecked };
				return companyToUpdate;
			}
			return c;
		});

		if (!companyToUpdate) return;

		setAllCompanies(updatedAllCompanies);

		const sign = isChecked ? 1 : -1;
		const currValue = companyToUpdate.eps * 20 * sign;
		const newScore =
			(designerScore * includedCount + currValue) / (includedCount + sign);

		if (includedCount + sign === 0) {
			setDesignerScore(0);
			setIncludedCount(0);
			return;
		}
		setIncludedCount(includedCount + sign);
		setDesignerScore(newScore);
	};

	const handleCurrentCompanyCheckboxChange = (
		id: any,
		field: string,
		isChecked: boolean,
	) => {
		let companyToUpdate: any;
		const updatedAllCurrentCompanies = allCurrentCompanies.map((c) => {
			if (c.id === id) {
				companyToUpdate = { ...c, [field]: isChecked };
				return companyToUpdate;
			}
			return c;
		});

		if (!companyToUpdate) return;

		setAllCurrentCompanies(updatedAllCurrentCompanies);

		const sign = isChecked ? 1 : -1;
		const currValue = companyToUpdate.eps * 20 * sign;

		// Update current score
		const newCurrentIncludedCount = currentIncludedCount + sign;
		if (newCurrentIncludedCount === 0) {
			// setCurrentScore(0);
			setCurrentIncludedCount(0);
		} else {
			setCurrentIncludedCount(newCurrentIncludedCount);
			// setCurrentScore(newCurrentScore);
		}

		// Update designer score
		const newIncludedCount = includedCount + sign;
		if (newIncludedCount === 0) {
			setDesignerScore(0);
			setIncludedCount(0);
		} else {
			const newDesignerScore =
				(designerScore * includedCount + currValue) / newIncludedCount;
			setIncludedCount(newIncludedCount);
			setDesignerScore(newDesignerScore);
		}
	};

	const otherPotentialSuppliersColumns = [
		{
			field: "name",
			headerName: "Company Name",
		},
		{ field: "country", headerName: "Based Country" },
		{ field: "sendingCountries", headerName: "Sending Countries" },
		{ field: "eps", headerName: "CI" },
		{ field: "worker_voice", headerName: "Worker Voice" },
		{ field: "epp_policy", headerName: "EPP Policy" },
		{ field: "include", headerName: "Include in score model?" },
	];

	const countryOptions = [
		{
			label: "Thailand",
			value: "Thailand",
		},
		{
			label: "Cambodia",
			value: "Cambodia",
		},
		{
			label: "Bangladesh",
			value: "Bangladesh",
		},
	];

	const epsOptions = [
		{ label: "80-100", value: "80-100" },
		{ label: "60-79", value: "60-79" },
		{ label: "40-59", value: "40-59" },
		{ label: "20-39", value: "20-39" },
		{ label: "0-19", value: "0-19" },
	];

	const workerVoiceOptions = [
		{ label: "Yes", value: "true" },
		{ label: "No", value: "false" },
	];

	const eppPolicyOptions = [
		{ label: "Yes", value: "true" },
		{ label: "No", value: "false" },
	];

	const applyFilters = () => {
		let filteredCompanies = allCompanies;

		if (selectedCountry !== "All") {
			filteredCompanies = filteredCompanies.filter(
				(comp) => comp.country === selectedCountry,
			);
		}

		if (selectedIndustry !== "All") {
			filteredCompanies = filteredCompanies.filter(
				(comp) => comp.industry === selectedIndustry,
			);
		}

		if (selectedEps !== "All") {
			const [min, max] = selectedEps.split("-").map(Number);
			filteredCompanies = filteredCompanies.filter(
				(comp) => comp.eps * 20 >= min && comp.eps * 20 <= max,
			);
		}

		if (selectedWorkerVoice !== "All") {
			filteredCompanies = filteredCompanies.filter(
				(comp) => comp.worker_voice.toString() === selectedWorkerVoice,
			);
		}

		if (selectedEppPolicy !== "All") {
			filteredCompanies = filteredCompanies.filter(
				(comp) => comp.epp_policy.toString() === selectedEppPolicy,
			);
		}

		setCompaniesState(filteredCompanies);
	};

	useEffect(() => {
		applyFilters();
	}, [
		selectedCountry,
		selectedIndustry,
		selectedEps,
		selectedWorkerVoice,
		selectedEppPolicy,
		allCompanies,
	]);

	const applyCurrentFilters = () => {
		let filteredCompanies = allCurrentCompanies;

		if (currentSelectedCountry !== "All") {
			filteredCompanies = filteredCompanies.filter(
				(comp) => comp.country === currentSelectedCountry,
			);
		}

		if (currentSelectedIndustry !== "All") {
			filteredCompanies = filteredCompanies.filter(
				(comp) => comp.industry === currentSelectedIndustry,
			);
		}

		if (currentSelectedEps !== "All") {
			const [min, max] = currentSelectedEps.split("-").map(Number);
			filteredCompanies = filteredCompanies.filter(
				(comp) => comp.eps * 20 >= min && comp.eps * 20 <= max,
			);
		}

		if (currentSelectedWorkerVoice !== "All") {
			filteredCompanies = filteredCompanies.filter(
				(comp) => comp.worker_voice.toString() === currentSelectedWorkerVoice,
			);
		}

		if (currentSelectedEppPolicy !== "All") {
			filteredCompanies = filteredCompanies.filter(
				(comp) => comp.epp_policy.toString() === currentSelectedEppPolicy,
			);
		}

		setCurrentCompanyState(filteredCompanies);
	};

	useEffect(() => {
		applyCurrentFilters();
	}, [
		currentSelectedCountry,
		currentSelectedIndustry,
		currentSelectedEps,
		currentSelectedWorkerVoice,
		currentSelectedEppPolicy,
		allCurrentCompanies,
	]);

	const handleSelectCountry = (country: string) => {
		setSelectedCountry(country);
	};

	const handleSelectIndustry = (industry: string) => {
		setSelectedIndustry(industry);
	};

	const handleSelectEps = (eps: string) => {
		setSelectedEps(eps);
	};

	const handleSelectWorkerVoice = (workerVoice: string) => {
		setSelectedWorkerVoice(workerVoice);
	};

	const handleSelectEppPolicy = (eppPolicy: string) => {
		setSelectedEppPolicy(eppPolicy);
	};

	const handleCurrentSelectCountry = (country: string) => {
		setCurrentSelectedCountry(country);
	};

	const handleCurrentSelectIndustry = (industry: string) => {
		setCurrentSelectedIndustry(industry);
	};

	const handleCurrentSelectEps = (eps: string) => {
		setCurrentSelectedEps(eps);
	};

	const handleCurrentSelectWorkerVoice = (workerVoice: string) => {
		setCurrentSelectedWorkerVoice(workerVoice);
	};

	const handleCurrentSelectEppPolicy = (eppPolicy: string) => {
		setCurrentSelectedEppPolicy(eppPolicy);
	};

	const createColumns = (
		handler: (id: any, field: string, isChecked: boolean) => void,
	): GridColDef[] => {
		return otherPotentialSuppliersColumns.map((col) => {
			if (col.field === "epp_policy") {
				return {
					...col,
					renderCell: (params: GridRenderCellParams) =>
						params.value ? (
							<span className="text-teal">Yes</span>
						) : (
							<span className="text-gray">No</span>
						),
				};
			} else if (col.field === "worker_voice") {
				return {
					...col,
					renderCell: (params: GridRenderCellParams) =>
						params.value ? (
							<span className="text-teal">Yes</span>
						) : (
							<span>No</span>
						),
				};
			} else if (col.field === "include") {
				return {
					...col,
					renderCell: (params: GridRenderCellParams) => (
						<Checkbox
							checked={!!params.value}
							onChange={(e) =>
								handler(params.id, params.field, e.target.checked)
							}
							size="small"
							style={{ height: 5, width: 5 }}
							sx={{
								"&.MuiCheckbox-colorPrimary": {
									color: "#1AAEC3",
								},
							}}
						/>
					),
				};
			}
			return { ...col, flex: 1 };
		});
	};

	const currentSuppliersColumns = createColumns(
		handleCurrentCompanyCheckboxChange,
	);
	const otherPotentialSuppliersModifiedColumns =
		createColumns(handleCheckboxChange);

	return (
		<GuestLayout>
			<div className="container mx-auto px-l py-xl">
				<div className="grid grid-cols-1 md:grid-cols-5 gap-12 items-center">
					<div className="md:col-span-3 order-2 md:order-1 my-8">
						<h1 className="heading-display mb-xl font-black uppercase tracking-[-0.022em]">
							Recruitment Agencies
						</h1>
						<p className="max-w-lg">
							Recruitment agencies play a critical role in connecting employers
							with qualified candidates, helping organizations streamline the
							hiring process while providing job seekers with access to new
							opportunities.
						</p>
					</div>
				</div>
			</div>
			<Box>
				<div className="flex flex-col items-center mb-8">
					<h2
						className="text-2xl md:text-3xl font-extrabold text-center tracking-tight"
						style={{
							letterSpacing: "0.01em",
							lineHeight: 1.15,
							marginBottom: "0.5rem",
							fontFamily: "Lato, sans-serif",
							color: theme === "dark" ? "#1AAEC3" : "#004A60",
						}}
					>
						Cascade Index (CI)
					</h2>
				</div>
				<div className="grid md:grid-cols-2 sm:grid-cols-1 lg:grid-cols-2 gap-4">
					<Box>
						<div className="gap-8 sm:columns-2 lg:columns-2 md:columns-1 justify-items-center">
							<div
								className="p-4"
								style={{
									width: 230,
								}}
							>
								<CircularProgressChart
									color={"26, 174, 195"}
									completed={Number(currentScore).toFixed(1)}
									label="CI Today"
								/>
							</div>
							<div
								className="p-4"
								style={{
									width: 230,
								}}
							>
								<CircularProgressChart
									color={"26, 174, 195"}
									completed={Number(designerScore).toFixed(1)}
									label="CI Supply Chain Designer"
								/>
							</div>
						</div>
						<div className="font-bold mb-2 title-small">
							Current recruitment agencies at-a-glance
						</div>
						<div className="my-4">
							<DataTableFilterBar
								countryOptions={countryOptions}
								// industryOptions={industryOptions}
								eppPolicyOptions={eppPolicyOptions}
								epsOptions={epsOptions}
								handleSelectCountry={handleCurrentSelectCountry}
								handleSelectEppPolicy={handleCurrentSelectEppPolicy}
								handleSelectEps={handleCurrentSelectEps}
								handleSelectIndustry={handleCurrentSelectIndustry}
								handleSelectWorkerVoice={handleCurrentSelectWorkerVoice}
								workerVoiceOptions={workerVoiceOptions}
							/>
						</div>
						<DataTable
							columns={currentSuppliersColumns}
							dense
							rows={currentCompanyState.map((comp) => ({
								...comp,
								eps: comp.eps * 20,
							}))}
						/>
					</Box>

					<Box>
						<span className="font-bold mb-2 title-small text-white-100">
							Other potential recruitment agencies choosing to share their
							scores
						</span>
						<div className="my-4">
							<DataTableFilterBar
								countryOptions={countryOptions}
								// industryOptions={industryOptions}
								eppPolicyOptions={eppPolicyOptions}
								epsOptions={epsOptions}
								handleSelectCountry={handleSelectCountry}
								handleSelectEppPolicy={handleSelectEppPolicy}
								handleSelectEps={handleSelectEps}
								handleSelectIndustry={handleSelectIndustry}
								handleSelectWorkerVoice={handleSelectWorkerVoice}
								workerVoiceOptions={workerVoiceOptions}
							/>
						</div>
						<DataTable
							columns={otherPotentialSuppliersModifiedColumns}
							dense
							rows={companiesState.map((comp) => ({
								...comp,
								eps: comp.eps * 20,
							}))}
						/>
					</Box>
				</div>
			</Box>
		</GuestLayout>
	);
}
