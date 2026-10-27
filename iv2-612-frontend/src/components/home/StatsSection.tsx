import { Box, Flex, Heading } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import CountUp from "react-countup";
import { useInView } from "react-intersection-observer";
import { api } from "$src/api/axios";

const defaultStats = [
	{
		end: 600000,
		label: "Workers connected to worker voice channels",

		image: "/src/assets/img/stats/workers-calls.jpg",
	},
	{
		end: 10000,
		label: "Calls and messages from workers",

		image: "/src/assets/img/stats/industries.jpg",
	},
	{
		end: 450000,
		label: "Number of workers with labor issues identified and remediated",

		image: "/src/assets/img/stats/remediation.jpg",
	},
	// {
	// 	end: 95,
	// 	label: "Remediation-related money paid back to workers",
	//
	// 	prefix: "$",
	// 	image: "/src/assets/img/stats/satisfaction.jpg",
	// },
];

type StatType = (typeof defaultStats)[0] & { prefix?: string };

type ApiShape = Record<string, any> | { data?: Record<string, any> };

const getNumberFrom = (obj: any, keys: string[], fallback: number): number => {
	if (!obj) return fallback;
	for (const k of keys) {
		const v = obj[k];
		if (typeof v === "number" && Number.isFinite(v)) return v;
		if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)))
			return Number(v);
	}
	return fallback;
};

const StatCard = ({ end, label, image, prefix }: StatType) => {
	const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
	const [isHovering, setIsHovering] = useState(false);

	return (
		<Flex
			align="center"
			className="relative h-72 overflow-hidden border border-white/10 group cursor-pointer transition-all duration-300 md:h-80 lg:h-96"
			direction="column"
			justify="center"
			onMouseEnter={() => setIsHovering(true)}
			onMouseLeave={() => setIsHovering(false)}
			ref={ref}
		>
			{/* Background image with overlay */}
			<div
				className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
				style={{
					backgroundImage: `url('${image}')`,
					opacity: isHovering ? 0.4 : 0,
				}}
			/>

			{/* Dark overlay for better text contrast */}
			<div
				className="absolute inset-0 bg-black transition-opacity duration-300"
				style={{
					opacity: isHovering ? 0.5 : 0,
				}}
			/>

			{/* Content */}
			<div className="relative z-10 mx-auto max-w-sm px-6 text-center">
				<p className="font-heading text-3xl text-white sm:text-4xl lg:text-5xl">
					{inView ? (
						<CountUp
							className="text-white"
							duration={2.5}
							end={end}
							prefix={prefix}
							separator=","
						/>
					) : (
						`${prefix ?? ""}0$`
					)}
				</p>
				<p className="mt-4 text-sm text-white/90 md:text-base lg:text-lg">
					{label}
				</p>
			</div>
		</Flex>
	);
};

export const StatsSection = () => {
	const [stats, setStats] = useState<StatType[]>(defaultStats);
	const [, setLoading] = useState(true);
	const [, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		const API_BASE =
			import.meta.env.VITE_APP_CASCADE_API_URL ??
			"http://localhost:3000/api/v1";
		const params = new URLSearchParams({ from: "2018-01-01" });
		const url = `${API_BASE}/social-responsibility/labor/recruitment-metrics?${params.toString()}`;

		async function load() {
			try {
				const response = await api.get<ApiShape>(url);
				const json = response.data;
				const payload = (json as any).data ?? json;

				const mapped: StatType[] = [
					{
						...defaultStats[0],
						end: getNumberFrom(
							payload,
							[
								"workers_connected",
								"total_workers_connected",
								"workersConnected",
								"connected_workers",
							],
							defaultStats[0].end,
						),
					},
					{
						...defaultStats[1],
						end: getNumberFrom(
							payload,
							[
								"calls_and_messages",
								"calls_messages",
								"total_calls",
								"messages",
							],
							defaultStats[1].end,
						),
					},
					{
						...defaultStats[2],
						end: getNumberFrom(
							payload,
							[
								"workers_receiving_remediation",
								"workers_receiving_remediation_count",
								"receiving_remediation",
							],
							defaultStats[2].end,
						),
					},
					// {
					// 	...defaultStats[3],
					// 	end: getNumberFrom(
					// 		payload,
					// 		[
					// 			"remediation_money_paid",
					// 			"remediation_money",
					// 			"money_paid_back",
					// 			"remediation_amount",
					// 		],
					// 		defaultStats[3].end,
					// 	),
					// },
				];

				if (mounted) {
					setStats(mapped);
					setError(null);
				}
			} catch (err: any) {
				if (mounted) setError(err?.message ?? "Failed to load metrics");
			} finally {
				if (mounted) setLoading(false);
			}
		}

		load();
		return () => {
			mounted = false;
		};
	}, []);

	// (UI remains the same; we only swap to `stats` state)

	return (
		<>
			<section
				aria-labelledby="cascade-action-network"
				className="w-full"
				style={{ backgroundColor: "#00516a" }}
			>
				<div className="container mx-auto px-6 py-20">
					<div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6">
						<div className="md:col-span-5">
							<Heading
								className="text-white font-extrabold leading-tight text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
								size={"9"}
							>
								CASCADE Action <br /> Network Impact
							</Heading>
						</div>
						<div className="md:col-span-7">
							<p className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl max-w-2xl ml-auto">
								Inclusive Labor Monitoring - Transforming supply chains from the
								ground up since January 2018
							</p>
						</div>
					</div>
				</div>
			</section>

			<Box className="border-y border-white/10 bg-[#00516a]">
				<div className="mx-auto grid max-w-6xl grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
					{stats.map((stat, index) => (
						<StatCard key={index} {...stat} />
					))}
				</div>
			</Box>
		</>
	);
};
