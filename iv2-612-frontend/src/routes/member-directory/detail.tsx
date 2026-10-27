import { Card, Container, Flex } from "@radix-ui/themes";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import GlobalBuyerDetailView from "$src/components/member-directory/GlobalBuyerDetailView";
import MemberDirectoryStandardDetail from "$src/components/member-directory/MemberDirectoryStandardDetail";
import LoadingSpinner from "$src/components/ui/LoadingSpinner";

import { useGlobalBuyerDetail } from "$src/hooks/useGlobalBuyers";
import { useCities, useCountries, useStates } from "$src/hooks/useLocalization";
import { usePoliciesByOwner } from "$src/hooks/usePolicies";
import { useRecruitmentAgenciesDetail } from "$src/hooks/useRecruitmentAgencies";
import { useSupplierDetail } from "$src/hooks/useSuppliers";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import useAuthData from "$src/store/store.auth";
import useMemberdirectory from "$src/store/store.memberdirectory";
import { useViewModeStore } from "$src/store/viewModeStore";
import {
	canViewGlobalBuyerDetailsForRole,
	filterLegacyEntries,
	getCompanyLocation,
	getPolicyApiEntries,
	getPolicyEntries,
	isGlobalBuyer,
	MEMBER_TYPES,
} from "$src/utils/memberDirectory";

// Define the search params type
interface MemberDetailSearch {
	id: string;
	type?: string;
}

const getLocationRecordValue = (
	record: Record<string, unknown>,
	fields: string[],
) => {
	for (const field of fields) {
		const value = record[field];
		if (value !== null && value !== undefined && value !== "") return value;
	}
	return null;
};

const findLocationName = (
	items: unknown[],
	value: unknown,
	idFields: string[],
) => {
	if (value === null || value === undefined || value === "") return "";
	const key = String(value);

	if (typeof value === "string" && Number.isNaN(Number(value))) {
		return value.trim();
	}

	for (const item of items) {
		if (!item || typeof item !== "object") continue;

		const record = item as Record<string, unknown>;
		const isMatch = idFields.some((field) => String(record[field]) === key);
		if (!isMatch) continue;

		const name = getLocationRecordValue(record, ["name", "name_en", "label"]);
		return typeof name === "string" ? name.trim() : "";
	}

	return "";
};

export const Route = createFileRoute("/member-directory/detail")({
	validateSearch: (search: Record<string, unknown>): MemberDetailSearch => {
		return {
			id: search.id as string,
			type: search.type as string,
		};
	},
	component: MemberDetailComponent,
});

