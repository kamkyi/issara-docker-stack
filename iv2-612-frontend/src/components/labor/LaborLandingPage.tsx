// import { HomeIcon, PersonIcon, StarIcon } from "@radix-ui/react-icons";
import { Heading, Text } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { lazy, Suspense, useEffect, useState } from "react";

// import laborEmployerEmployeeRelation from "$src/assets/img/banner-image/labor-employer-employee-relation.png";
// import laborLivingEatingCondition from "$src/assets/img/banner-image/labor-living-eating-condition.png";
// import laborWorkingCondition from "$src/assets/img/banner-image/labor-working-condition.png";
// import {
// 	type CaseOverview,
// 	useCaseOverviewByKPICategory,
// } from "$src/hooks/useSocialResponsibility";

const CTASection = lazy(() => import("../home/CTASection"));
const WorkerViolationsSection = lazy(() =>
	import("../home/WorkerViolationsSection").then((mod) => ({
		default: (mod as any).WorkerViolationsSection,
	})),
);
// const _ProcessOfChange = lazy(() =>
// 	import("./ProcessOfChange").then((mod) => ({
// 		default: (mod as any).ProcessOfChange,
// 	})),
// );
const WorkerVoicesSection = lazy(() =>
	import("./WorkerVoicesSection").then((mod) => ({
		default: (mod as any).WorkerVoicesSection,
	})),
);

export const LaborLandingPage = () => {
	const [heroUrl, setHeroUrl] = useState<string>("");

	useEffect(() => {
		let mounted = true;
		import(
			"$src/assets/img/banner-image/talking-to-cambodian-fishers.jpg"
		).then((m) => {
			if (mounted) setHeroUrl((m as any).default ?? m);
		});
		return () => {
			mounted = false;
		};
	}, []);

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.1,
			},
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: 0.5,
			},
		},
	};

	// const { data } = useCaseOverviewByKPICategory();

	// const apiCategories = useMemo<CaseOverview[]>(() => {
	// 	const raw = data?.data as unknown;
	// 	let categories: CaseOverview[] = [];
	// 	if (Array.isArray(raw)) {
	// 		categories = raw;
	// 	} else if (raw && typeof raw === "object" && "kpi_categories" in raw) {
	// 		const nested = (raw as { kpi_categories?: CaseOverview[] })
	// 			.kpi_categories;
	// 		categories = Array.isArray(nested) ? nested : [];
	// 	}

	// 	// Strictly filter for Labor KPI IDs (5, 8, 9)
	// 	return categories.filter((cat) => [5, 8, 9].includes(cat.id));
	// }, [data]);

	// const categories = useMemo<CategoryCard[]>(() => {
	// 	return apiCategories.map((category) => {
	// 		const visual = categoryVisualMap[
	// 			normalizeCategoryName(category.name)
	// 		] ?? {
	// 			title: category.name,
	// 			description: "",
	// 			icon: <StarIcon className="w-12 h-12 text-white" />,
	// 			bgImage: `url('${laborWorkingCondition}')`,
	// 		};

	// 		return {
	// 			...category,
	// 			...visual,
	// 		};
	// 	});
	// }, [apiCategories]);

	// const stats: StatCard[] = [
	// 	{ value: categories.length || 0, label: "Categories" },
	// 	{ value: 3, label: "Issue Levels" },
	// 	{
	// 		value: data?.data.total_reported_issue.toLocaleString() || 0,
	// 		label: "Total-reported Issues",
	// 	},
	// ];
	return (
		<div className="w-full bg-gray-100 ">
			<div className="bg-[#004A60] px-4 h-16" />
			{/* Header Section */}
			{/* <div className="bg-white px-4 border-gray-200 py-6 sm:py-8 md:py-12">
				<Container className="w-full px-0 sm:px-2" size="4">
					<Flex
						align="center"
						className="flex-col md:flex-row gap-4 sm:gap-6 md:gap-12"
						justify="between"
					>
						<Flex direction="column" gap="2">
							<Heading
								className="animated-underline text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold text-black leading-tight tracking-tight"
								size="8"
							>
								Labor-Related Issues Overview
							</Heading>
						</Flex>

						<Flex
							className="flex flex-wrap gap-4 sm:gap-6 md:gap-8 justify-around w-full md:w-auto"
							gap="8"
						>
							{stats.map((stat, idx) => (
								<Flex
									align="center"
									className="text-center px-2 sm:px-3 md:px-4 border-r-2 border-gray-300 last:border-r-0"
									direction="column"
									gap="1"
									key={idx}
								>
									<Heading
										className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-bold text-[#148696]"
										size="9"
									>
										{stat.value}
									</Heading>
									<Text
										className="text-xs sm:text-sm text-gray-600 font-medium"
										size="1"
									>
										{stat.label}
									</Text>
								</Flex>
							))}
						</Flex>
					</Flex>
				</Container>
			</div> */}

			{/* Hero Section */}
			<div
				className="relative h-[85vh] sm:h-[90vh] md:h-[100vh] bg-scroll sr-cover-image"
				style={{
					background: heroUrl ? `url(${heroUrl})` : undefined,
				}}
			>
				<div className="absolute inset-0 bg-black/40" />
				<div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
					<Heading
						className="text-white leading-tight tracking-tight text-2xl sm:text-3xl md:text-4xl lg:text-5xl max-w-5xl"
						size="9"
					>
						Go beyond the snapshot.
						<br /> Real-time visibility into the dynamic labor conditions in
						your supply chains
					</Heading>
				</div>
			</div>
			<div className="relative flex items-center justify-center bg-gradient-to-br from-[#148696] to-[#0d5f6d] text-white py-8 px-4">
				<div className="max-w-[1200px] px-4">
					<motion.div
						animate="visible"
						initial="hidden"
						variants={containerVariants}
					>
						<motion.div className="text-center mb-8" variants={itemVariants}>
							<Heading
								className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight tracking-tight"
								mb={"6"}
								size="8"
							>
								<p className="text-white">
									If you want to know the reality about working conditions,
								</p>{" "}
								you need to hear from workers.
							</Heading>
							<Text className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto font-light leading-relaxed">
								Workers across Tier 1 and upstream supplier sites proactively
								share honest signals regarding their labor conditions with us,
								because we are known and trusted service providers with
								expertise in remediation and capacity building.
								<span className="text-yellow-100">
									&nbsp; Through partnership, we pass the value of our
									independence and expertise on to values-aligned company
									partners.
								</span>
							</Text>
						</motion.div>
					</motion.div>
				</div>
			</div>
			<Suspense
				fallback={<div className="py-12 text-center">Loading sections…</div>}
			>
				<WorkerViolationsSection />
				{/* Process of Change Section */}
				{/* <ProcessOfChange /> */}
				{/* Worker Voices Section */}
				<WorkerVoicesSection />
				<CTASection />
			</Suspense>
		</div>
	);
};
