import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { createFileRoute } from "@tanstack/react-router";
import { useFlags } from "flagsmith/react";
import { AdminLayout } from "../../layouts/AdminLayout";

export const Route = createFileRoute("/admin/settings")({
	component: RouteComponent,
});

interface ConfigRowProps {
	label: string;
	value: string;
}

const ConfigRow = ({ label, value }: ConfigRowProps) => (
	<div className="flex flex-col sm:flex-row sm:items-center gap-1 py-3 border-b border-gray-50 last:border-b-0">
		<span className="text-xs font-semibold uppercase tracking-wide text-gray-400 sm:w-52 shrink-0">
			{label}
		</span>
		<span className="font-mono text-xs text-gray-700 break-all bg-gray-50 px-2 py-1 rounded">
			{value || "—"}
		</span>
	</div>
);

const EXTERNAL_LINKS = [
	{
		label: "WorkOS Dashboard",
		description: "Manage users, roles, and authentication",
		url: "https://dashboard.workos.com/get-started",
		color: "#004A60",
		bg: "#e8f4f7",
	},
	{
		label: "Flagsmith",
		description: "Feature flags and remote config",
		url: "https://app.flagsmith.com",
		color: "#7c3aed",
		bg: "#f5f3ff",
	},
];

function RouteComponent() {
	const flags = useFlags(["use_mock_data"]);
	const apiUrl = import.meta.env.VITE_APP_API_URL as string;
	const cascadeApiUrl = import.meta.env.VITE_APP_CASCADE_API_URL as string;
	const gdApiUrl = import.meta.env.VITE_APP_GD_API_URL as string;
	const gatewayUrl = import.meta.env.VITE_APP_API_GATEWAY_URL as string;
	const clientVersion = import.meta.env.VITE_CLIENT_VERSION as string;
	// Mock data is owned by the Flagsmith `use_mock_data` flag, per Flagsmith
	// environment (development / staging / production).
	const mockDataEnabled = flags.use_mock_data?.enabled ?? false;
	const authkitUrl = import.meta.env.VITE_APP_AUTHKIT_URL as string;
	const orgId = import.meta.env.VITE_APP_AUTHKIT_ORG_ID as string;

	return (
		<AdminLayout>
			<div className="space-y-8">
				<div>
					<h1 className="mb-xl font-black uppercase tracking-[-0.022em]">
						Settings
					</h1>
					<p className="text-sm text-gray-500 mt-1">
						System configuration and external tool links.
					</p>
				</div>

				{/* Quick links */}
				<section className="space-y-3">
					<h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
						External Tools
					</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{EXTERNAL_LINKS.map((link) => (
							<a
								className="flex items-start gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow group"
								href={link.url}
								key={link.label}
								rel="noopener noreferrer"
								target="_blank"
							>
								<div
									className="flex items-center justify-center rounded-xl p-2.5 shrink-0"
									style={{ backgroundColor: link.bg }}
								>
									<ExternalLinkIcon
										height={18}
										style={{ color: link.color }}
										width={18}
									/>
								</div>
								<div className="flex-1 min-w-0">
									<p
										className="text-sm font-bold"
										style={{ color: link.color }}
									>
										{link.label}
									</p>
									<p className="text-xs text-gray-500 mt-0.5">
										{link.description}
									</p>
								</div>
								<ExternalLinkIcon
									className="text-gray-300 group-hover:text-gray-400 transition-colors shrink-0 mt-0.5"
									height={13}
									width={13}
								/>
							</a>
						))}
					</div>
				</section>

				{/* API config */}
				<section className="space-y-3">
					<h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
						API Configuration
					</h2>
					<div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-2">
						<ConfigRow label="Client Version" value={clientVersion} />
						<ConfigRow label="Main API URL" value={apiUrl} />
						<ConfigRow label="CASCADE API URL" value={cascadeApiUrl} />
						<ConfigRow label="GD API URL" value={gdApiUrl} />
						<ConfigRow label="API Gateway URL" value={gatewayUrl} />
					</div>
				</section>

				{/* Auth config */}
				<section className="space-y-3">
					<h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
						Authentication (WorkOS)
					</h2>
					<div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-2">
						<ConfigRow label="AuthKit URL" value={authkitUrl} />
						<ConfigRow label="Organization ID" value={orgId} />
					</div>
				</section>

				{/* Feature flags */}
				<section className="space-y-3">
					<h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
						Feature Flags
					</h2>
					<div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-2">
						<div className="flex flex-col sm:flex-row sm:items-center gap-1 py-3">
							<span className="text-xs font-semibold uppercase tracking-wide text-gray-400 sm:w-52 shrink-0">
								Mock Data Mode
							</span>
							<span
								className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${
									mockDataEnabled
										? "bg-amber-50 text-amber-700 border-amber-200"
										: "bg-green-50 text-green-700 border-green-200"
								}`}
							>
								{mockDataEnabled ? "Enabled" : "Disabled"}
							</span>
						</div>
					</div>
				</section>
			</div>
		</AdminLayout>
	);
}
