import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "../../layouts/AdminLayout";

export const Route = createFileRoute("/admin/users")({
	component: RouteComponent,
});

const WORKOS_URL = "https://dashboard.workos.com/get-started";

function RouteComponent() {
	return (
		<AdminLayout>
			<div className="space-y-6">
				<div>
					<h1 className="mb-xl font-black uppercase tracking-[-0.022em]">
						User Management
					</h1>
					<p className="text-sm text-gray-500 mt-1">
						Users and access are managed directly in WorkOS.
					</p>
				</div>

				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center gap-5 text-center max-w-md">
					<div className="flex items-center justify-center rounded-xl p-4 bg-[#e8f4f7]">
						<svg
							className="text-[#004A60]"
							fill="none"
							height="32"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="1.8"
							viewBox="0 0 24 24"
							width="32"
						>
							<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
							<circle cx="9" cy="7" r="4" />
							<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
							<path d="M16 3.13a4 4 0 0 1 0 7.75" />
						</svg>
					</div>
					<div>
						<h2 className="text-lg font-bold text-gray-800">
							Manage Users in WorkOS
						</h2>
						<p className="text-sm text-gray-500 mt-1">
							Invite, remove, and manage roles for all users from the WorkOS
							Dashboard — the single source of truth for user access.
						</p>
					</div>
					<a
						className="inline-flex items-center gap-2 bg-[#004A60] hover:bg-[#003d50] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
						href={WORKOS_URL}
						rel="noopener noreferrer"
						target="_blank"
					>
						Open WorkOS Dashboard
						<ExternalLinkIcon height={14} width={14} />
					</a>
				</div>
			</div>
		</AdminLayout>
	);
}
