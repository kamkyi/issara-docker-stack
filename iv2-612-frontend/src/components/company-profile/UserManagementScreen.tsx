import moment from "moment";
import { useMemo, useState } from "react";
import { statusColorPaletteShadow } from "$src/assets/mock/common-data";
// import CascadeButton from "$src/components/button/button";
import InviteUserModal, {
	type InviteUserFormValues,
} from "$src/components/company-profile/InviteUserModal";
import WorkerProfileModal from "$src/components/company-profile/WorkerProfileModal";
import { useStrategicPartnerById } from "$src/hooks/useStrategicPartner";
import { useStrategicPartnerUsers } from "$src/hooks/useStrategicPartnerUsers";
import { useSupplierUsers } from "$src/hooks/useSupplierUsers";
import { useTranslation } from "$src/hooks/useTranslation";
import { getStrategicPartnerId } from "$src/utils/auth-utils";
import { getUserIdentifiers } from "$src/utils/getUserIdentifiers";
import { getRoleLabel } from "$src/utils/roleLabel";
import type {
	WorkerProfileDetail,
	WorkerVerificationRequest,
} from "$src/utils/workerVerification";

interface UserManagementMember {
	id: number;
	name: string;
	email: string;
	role: string;
	status: "Active" | "Pending" | "Inactive";
	lastActive: string;
}

interface UserManagementScreenProps {
	members?: UserManagementMember[];
	onInviteUser: (values: InviteUserFormValues) => void;
	showWorkerManagement?: boolean;
	workerRequests?: WorkerVerificationRequest[];
	workerRequestsError?: boolean;
	workerRequestsLoading?: boolean;
	workerProfile?: WorkerProfileDetail | null;
	workerProfileError?: boolean;
	workerProfileLoading?: boolean;
	workerProfileOpen?: boolean;
	updatingWorkerRequestId?: string | null;
	onCloseWorkerProfile?: () => void;
	onVerifyWorker?: (requestId: string) => void;
	onRejectWorker?: (requestId: string) => void;
	onViewWorkerProfile?: (requestId: string) => void;
}

const statusClass: Record<UserManagementMember["status"], string> = {
	Active: "bg-green-50 text-green-700 border-green-200",
	Pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
	Inactive: "bg-gray-100 text-gray-700 border-gray-200",
};

/** Consumer mail domains that are never an organization account. */
const PERSONAL_EMAIL_DOMAINS = ["gmail.com"];

const isPersonalEmailDomain = (normalizedEmail: string) =>
	PERSONAL_EMAIL_DOMAINS.some((domain) =>
		normalizedEmail.endsWith(`@${domain}`),
	);

