import { Groups } from "@mui/icons-material";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { statusColorPalette } from "$src/assets/mock/common-data";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { requireRecruiterSupplierAuth } from "$src/utils/auth";

export const Route = createFileRoute("/marketplace/")({
	component: RouteComponent,
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireRecruiterSupplierAuth({
			isAuthenticated,
			role,
		});
	},
});

function RouteComponent() {
	const navigate = useNavigate();
	return (
		<GuestLayout>
			<div className="container mx-auto">
				{/* <img
					alt="Marketplace Banner"
					className="w-full h-100 object-cover rounded-sm mb-8"
					src={BannerImage}
				/> */}
				{/* <h1 className="text-3xl font-bold mb-6">MARKETPLACE</h1> */}
				<div className="mx-auto">
					<div
						className=" my-6 rounded-sm h-[350px] flex flex-col justify-center items-center"
						style={{
							backgroundSize: "cover",
							backgroundPosition: "center",
						}}
					>
						<div className="rounded-sm shadow-lg p-6 mb-8 bg-[#148696]">
							<h3 className="text-3xl font-bold mb-4 text-white text-shadow-md uppercase">
								Welcome to the Marketplace
							</h3>
							<p className="mb- text-white text-shadow-sm text-lg">
								Discover ethical workers, responsible recruitment agencies and
								sustainable business partners committed to fair labor practices
								and social responsibility. Connect with verified partners who
								share your commitment to ethical business practices and worker
								welfare.
							</p>
						</div>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
						<div
							className="hover:shadow-md cursor-pointer rounded-sm p-6 border border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100"
							onClick={() => navigate({ to: "/marketplace/new-job-post" })}
						>
							<div className="flex items-center mb-4">
								<div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-sm flex items-center justify-center">
									<svg
										className="w-6 h-6 text-blue-400 dark:text-blue-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M9 7V6a2 2 0 012-2h2a2 2 0 012 2v1h3a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h3zm0 0h6m-6 4h6"
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
										/>
									</svg>
								</div>
								<h3 className="text-xl font-semibold ml-3">Job Posting</h3>
							</div>
							<p className="text-sm">
								Enables to create, manage and publish job listings to attract
								and recruit candidates.
							</p>
						</div>

						<div
							className="hover:shadow-md cursor-pointer rounded-sm p-6 border border-gray-300"
							onClick={() => navigate({ to: "/marketplace/job-posting" })}
						>
							<div className="flex items-center mb-4">
								<div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-sm flex items-center justify-center">
									<svg
										className="w-6 h-6 text-green-600 dark:text-green-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
										/>
									</svg>
								</div>
								<h3 className="text-xl font-semibold ml-3">
									Job Posts Management
								</h3>
							</div>
							<p className="text-sm">
								Manage all your job postings - drafts, posted, closed, and
								archived.
							</p>
						</div>

						<div className="hover:shadow-md cursor-pointer rounded-sm p-6 border border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100">
							<div className="flex items-center mb-4">
								<div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-sm flex items-center justify-center">
									<svg
										className="w-6 h-6 text-purple-600 dark:text-purple-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
										/>
									</svg>
								</div>
								<h3 className="text-xl font-semibold ml-3">
									Certified Partners
								</h3>
							</div>
							<p className="text-sm">
								Find partners with verified certifications and compliance
								records.
							</p>
						</div>
					</div>

					<div className="mt-6 relative overflow-hidden rounded-sm">
						<Groups
							className="absolute"
							style={{
								fontSize: 230,
								right: -10,
								top: -5,
								opacity: 0.1,
								color: statusColorPalette[0],
							}}
						/>
						<h3 className="text-3xl font-semibold p-2">Getting Started</h3>
						<div className="p-2">
							<p className="flex items-center text-lg">
								<span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
								Grow your business with the right people.
							</p>
							<p className="flex items-center text-lg">
								<span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
								Find great people to power your success.
							</p>
							<p className="flex items-center text-lg">
								<span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
								Create a job post. Review applicants. Hire with confidence.
							</p>
						</div>
					</div>
				</div>
			</div>
		</GuestLayout>
	);
}