function MemberDetailComponent() {
	const { id, type } = Route.useSearch();
	const { t } = useTranslation();
	const storedRole = useAuthData((state) => state.role);
	const authRole = authStatus().role;
	const activeViewMode = useViewModeStore((state) => state.viewMode);
	const canViewGlobalBuyerDetails = canViewGlobalBuyerDetailsForRole(
		storedRole ?? authRole,
		activeViewMode,
	);

	// Conditionally fetch data based on type
	const isRecruitmentAgency = type === "Recruitment Agency" || !type;
	const isSupplier = type === "Supplier";
	const isGlobalBuyerType = isGlobalBuyer(type);
	const memberTypeLabel = isRecruitmentAgency
		? t("memberDirectoryDetail.types.recruitmentAgency")
		: isSupplier
			? t("memberDirectoryDetail.types.supplier")
			: isGlobalBuyerType
				? t("memberDirectoryDetail.types.globalBuyer")
				: t("memberDirectoryDetail.types.member");

	const { data: recruitmentAgenciesDetail, isLoading: isLoadingRA } =
		useRecruitmentAgenciesDetail(isRecruitmentAgency ? Number(id) : 0);
	const { data: supplierDetail, isLoading: isLoadingSupplier } =
		useSupplierDetail(isSupplier ? Number(id) : 0);
	const { data: globalBuyerDetail, isLoading: isLoadingGlobalBuyer } =
		useGlobalBuyerDetail(
			isGlobalBuyerType && canViewGlobalBuyerDetails ? Number(id) : 0,
		);
	const { data: profilePolicies = [] } = usePoliciesByOwner(
		{
			kind: "strategic-partner",
			id: isGlobalBuyerType && canViewGlobalBuyerDetails ? Number(id) : null,
		},
		{
			mockMode: "never",
		},
	);

	const [company, setCompany] = useState<any>(null);
	const { updateBannerImg } = useMemberdirectory();

	const { data: countries = [] } = useCountries();
	const { data: states = [] } = useStates();
	const { data: cities = [] } = useCities();

	// Update company data based on type and fetched data
	useEffect(() => {
		if (isRecruitmentAgency && recruitmentAgenciesDetail) {
			setCompany({
				...recruitmentAgenciesDetail,
				type: "Recruitment Agency",
			});
			updateBannerImg("");
		} else if (isSupplier && supplierDetail) {
			setCompany({
				...supplierDetail,
				type: "Supplier",
			});
			updateBannerImg("");
		} else if (isGlobalBuyerType && globalBuyerDetail) {
			setCompany({
				...globalBuyerDetail,
				type: MEMBER_TYPES.globalBuyer,
			});
			updateBannerImg("");
		}
	}, [
		recruitmentAgenciesDetail,
		supplierDetail,
		globalBuyerDetail,
		isRecruitmentAgency,
		isSupplier,
		isGlobalBuyerType,
		updateBannerImg,
	]);

	const isLoading =
		(isRecruitmentAgency && isLoadingRA) ||
		(isSupplier && isLoadingSupplier) ||
		(isGlobalBuyerType && isLoadingGlobalBuyer);

	if (isGlobalBuyerType && !canViewGlobalBuyerDetails) {
		return (
			<GuestLayout>
				<Container className="mt-10">
					<Card className="p-6">
						<h1 className="text-2xl font-bold">
							{t("memberDirectoryDetail.unavailable.title")}
						</h1>
						<p className="mt-2 text-sm text-gray-600">
							{t("memberDirectoryDetail.unavailable.body")}
						</p>
					</Card>
				</Container>
			</GuestLayout>
		);
	}

	if (isLoading || !company) {
		return (
			<GuestLayout>
				<Container>
					<div className="text-center py-20">
						<LoadingSpinner
							subtitle={t("memberDirectoryDetail.loading.subtitle", {
								type: memberTypeLabel.toLowerCase(),
							})}
							title={t("memberDirectoryDetail.loading.title")}
						/>
					</div>
					<Flex align={"center"} justify={"center"}>
						<button
							className="inline-flex justify-center items-center px-3 py-2 text-sm font-medium text-white bg-[#148696] rounded-md hover:bg-[#0f6b78] cursor-pointer transition-colors no-underline"
							onClick={() => window.location.reload()}
						>
							{t("memberDirectoryDetail.actions.reload")}
						</button>
					</Flex>
				</Container>
			</GuestLayout>
		);
	}

	const addr = company?.addresses?.[0] ?? company?.address;
	const countryName = findLocationName(
		countries,
		addr?.country_id ?? company?.country_id ?? company?.country,
		["country", "id", "country_id"],
	);
	const stateName = states.find((s) => s.state === addr?.state_id)?.name;
	const cityName = findLocationName(
		cities,
		addr?.city_id ?? company?.city_id ?? company?.city,
		["city", "id", "city_id"],
	);
	const resolvedAddress =
		getCompanyLocation(company, { cityName, stateName, countryName }) ||
		[addr?.street, cityName, stateName, countryName].filter(Boolean).join(", ");
	const formattedAddress =
		resolvedAddress || t("memberDirectoryDetail.common.notAvailable");
	const companyTypeLabel =
		company.type === "Recruitment Agency"
			? t("memberDirectoryDetail.types.recruitmentAgency")
			: company.type === "Supplier"
				? t("memberDirectoryDetail.types.supplier")
				: isGlobalBuyer(company.type)
					? t("memberDirectoryDetail.types.globalBuyer")
					: company.type;
	const statusLabel = company.status
		? t(`memberDirectoryDetail.statuses.${company.status}`, {
				defaultValue: company.status,
			})
		: t("memberDirectoryDetail.common.notAvailable");
	// API policy entries are the primary source of truth: show ALL of them,
	// including entries that share the same underlying file URL (two distinct
	// policies may legitimately reference the same document).
	// Legacy SharedFile entries (from the old SP detail API) are only shown
	// when they are not already covered by any API policy entry.
	const apiPolicyEntries = getPolicyApiEntries(profilePolicies);
	const policyEntries = [
		...apiPolicyEntries,
		...filterLegacyEntries(getPolicyEntries(company), apiPolicyEntries),
	];

	if (!isGlobalBuyer(company.type)) {
		return (
			<GuestLayout>
				<MemberDirectoryStandardDetail
					company={company}
					companyTypeLabel={companyTypeLabel}
					countries={countries}
					formattedAddress={formattedAddress}
					statusLabel={statusLabel}
				/>
			</GuestLayout>
		);
	}

	return (
		<GuestLayout>
			<GlobalBuyerDetailView
				company={company}
				companyTypeLabel={companyTypeLabel}
				formattedAddress={
					resolvedAddress ||
					t("memberDirectoryDetail.globalBuyer.hqLocation", {
						defaultValue: "HQ Location",
					})
				}
				policyEntries={policyEntries}
				statusLabel={statusLabel}
			/>
		</GuestLayout>
	);
}