const UserManagementScreen = ({
	members = [],
	onInviteUser,
	showWorkerManagement = false,
	workerRequests = [],
	workerRequestsError = false,
	workerRequestsLoading = false,
	workerProfile = null,
	workerProfileError = false,
	workerProfileLoading = false,
	workerProfileOpen = false,
	updatingWorkerRequestId = null,
	onCloseWorkerProfile,
	onVerifyWorker,
	onRejectWorker,
	onViewWorkerProfile,
}: UserManagementScreenProps) => {
	const { t } = useTranslation();
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
	const strategicPartnerId = getStrategicPartnerId();
	const { role, isSupplier, supplierId } = getUserIdentifiers();
	const isSupplierRole = isSupplier || role === "org-supplier";
	const {
		data: supplierUsersResponse,
		isLoading: isSupplierUsersLoading,
		error: supplierUsersError,
	} = useSupplierUsers(supplierId ?? undefined, { enabled: isSupplierRole });
	const {
		data: partnerUsersResponse,
		isLoading: isPartnerUsersLoading,
		error: partnerUsersError,
	} = useStrategicPartnerUsers(undefined, { enabled: !isSupplierRole });
	const organizationUsersResponse = isSupplierRole
		? supplierUsersResponse
		: partnerUsersResponse;
	const isLoading = isSupplierRole
		? isSupplierUsersLoading
		: isPartnerUsersLoading;
	const error = isSupplierRole ? supplierUsersError : partnerUsersError;
	const { data: strategicPartner } =
		useStrategicPartnerById(strategicPartnerId);
	const globalPartnerName = strategicPartner?.name ?? "";

	const apiMembers = useMemo<UserManagementMember[]>(() => {
		const users = organizationUsersResponse?.data?.users ?? [];

		return users
			.filter(({ user }) => Number(user.is_staff) === 0)
			.map(({ user, user_id }) => {
				const fullName =
					`${user.first_name || ""} ${user.last_name || ""}`.trim();
				return {
					id: user_id,
					name: fullName || user.username || user.email,
					email: user.email,
					role: getRoleLabel(user.role),
					status: user.is_active === 1 ? "Active" : "Inactive",
					lastActive: user.last_active
						? moment(user.last_active).format("DD MMM YYYY, hh:mm A")
						: "-",
				};
			});
	}, [organizationUsersResponse?.data?.users, t]);

	const pendingInviteMembers = useMemo(
		() => members.filter((member) => member.status === "Pending"),
		[members],
	);

	const partnerNameWords = useMemo(
		() =>
			globalPartnerName
				? globalPartnerName.toLowerCase().split(/\s+/).filter(Boolean)
				: [],
		[globalPartnerName],
	);

	const displayedMembers = useMemo(() => {
		const seenEmails = new Set<string>();
		return [...pendingInviteMembers, ...apiMembers].filter((member) => {
			if (!member.email) return false;
			const normalizedEmail = member.email.toLowerCase();
			// Personal addresses are not organization accounts, so they never
			// belong in an organization's user list. Matched on the domain rather
			// than anywhere in the string, so "gmail.com@acme.co" still shows.
			if (isPersonalEmailDomain(normalizedEmail)) return false;
			if (seenEmails.has(normalizedEmail)) return false;
			seenEmails.add(normalizedEmail);
			// The supplier-users endpoint is already scoped to the signed-in
			// supplier, so its users are shown as-is. Only the strategic-partner
			// list is narrowed by partner name.
			if (isSupplierRole) return true;
			return (
				partnerNameWords.length > 0 &&
				partnerNameWords.some((word) => normalizedEmail.includes(word))
			);
		});
	}, [pendingInviteMembers, apiMembers, partnerNameWords, isSupplierRole]);

	const summary = useMemo(
		() => ({
			total: displayedMembers.length,
			active: displayedMembers.filter((member) => member.status === "Active")
				.length,
			pending: displayedMembers.filter((member) => member.status === "Pending")
				.length,
		}),
		[displayedMembers],
	);

	const workerSummary = useMemo(
		() => ({
			total: workerRequests.length,
			pending: workerRequests.filter(
				(request) =>
					request.status === "pending" || request.status === "saved_for_later",
			).length,
			verified: workerRequests.filter(
				(request) => request.status === "verified",
			).length,
		}),
		[workerRequests],
	);

	const workerStatusClass: Record<WorkerVerificationRequest["status"], string> =
		{
			pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
			saved_for_later: "bg-gray-100 text-gray-700 border-gray-200",
			verified: "bg-green-50 text-green-700 border-green-200",
			rejected: "bg-red-50 text-red-700 border-red-200",
		};

	const workerStatusLabel: Record<WorkerVerificationRequest["status"], string> =
		{
			pending: t("companyProfilePage.userManagement.workerStatus.pending"),
			saved_for_later: t(
				"companyProfilePage.userManagement.workerStatus.savedForLater",
			),
			verified: t("companyProfilePage.userManagement.workerStatus.verified"),
			rejected: t("companyProfilePage.userManagement.workerStatus.rejected"),
		};

	const userStatusLabel: Record<UserManagementMember["status"], string> = {
		Active: t("companyProfilePage.userManagement.active"),
		Pending: t("companyProfilePage.userManagement.pending"),
		Inactive: t("companyProfilePage.userManagement.inactive"),
	};

	const formatLastActive = (value: string) => {
		if (value === "Invitation sent") {
			return t("companyProfilePage.userManagement.invitationSent");
		}

		return value;
	};

	return (
		<div className="space-y-5">
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
				<div>
					<h2 className="heading-display">
						{t("companyProfilePage.userManagement.title")}
					</h2>
					<p className="text-sm text-gray-500">
						{t("companyProfilePage.userManagement.subtitle")}
					</p>
				</div>
				{/* <CascadeButton
					buttonText="Invite User"
					className="rounded-lg"
					handleOnClick={() => setIsInviteModalOpen(true)}
					size="2"
				/> */}
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
				<div
					className="rounded-md px-4 py-3"
					style={{ backgroundColor: statusColorPaletteShadow[1] }}
				>
					<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
						{t("companyProfilePage.userManagement.totalUsers")}
					</p>
					<p className="text-xl font-black text-gray-600">{summary.total}</p>
				</div>
				<div
					className="rounded-md px-4 py-3"
					style={{ backgroundColor: statusColorPaletteShadow[2] }}
				>
					<p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
						{t("companyProfilePage.userManagement.active")}
					</p>
					<p className="text-xl font-black text-teal-700">{summary.active}</p>
				</div>
				<div
					className="rounded-md px-4 py-3"
					style={{ backgroundColor: statusColorPaletteShadow[4] }}
				>
					<p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">
						{t("companyProfilePage.userManagement.pendingInvites")}
					</p>
					<p className="text-xl font-black text-yellow-700">
						{summary.pending}
					</p>
				</div>
			</div>
			<div className="bg-white rounded-md border border-gray-100 shadow-sm p-6">
				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">
								<th className="py-3 pr-4 font-semibold">
									{t("companyProfilePage.userManagement.columns.name")}
								</th>
								<th className="py-3 pr-4 font-semibold">
									{t("companyProfilePage.userManagement.columns.email")}
								</th>
								<th className="py-3 pr-4 font-semibold">
									{t("companyProfilePage.userManagement.columns.role")}
								</th>
								<th className="py-3 pr-4 font-semibold">
									{t("companyProfilePage.userManagement.columns.status")}
								</th>
								<th className="py-3 font-semibold">
									{t("companyProfilePage.userManagement.columns.lastActive")}
								</th>
							</tr>
						</thead>
						<tbody>
							{isLoading && (
								<tr>
									<td className="py-6 text-center text-gray-500" colSpan={5}>
										{t("companyProfilePage.userManagement.loadingUsers")}
									</td>
								</tr>
							)}
							{!isLoading && error && (
								<tr>
									<td className="py-6 text-center text-red-600" colSpan={5}>
										{t("companyProfilePage.userManagement.loadUsersError")}
									</td>
								</tr>
							)}
							{!isLoading && !error && displayedMembers.length === 0 && (
								<tr>
									<td className="py-6 text-center text-gray-500" colSpan={5}>
										{t("companyProfilePage.userManagement.emptyUsers")}
									</td>
								</tr>
							)}
							{!isLoading &&
								!error &&
								displayedMembers.map((member) => (
									<tr
										className="border-b border-gray-50 last:border-b-0"
										key={member.id}
									>
										<td className="py-3 pr-4 font-semibold text-gray-800">
											<div className="flex items-center gap-3">
												<div className="h-8 w-8 rounded-full bg-[#E8F4F7] text-[#004A60] text-xs font-bold flex items-center justify-center">
													{member.name
														.split(" ")
														.filter(Boolean)
														.slice(0, 2)
														.map((part) => part[0]?.toUpperCase())
														.join("") || "U"}
												</div>
												<span>{member.name}</span>
											</div>
										</td>
										<td className="py-3 pr-4 text-gray-600">{member.email}</td>
										<td className="py-3 pr-4 text-gray-700">{member.role}</td>
										<td className="py-3 pr-4">
											<span
												className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass[member.status]}`}
											>
												{userStatusLabel[member.status]}
											</span>
										</td>
										<td className="py-3 text-gray-500">
											{formatLastActive(member.lastActive)}
										</td>
									</tr>
								))}
						</tbody>
					</table>
				</div>
			</div>

			{showWorkerManagement && (
				<div className="bg-white rounded-md border border-gray-100 shadow-sm p-6">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
						<div>
							<h3 className="text-lg font-semibold text-gray-900">
								{t("companyProfilePage.userManagement.workerManagementTitle")}
							</h3>
							<p className="text-sm text-gray-500">
								{t(
									"companyProfilePage.userManagement.workerManagementSubtitle",
								)}
							</p>
						</div>
						<div className="flex items-center gap-2 text-xs">
							<span className="rounded-full border border-gray-200 px-2.5 py-1 text-gray-600">
								{t("companyProfilePage.userManagement.total")}:{" "}
								{workerSummary.total}
							</span>
							<span className="rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1 text-yellow-700">
								{t("companyProfilePage.userManagement.pending")}:{" "}
								{workerSummary.pending}
							</span>
							<span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-green-700">
								{t("companyProfilePage.userManagement.verified")}:{" "}
								{workerSummary.verified}
							</span>
						</div>
					</div>

					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead>
								<tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">
									<th className="py-3 pr-4 font-semibold">
										{t(
											"companyProfilePage.userManagement.workerColumns.worker",
										)}
									</th>
									<th className="py-3 pr-4 font-semibold">
										{t(
											"companyProfilePage.userManagement.workerColumns.workerId",
										)}
									</th>
									<th className="py-3 pr-4 font-semibold">
										{t(
											"companyProfilePage.userManagement.workerColumns.requested",
										)}
									</th>
									<th className="py-3 pr-4 font-semibold">
										{t(
											"companyProfilePage.userManagement.workerColumns.status",
										)}
									</th>
									<th className="py-3 font-semibold">
										{t(
											"companyProfilePage.userManagement.workerColumns.actions",
										)}
									</th>
								</tr>
							</thead>
							<tbody>
								{workerRequestsLoading && (
									<tr>
										<td className="py-6 text-center text-gray-500" colSpan={5}>
											{t(
												"companyProfilePage.userManagement.loadingWorkerRequests",
											)}
										</td>
									</tr>
								)}
								{!workerRequestsLoading && workerRequestsError && (
									<tr>
										<td className="py-6 text-center text-red-600" colSpan={5}>
											{t(
												"companyProfilePage.userManagement.loadWorkerRequestsError",
											)}
										</td>
									</tr>
								)}
								{!workerRequestsLoading &&
									!workerRequestsError &&
									workerRequests.length === 0 && (
										<tr>
											<td
												className="py-6 text-center text-gray-500"
												colSpan={5}
											>
												{t(
													"companyProfilePage.userManagement.emptyWorkerRequests",
												)}
											</td>
										</tr>
									)}
								{!workerRequestsLoading &&
									!workerRequestsError &&
									workerRequests.map((request) => {
										const canVerify =
											request.status === "pending" ||
											request.status === "saved_for_later" ||
											request.status === "rejected";
										const canReject =
											request.status === "pending" ||
											request.status === "saved_for_later" ||
											request.status === "verified";
										const isUpdating = updatingWorkerRequestId === request.id;
										return (
											<tr
												className="border-b border-gray-50 last:border-b-0"
												key={request.id}
											>
												<td className="py-3 pr-4">
													<div className="font-semibold text-gray-800">
														{request.workerName ||
															t(
																"companyProfilePage.userManagement.unknownWorker",
															)}
													</div>
													<div className="text-xs text-gray-500">
														{request.workerEmail ||
															t("companyProfilePage.userManagement.noEmail")}
													</div>
												</td>
												<td className="py-3 pr-4 text-gray-600">
													{request.workerId}
												</td>
												<td className="py-3 pr-4 text-gray-500">
													{new Date(request.requestedAt).toLocaleString()}
												</td>
												<td className="py-3 pr-4">
													<span
														className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${workerStatusClass[request.status]}`}
													>
														{workerStatusLabel[request.status]}
													</span>
												</td>
												<td className="py-3">
													<div className="flex flex-wrap items-center gap-2">
														<button
															className="rounded-lg border border-[#148696] px-3 py-1.5 text-xs font-semibold text-[#004A60] transition-colors hover:bg-[#148696]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
															onClick={() => onViewWorkerProfile?.(request.id)}
															type="button"
														>
															{t(
																"companyProfilePage.userManagement.viewProfile",
															)}
														</button>
														{canVerify && (
															<button
																className="rounded-lg bg-[#148696] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#004A60] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] disabled:cursor-not-allowed disabled:opacity-60"
																disabled={isUpdating}
																onClick={() => onVerifyWorker?.(request.id)}
																type="button"
															>
																{isUpdating
																	? t(
																			"companyProfilePage.userManagement.updating",
																		)
																	: t(
																			"companyProfilePage.userManagement.verify",
																		)}
															</button>
														)}
														{canReject && (
															<button
																className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] disabled:cursor-not-allowed disabled:opacity-60"
																disabled={isUpdating}
																onClick={() => onRejectWorker?.(request.id)}
																type="button"
															>
																{isUpdating
																	? t(
																			"companyProfilePage.userManagement.updating",
																		)
																	: request.status === "verified"
																		? t(
																				"companyProfilePage.userManagement.unverify",
																			)
																		: t(
																				"companyProfilePage.userManagement.reject",
																			)}
															</button>
														)}
													</div>
												</td>
											</tr>
										);
									})}
							</tbody>
						</table>
					</div>
				</div>
			)}
			<InviteUserModal
				onClose={() => setIsInviteModalOpen(false)}
				onInvite={onInviteUser}
				open={isInviteModalOpen}
			/>
			{showWorkerManagement && (
				<WorkerProfileModal
					error={workerProfileError}
					isLoading={workerProfileLoading}
					onClose={onCloseWorkerProfile ?? (() => {})}
					open={workerProfileOpen}
					worker={workerProfile}
				/>
			)}
		</div>
	);
};

export type { UserManagementMember };
export default UserManagementScreen;
