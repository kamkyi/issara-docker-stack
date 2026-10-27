import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import ProfileAvatarStrengthCard from "$src/components/company-profile/ProfileAvatarStrengthCard";
import OrganizationBasicInformationSection, {
	type OrganizationProfileFormValues,
} from "$src/components/organization-profile/OrganizationBasicInformationSection";
import OrganizationImagesSection from "$src/components/organization-profile/OrganizationImagesSection";
import { showToast } from "$src/components/toast/toastUtil";
import PageContainer from "$src/components/ui/PageContainer";
import PageHeader from "$src/components/ui/PageHeader";
import { useCascadeCountries } from "$src/hooks/useCommonData";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import {
	getProfileStrength,
	type OrganizationProfile,
	type OrganizationProfileUpdate,
	useOrganizationProfile,
	useOrganizationProfileOptions,
	useUpdateOrganizationProfile,
	useUploadOrganizationLogo,
} from "$src/queries/organizationProfile";
import { requireCsoAuth } from "$src/utils/auth";
import { getAuthUser } from "$src/utils/auth-utils";

export const Route = createFileRoute("/organization-profile")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireCsoAuth({ isAuthenticated, role });
	},
	component: RouteComponent,
});

const EMPTY_FORM: OrganizationProfileFormValues = {
	name: "",
	description: "",
	website: "",
	organization_type: "",
	countries_of_registration: [],
	countries_of_operation: [],
	languages_supported: [],
	core_focus_areas: [],
	stakeholder_groups: [],
	nace_codes: [],
};

const toFormValues = (
	profile: OrganizationProfile,
): OrganizationProfileFormValues => ({
	name: profile.name ?? "",
	description: profile.description ?? "",
	website: profile.website ?? "",
	organization_type: profile.organization_type ?? "",
	countries_of_registration: (profile.countries_of_registration ?? []).map(
		String,
	),
	countries_of_operation: (profile.countries_of_operation ?? []).map(String),
	languages_supported: profile.languages_supported ?? [],
	core_focus_areas: profile.core_focus_areas ?? [],
	stakeholder_groups: profile.stakeholder_groups ?? [],
	nace_codes: profile.nace_codes ?? [],
});

const toPayload = (
	values: OrganizationProfileFormValues,
): OrganizationProfileUpdate => ({
	name: values.name.trim(),
	description: values.description.trim() || null,
	website: values.website.trim() || null,
	organization_type: values.organization_type || null,
	countries_of_registration: values.countries_of_registration.map(Number),
	countries_of_operation: values.countries_of_operation.map(Number),
	languages_supported: values.languages_supported,
	core_focus_areas: values.core_focus_areas,
	stakeholder_groups: values.stakeholder_groups,
	// Organization profiles intentionally store only broad NACE sections.
	nace_codes: values.nace_codes.filter((code) => /^[A-V]$/.test(code)),
});

interface CountryOption {
	id: number;
	name: string;
}

// CSO UI v1 — CSOs previously shared /company-profile with suppliers; they now
// get their own page, since the organization they manage is not a "company".
function RouteComponent() {
	const { t } = useTranslation();

	const { data: profile, isLoading, isError } = useOrganizationProfile();
	const { data: options } = useOrganizationProfileOptions();
	const { data: countriesData } = useCascadeCountries();
	const updateProfile = useUpdateOrganizationProfile();
	const uploadLogo = useUploadOrganizationLogo();

	const [editing, setEditing] = useState(false);
	const [values, setValues] =
		useState<OrganizationProfileFormValues>(EMPTY_FORM);

	// Reset the form whenever a fresh profile arrives, but never mid-edit —
	// a background refetch must not discard what the user is typing.
	useEffect(() => {
		if (profile && !editing) {
			setValues(toFormValues(profile));
		}
	}, [profile, editing]);

	const countries = useMemo(() => {
		const rows: CountryOption[] = countriesData?.results ?? countriesData ?? [];
		if (!Array.isArray(rows)) return [];
		return rows.map((country) => ({
			value: String(country.id),
			label: country.name,
		}));
	}, [countriesData]);

	const authUser = getAuthUser();
	const ownerName =
		[authUser?.firstName, authUser?.lastName].filter(Boolean).join(" ") ||
		authUser?.username ||
		"";

	const handleSave = async () => {
		if (
			!values.name.trim() ||
			!values.organization_type ||
			!values.nace_codes.some((code) => /^[A-V]$/.test(code))
		) {
			showToast.error(
				t("organizationProfilePage.requiredFields", {
					defaultValue:
						"Organization name, organization type, and NACE Tier 1 are required.",
				}),
			);
			return;
		}
		try {
			await updateProfile.mutateAsync(toPayload(values));
			setEditing(false);
			showToast.success(t("organizationProfilePage.saved"));
		} catch {
			showToast.error(t("organizationProfilePage.saveFailed"));
		}
	};

	const handleCancel = () => {
		setValues(profile ? toFormValues(profile) : EMPTY_FORM);
		setEditing(false);
	};

	const handleLogoChange = async (file: File) => {
		try {
			await uploadLogo.mutateAsync(file);
			showToast.success(
				t("organizationProfilePage.logoUpdated", {
					defaultValue: "Profile photo updated.",
				}),
			);
		} catch {
			showToast.error(
				t("organizationProfilePage.logoUpdateFailed", {
					defaultValue: "Failed to upload profile photo.",
				}),
			);
		}
	};

	return (
		<GuestLayout>
			<PageContainer>
				<PageHeader
					subtitle={t("organizationProfilePage.subtitle")}
					title={
						profile?.name
							? t("organizationProfilePage.titleWithName", {
									name: profile.name,
								})
							: t("organizationProfilePage.title")
					}
				/>

				{isError ? (
					<p className="text-sm text-body">
						{t("organizationProfilePage.noOrganization")}
					</p>
				) : (
					<>
						<ProfileAvatarStrengthCard
							avatarImage={profile?.logo}
							companyName={profile?.name ?? ""}
							isUploadingAvatar={uploadLogo.isPending}
							onAvatarChange={handleLogoChange}
							profileOwnerEmail={authUser?.email ?? ""}
							profileOwnerName={ownerName}
							profileStrength={getProfileStrength(profile)}
						/>

						<OrganizationBasicInformationSection
							countries={countries}
							editing={editing}
							isSaving={isLoading || updateProfile.isPending}
							onCancel={handleCancel}
							onChange={setValues}
							onEdit={() => setEditing(true)}
							onSave={handleSave}
							options={options}
							values={values}
						/>
						<OrganizationImagesSection />
					</>
				)}
			</PageContainer>
		</GuestLayout>
	);
}
