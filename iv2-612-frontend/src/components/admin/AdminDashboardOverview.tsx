import {
	BarChartIcon,
	CheckCircledIcon,
	ExclamationTriangleIcon,
	PersonIcon,
} from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import {
	useStrategicPartners,
	useSupplierKPIs,
} from "$src/hooks/useSupplyChain";

interface StatCardProps {
	label: string;
	value: number | string;
	icon: React.ReactNode;
	color: string;
	bgColor: string;
	delay?: number;
}

const StatCard = ({
	label,
	value,
	icon,
	color,
	bgColor,
	delay = 0,
}: StatCardProps) => (
	<motion.div
		animate={{ opacity: 1, y: 0 }}
		className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-5"
		initial={{ opacity: 0, y: 16 }}
		transition={{ delay, duration: 0.3, ease: "easeOut" }}
	>
		<div
			className="flex items-center justify-center rounded-xl p-3 shrink-0"
			style={{ backgroundColor: bgColor }}
		>
			<span style={{ color }}>{icon}</span>
		</div>
		<div>
			<p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
				{label}
			</p>
			<p className="text-3xl font-black text-gray-800 leading-none">{value}</p>
		</div>
	</motion.div>
);

export const AdminDashboardOverview = () => {
	const { data: partners = [], isLoading: partnersLoading } =
		useStrategicPartners();

	const { data: openKPIs, isLoading: openLoading } = useSupplierKPIs({
		show_closed: false,
	});

	const { data: closedKPIs, isLoading: closedLoading } = useSupplierKPIs({
		show_closed: true,
	});

	const totalPartners = partners.length;
	const openCount = openKPIs?.count ?? 0;
	// closed endpoint returns all; subtract open to get closed-only count
	const closedCount = Math.max(0, (closedKPIs?.count ?? 0) - openCount);

	const fmt = (n: number, loading: boolean) =>
		loading ? "—" : n.toLocaleString();

	return (
		<div className="space-y-8">
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				initial={{ opacity: 0, y: 8 }}
				transition={{ duration: 0.25 }}
			>
				<h1 className="text-2xl font-black text-gray-800">Admin Dashboard</h1>
				<p className="text-sm text-gray-500 mt-1">
					Global system metrics across all strategic partners.
				</p>
			</motion.div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
				<StatCard
					bgColor="#e8f4f7"
					color="#004A60"
					delay={0.05}
					icon={<PersonIcon height={22} width={22} />}
					label="Strategic Partners"
					value={fmt(totalPartners, partnersLoading)}
				/>
				<StatCard
					bgColor="#fef3c7"
					color="#d97706"
					delay={0.1}
					icon={<ExclamationTriangleIcon height={22} width={22} />}
					label="Open Escalations"
					value={fmt(openCount, openLoading)}
				/>
				<StatCard
					bgColor="#d1fae5"
					color="#059669"
					delay={0.15}
					icon={<CheckCircledIcon height={22} width={22} />}
					label="Resolved Issues"
					value={fmt(closedCount, closedLoading)}
				/>
			</div>

			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
				initial={{ opacity: 0, y: 12 }}
				transition={{ delay: 0.2, duration: 0.3 }}
			>
				<div className="flex items-center gap-2 mb-4">
					<BarChartIcon className="text-[#004A60]" height={18} width={18} />
					<h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
						Strategic Partners
					</h2>
				</div>
				{partnersLoading ? (
					<p className="text-sm text-gray-400">Loading...</p>
				) : partners.length === 0 ? (
					<p className="text-sm text-gray-400">No partners found.</p>
				) : (
					<div className="divide-y divide-gray-50">
						{partners.map((partner, i) => (
							<motion.div
								animate={{ opacity: 1 }}
								className="flex items-center justify-between py-2.5"
								initial={{ opacity: 0 }}
								key={partner.id}
								transition={{ delay: 0.22 + i * 0.03 }}
							>
								<span className="text-sm font-medium text-gray-700">
									{partner.name}
								</span>
								<span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
									ID {partner.id}
								</span>
							</motion.div>
						))}
					</div>
				)}
			</motion.div>
		</div>
	);
};
