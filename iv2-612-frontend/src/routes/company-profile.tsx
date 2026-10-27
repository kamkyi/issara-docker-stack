import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { api } from "$src/api/axios";
import BusinessImagesSection, {
	type BusinessImageNotificationChange,
} from "$src/components/company-profile/BusinessImagesSection";
import CompanyProfileBasicInformationSection from "$src/components/company-profile/CompanyProfileBasicInformationSection";
import CompanyProfilePageHeader from "$src/components/company-profile/CompanyProfilePageHeader";
import CompanyProfileTabs, {
	type CompanyProfileTab,
} from "$src/components/company-profile/CompanyProfileTabs";
import CompanyWorkerVerificationQrPanel from "$src/components/company-profile/CompanyWorkerVerificationQrPanel";
import {
	buildNationalityBreakdownPayload,
	COMPANY_PROFILE_ACTIVE_TAB_KEY,
	createEmptyNationalityBreakdownValues,
	createEmptyNationalityGenderBreakdownValues,
	findPolicyCompliance,
	getArrayPayload,
	getFirstStringValue,
	getNationalityGenderKeys,
	getStoredCompanyProfileTab,
	getStringValue,
	getUniqueNumericIds,
	isCompanyProfileTab,
	NATIONALITY_BREAKDOWN_FIELDS,
	type NationalityBreakdownFieldKey,
	type NationalityBreakdownValues,
	type NationalityGenderBreakdownValues,
	type NationalityTotalFieldKey,
	normalizeGroups,
	POLICY_CONFIG,
	resolveAvatarImageUrl,
	toNumberOrZero,
} from "$src/components/company-profile/companyProfileUtils";
import type { InviteUserFormValues } from "$src/components/company-profile/InviteUserModal";
import ProfileAvatarStrengthCard from "$src/components/company-profile/ProfileAvatarStrengthCard";
import PoliciesComplianceSection from "$src/components/company-profile/policies/PoliciesComplianceSection";
import RaBasicInformationSection, {
	type RaBasicInformationValues,
} from "$src/components/company-profile/RaBasicInformationSection";
import RaContactInformationSection, {
	type RaContactInformationValues,
} from "$src/components/company-profile/RaContactInformationSection";
import UserManagementScreen, {
	type UserManagementMember,
} from "$src/components/company-profile/UserManagementScreen";
import WorkforceBreakdownSection from "$src/components/company-profile/WorkforceBreakdownSection";
import { showToast } from "$src/components/toast/toastUtil";
import PageContainer from "$src/components/ui/PageContainer";
import {
	useCascadeCountries,
	useCascadeIndustries,
	useCascadeProductCategories,
	useCountries,
} from "$src/hooks/useCommonData";
import { useUpdateGdUserAvatar } from "$src/hooks/useGdUser";
import { useGDIndustries, useGDSubIndustries } from "$src/hooks/useIndustries";
import {
	type RecruitmentAgencyBasicInformation,
	type RecruitmentAgencyBasicInformationUpdatePayload,
	type RecruitmentAgencyContactInformation,
	type RecruitmentAgencyContactInformationUpdatePayload,
	useRecruitmentAgencyBasicInformation,
	useRecruitmentAgencyContactInformation,
	useUpdateRecruitmentAgencyBasicInformation,
	useUpdateRecruitmentAgencyContactInformation,
} from "$src/hooks/useRecruitmentAgencyProfile";
import {
	useStrategicPartnerById,
	useUpdateStrategicPartner,
} from "$src/hooks/useStrategicPartner";
import { useTranslation } from "$src/hooks/useTranslation";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { useLksgRiskSettings } from "$src/queries/useLksgRiskSettings";
import { useSupplierFullDetail } from "$src/queries/useSupplierFullDetail";
import {
	extractCompanyProfileImageUrl,
	fetchCompanyProfileImageUrl,
	getSignedUrlRefreshDelayMs,
	toPersistableImageValue,
	uploadCompanyProfileImage,
} from "$src/services/companyProfileImageService";
import { useLksgRiskStore } from "$src/store/lksgRiskStore";
import useAuthData from "$src/store/store.auth";
import { useViewModeStore } from "$src/store/viewModeStore";
import type { AuthUser, MergedMainUser } from "$src/types";
import { isSupplier as isSupplierRole } from "$src/utils/account";
import { parseStoredJson } from "$src/utils/auth-utils";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";
import {
	emitNotifications,
	ISSARA_STAFF_RECIPIENT,
} from "$src/utils/notificationEmit";
import {
	buildWorkerVerificationQrTargetUrl,
	buildWorkerVerificationTargetToken,
	fetchWorkerVerificationRequests,
	fetchWorkerVerificationWorkerProfile,
	canShowWorkerVerificationQr as getCanShowWorkerVerificationQr,
	updateWorkerVerificationRequestStatus,
	type WorkerVerificationProfileResponse,
	type WorkerVerificationRequest,
} from "$src/utils/workerVerification";

export const Route = createFileRoute("/company-profile")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireCsoOrSupplierAuth({ isAuthenticated, role });
	},
	component: RouteComponent,
});

import { authStatus } from "$src/queries/auth";
import { requireCsoOrSupplierAuth } from "$src/utils/auth";

// ─── Main Page ─────────────────────────────────────────────────────────────────

const WORKFORCE_TOTAL_KEY = "total_num_workers";
const WORKFORCE_MALE_KEY = "total_num_men_workers";
const WORKFORCE_FEMALE_KEY = "total_num_women_workers";
const WORKFORCE_SUMMARY_KEYS = [
	WORKFORCE_TOTAL_KEY,
	WORKFORCE_MALE_KEY,
	WORKFORCE_FEMALE_KEY,
] as const;

const hasCountValue = (value: string | undefined) =>
	(value ?? "").trim() !== "";

const parseCountValue = (value: string | undefined) => {
	const parsedValue = Number((value ?? "").trim());
	return Number.isFinite(parsedValue) ? parsedValue : null;
};

const formatCalculatedCount = (value: number) =>
	Number.isFinite(value) && value >= 0 ? String(value) : "";

const RA_AVATAR_S3_BASE_URL =
	"https://golden-dreams-staging-public.s3.amazonaws.com/media/";

const buildRaAvatarUrl = (avatarPath: string): string => {
	if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) {
		return avatarPath;
	}
	return `${RA_AVATAR_S3_BASE_URL}${avatarPath.replace(/^\/+/, "")}`;
};

const DEFAULT_RA_BASIC_VALUES: RaBasicInformationValues = {
	companyName: "",
	companyDescription: "",
	dateOfRegistration: null,
	country: "",
	licenseNumber: "",
	licenseValidDate: null,
	thaiLicenseNumber: "",
	thaiLicenseValidDate: null,
	cambodiaRecruiterRegistrationYear: "",
	latitude: "",
	longitude: "",
	status: "",
	statusFromDate: null,
	statusToDate: null,
	sendingCountries: [],
	industries: [],
	subIndustries: [],
};

const DEFAULT_RA_CONTACT_VALUES: RaContactInformationValues = {
	mainContactName: "",
	contactPhoneNumber: "",
	email: "",
	website: "",
	phoneNumbers: "",
	facebook: "",
	viber: "",
	line: "",
	zalo: "",
};

// Shown when the RA basic/contact-information API has no data yet (new
// account, GD profile not linked, or the request errored) so the page still
// reads as a real profile instead of a blank form.
const MOCK_RA_BASIC_VALUES: RaBasicInformationValues = {
	companyName: "Golden Pathway Recruitment Co., Ltd.",
	companyDescription:
		"A licensed recruitment agency connecting migrant workers with verified employers across the region.",
	dateOfRegistration: "2018-04-12",
	country: "Myanmar",
	licenseNumber: "MLS-2023-014",
	licenseValidDate: "2026-04-12",
	thaiLicenseNumber: "",
	thaiLicenseValidDate: null,
	cambodiaRecruiterRegistrationYear: "",
	latitude: "16.8661",
	longitude: "96.1951",
	status: "Operational",
	statusFromDate: null,
	statusToDate: null,
	sendingCountries: ["Thailand", "Malaysia"],
	industries: [],
	subIndustries: [],
};

const MOCK_RA_CONTACT_VALUES: RaContactInformationValues = {
	mainContactName: "Aye Chan Moe",
	contactPhoneNumber: "+95 9 123 456 789",
	email: "info@goldenpathway-example.com",
	website: "https://goldenpathway-example.com",
	phoneNumbers: "+95 9 123 456 789, +95 1 234 5678",
	facebook: "https://facebook.com/goldenpathwayexample",
	viber: "+95 9 123 456 789",
	line: "@goldenpathway",
	zalo: "",
};

function mapBasicInformationToFormValues(
	data: RecruitmentAgencyBasicInformation | undefined,
): RaBasicInformationValues {
	if (!data) return DEFAULT_RA_BASIC_VALUES;
	return {
		companyName: data.company_name ?? "",
		companyDescription: data.company_description ?? "",
		dateOfRegistration: data.date_of_registration,
		country: data.country ?? "",
		licenseNumber: data.license_number ?? "",
		licenseValidDate: data.license_valid_date,
		thaiLicenseNumber: data.thai_license_number ?? "",
		thaiLicenseValidDate: data.thai_license_valid_date,
		cambodiaRecruiterRegistrationYear:
			data.cambodia_recruiter_registration_year != null
				? String(data.cambodia_recruiter_registration_year)
				: "",
		latitude: data.latitude != null ? String(data.latitude) : "",
		longitude: data.longitude != null ? String(data.longitude) : "",
		status: data.status ?? "",
		statusFromDate: data.status_from_date,
		statusToDate: data.status_to_date,
		sendingCountries: data.sending_countries ?? [],
		industries: data.industries ?? [],
		subIndustries: data.sub_industries ?? [],
	};
}

function mapFormValuesToBasicInformationPayload(
	values: RaBasicInformationValues,
): RecruitmentAgencyBasicInformationUpdatePayload {
	return {
		company_name: values.companyName,
		company_description: values.companyDescription,
		date_of_registration: values.dateOfRegistration,
		country: values.country || undefined,
		license_number: values.licenseNumber,
		license_valid_date: values.licenseValidDate,
		thai_license_number: values.thaiLicenseNumber,
		thai_license_valid_date: values.thaiLicenseValidDate,
		cambodia_recruiter_registration_year:
			values.cambodiaRecruiterRegistrationYear
				? Number(values.cambodiaRecruiterRegistrationYear)
				: null,
		latitude: values.latitude ? Number(values.latitude) : null,
		longitude: values.longitude ? Number(values.longitude) : null,
		status: values.status || undefined,
		status_from_date: values.statusFromDate,
		status_to_date: values.statusToDate,
		sending_countries: values.sendingCountries,
		industries: values.industries,
		sub_industries: values.subIndustries,
	};
}

function mapContactInformationToFormValues(
	data: RecruitmentAgencyContactInformation | undefined,
): RaContactInformationValues {
	if (!data) return DEFAULT_RA_CONTACT_VALUES;
	return {
		mainContactName: data.main_contact_name ?? "",
		contactPhoneNumber: data.contact_phone_number ?? "",
		email: data.email ?? "",
		website: data.website ?? "",
		phoneNumbers: data.phone_numbers ?? "",
		facebook: data.facebook ?? "",
		viber: data.viber ?? "",
		line: data.line ?? "",
		zalo: data.zalo ?? "",
	};
}

function mapFormValuesToContactInformationPayload(
	values: RaContactInformationValues,
): RecruitmentAgencyContactInformationUpdatePayload {
	return {
		main_contact_name: values.mainContactName,
		contact_phone_number: values.contactPhoneNumber,
		email: values.email,
		website: values.website,
		phone_numbers: values.phoneNumbers,
		facebook: values.facebook,
		viber: values.viber,
		line: values.line,
		zalo: values.zalo,
	};
}

const getSumOfNationalities = (
	breakdown: Record<string, string>,
	genderBreakdown: Record<string, string>,
) => {
	let total = 0;
	let male = 0;
	let female = 0;

	for (const field of NATIONALITY_BREAKDOWN_FIELDS) {
		if (
			field.key === "total_num_workers" ||
			field.key === "total_num_men_workers" ||
			field.key === "total_num_women_workers"
		) {
			continue;
		}

		const directTotal = toNumberOrZero(breakdown[field.key]);
		const genderKeys = getNationalityGenderKeys(
			field.key as NationalityTotalFieldKey,
		);
		const maleCount = toNumberOrZero(genderBreakdown[genderKeys.menKey]);
		const femaleCount = toNumberOrZero(genderBreakdown[genderKeys.womenKey]);

		const derivedTotal = maleCount + femaleCount;
		const nationalityTotal = directTotal > 0 ? directTotal : derivedTotal;

		total += nationalityTotal;
		male += maleCount;
		female += femaleCount;
	}

	return { total, male, female };
};

function RouteComponent() {
	const { t } = useTranslation();
	const viewMode = useViewModeStore((state) => state.viewMode);
	const {
		role,
		isSupplier: isSupplierRoleContext,
		supplierId: loggedInSupplierId,
		partnerId: loggedInPartnerId,
	} = getUserIdentifiers();
	const isSupplierContext =
		isSupplierRoleContext || viewMode === "supplier-view";
	const isStrategicPartnerContext = !isSupplierContext;
	const isRaContext =
		viewMode === "ra-view" || role === "org-recruitment-agency";
	const raAuthUser = parseStoredJson<AuthUser>("auth_user");
	const raGdUserIdRaw = raAuthUser?.links?.gd?.userId;
	const raGdUserId = raGdUserIdRaw != null ? Number(raGdUserIdRaw) : null;
	const [activeTab, setActiveTab] = useState<CompanyProfileTab>(
		getStoredCompanyProfileTab,
	);
	const updateStrategicPartner = useUpdateStrategicPartner();
	// LkSG human-rights-officer fields live on the same cascade-api endpoint as the
	// other LkSG risk settings, so they read/write through the shared store.
	const { updateSettings: updateLksgRiskSettings } =
		useLksgRiskSettings(loggedInPartnerId);
	const {
		humanRightsOfficerConfirmed,
		humanRightsOfficerName,
		setHumanRightsOfficerConfirmed,
		setHumanRightsOfficerName,
		commitFields: commitLksgRiskFields,
		resetFields: resetLksgRiskFields,
	} = useLksgRiskStore();

	const HR_OFFICER_FIELDS = [
		"humanRightsOfficerConfirmed",
		"humanRightsOfficerName",
	] as const;
	const [isSupplierSavingProfile, setIsSupplierSavingProfile] = useState(false);
	const isSavingProfile =
		updateStrategicPartner.isPending || isSupplierSavingProfile;

	useEffect(() => {
		try {
			window.localStorage.setItem(COMPANY_PROFILE_ACTIVE_TAB_KEY, activeTab);
		} catch {
			// Ignore storage failures so the page remains usable in restricted modes.
		}
	}, [activeTab]);
	// ── Countries data for HQ Location (single) ────────────────────────────────
	const { data: countriesData = [] } = useCascadeCountries();
	const countries = useMemo(
		() => getArrayPayload<{ id: number | string; name: string }>(countriesData),
		[countriesData],
	);
	const countryOptions = useMemo(
		() =>
			countries?.map((c) => ({
				value: String(c.id),
				label: c.name,
			})),
		[countries],
	);

	// ── Countries data for Sourcing Countries (multi) ─────────────────────────
	const { data: cascadeCountriesData = [] } = useCascadeCountries();
	const cascadeCountries = useMemo(
		() =>
			getArrayPayload<{ id: number | string; name: string }>(
				cascadeCountriesData,
			),
		[cascadeCountriesData],
	);
	const multiCountryItems = useMemo(
		() =>
			cascadeCountries?.map((c) => ({
				id: Number(c.id),
				name: c.name,
			})),
		[cascadeCountries],
	);

	// ── Industries (multi) ────────────────────────────────────────────────────
	const { data: cascadeIndustriesData = [] } = useCascadeIndustries();

	const cascadeIndustries = useMemo(
		() =>
			getArrayPayload<{ id: number | string; name: string }>(
				cascadeIndustriesData?.data?.industries,
			),
		[cascadeIndustriesData],
	);
	const industryItems = useMemo(
		() =>
			cascadeIndustries?.map((ind) => ({
				id: Number(ind.id),
				name: ind.name,
			})),
		[cascadeIndustries],
	);

	// ── RA basic information support data (country + sub-industries) ──────────
	// Uses GD's own country list so names match GD's `localization_country`
	// table exactly, since the RA basic-information API resolves country and
	// sending_countries by name against that table.
	const { data: gdCountriesData = [] } = useCountries();
	const raCountryOptions = useMemo(
		() =>
			(gdCountriesData as { id: number; name: string }[])?.map((c) => ({
				id: String(c.id),
				name: c.name,
			})) ?? [],
		[gdCountriesData],
	);
	// RA industries/sub-industries come from GD's own catalog (not cascade's),
	// matching the GD-backed country/sending-countries data above.
	const { data: gdIndustriesData = [] } = useGDIndustries();
	const raIndustryItems = useMemo(
		() =>
			(gdIndustriesData ?? []).map((item) => ({
				id: item.industry,
				name: item.name,
			})),
		[gdIndustriesData],
	);
	const { data: gdSubIndustriesData = [] } = useGDSubIndustries();
	const raSubIndustryItems = useMemo(
		() =>
			(gdSubIndustriesData ?? []).map((item) => ({
				id: item.id,
				name: item.name,
				industry: item.industry_id,
			})),
		[gdSubIndustriesData],
	);

	// Static product categories (no API endpoint yet)
	const { data: cascadeProductCategoriesData = [] } =
		useCascadeProductCategories();
	const cascadeProductCategories = useMemo(
		() =>
			getArrayPayload<{ id: number | string; name: string }>(
				cascadeProductCategoriesData?.data?.productCategories,
			),
		[cascadeProductCategoriesData],
	);

	const productCategoryItems = useMemo(
		() =>
			cascadeProductCategories?.map((item) => ({
				id: Number(item.id),
				name: item.name,
			})),
		[cascadeProductCategories],
	);
	const nationalityBreakdownFields = useMemo(
		() =>
			NATIONALITY_BREAKDOWN_FIELDS.map((field) => ({
				...field,
				label: t(`companyProfilePage.fields.${field.label}`),
			})),
		[t],
	);

	// ── Strategic Partner data ─────────────────────────────────────────────────
	const spId = isStrategicPartnerContext ? loggedInPartnerId : null;
	const { data: spData } = useStrategicPartnerById(spId ?? 0);
	const { data: supplierData } = useSupplierFullDetail(
		isSupplierContext ? loggedInSupplierId : null,
	);

	// The logo lives in a private S3 bucket and must be signed per request, which
	// only Django does. cascade-api returns the raw `image` column, so it cannot
	// be trusted as a source here.
	const logoOwnerId = isSupplierContext ? loggedInSupplierId : spId;
	const logoKind = isSupplierContext ? "supplier" : "strategic-partner";
	const { data: signedLogoUrl } = useQuery({
		queryKey: ["company-profile-logo", logoKind, logoOwnerId],
		queryFn: () =>
			fetchCompanyProfileImageUrl({
				id: logoOwnerId as number,
				kind: logoKind,
			}),
		enabled:
			!isRaContext &&
			Number.isFinite(logoOwnerId ?? Number.NaN) &&
			(logoOwnerId ?? 0) > 0,
		// The URL is only valid until its own `Expires`, so re-sign just before
		// that rather than on a fixed schedule. Keeps a long-open profile page
		// from silently degrading to the letter avatar.
		refetchInterval: (query) =>
			getSignedUrlRefreshDelayMs(query.state.data) ?? false,
		refetchIntervalInBackground: false,
		// A cached signed URL is worthless once stale, so always re-sign on
		// remount/focus instead of serving one that may already be dead.
		staleTime: 0,
	});
	const policyCompliances = useMemo(
		() =>
			spData?.strategicPartnerPolicyCompliances ??
			spData?.policyCompliances ??
			spData?.policy_compliances ??
			[],
		[spData],
	);
	const humanRightsCompliance = useMemo(
		() =>
			findPolicyCompliance(
				policyCompliances,
				POLICY_CONFIG.humanRights.keywords,
				POLICY_CONFIG.humanRights.fallbackId,
			),
		[policyCompliances],
	);
	const recruitmentCompliance = useMemo(
		() =>
			findPolicyCompliance(
				policyCompliances,
				POLICY_CONFIG.recruitment.keywords,
				POLICY_CONFIG.recruitment.fallbackId,
			),
		[policyCompliances],
	);
	const procurementCompliance = useMemo(
		() =>
			findPolicyCompliance(
				policyCompliances,
				POLICY_CONFIG.procurement.keywords,
				POLICY_CONFIG.procurement.fallbackId,
			),
		[policyCompliances],
	);

	// ── Basic Information ──────────────────────────────────────────────────────
	const [basicEditing, setBasicEditing] = useState(false);
	const [businessImagesEditing, setBusinessImagesEditing] = useState(false);
	const [companyName, setCompanyName] = useState("");
	const [avatarImage, setAvatarImage] = useState("");
	const [draftAvatarFile, setDraftAvatarFile] = useState<File | null>(null);
	const [hqLocationId, setHqLocationId] = useState("");
	const [hqAddress, setHqAddress] = useState("");
	const [companyDescription, setCompanyDescription] = useState("");
	const [draftName, setDraftName] = useState("");
	const [draftAvatarImage, setDraftAvatarImage] = useState("");
	const [draftLocationId, setDraftLocationId] = useState("");
	const [draftAddress, setDraftAddress] = useState("");
	const [draftDescription, setDraftDescription] = useState("");
	const raBasicInformationQuery = useRecruitmentAgencyBasicInformation(
		isRaContext ? raGdUserId : null,
	);
	const updateRaBasicInformationMutation =
		useUpdateRecruitmentAgencyBasicInformation();
	const [raBasicValues, setRaBasicValues] = useState<RaBasicInformationValues>(
		DEFAULT_RA_BASIC_VALUES,
	);
	useEffect(() => {
		if (raBasicInformationQuery.data) {
			setRaBasicValues(
				mapBasicInformationToFormValues(raBasicInformationQuery.data),
			);
		} else if (!raBasicInformationQuery.isLoading) {
			setRaBasicValues(MOCK_RA_BASIC_VALUES);
		}
	}, [raBasicInformationQuery.data, raBasicInformationQuery.isLoading]);
	const updateRaBasicValues = (patch: Partial<RaBasicInformationValues>) =>
		setRaBasicValues((prev) => ({ ...prev, ...patch }));
	const saveRaBasic = async () => {
		if (raGdUserId == null) return;
		try {
			const updated = await updateRaBasicInformationMutation.mutateAsync({
				userId: raGdUserId,
				payload: mapFormValuesToBasicInformationPayload(raBasicValues),
			});
			setRaBasicValues(mapBasicInformationToFormValues(updated));
			showToast.success(t("companyProfilePage.actions.save"));
		} catch {
			showToast.error(t("companyProfilePage.actions.save"));
		}
	};
	const cancelRaBasic = () =>
		setRaBasicValues(
			raBasicInformationQuery.data
				? mapBasicInformationToFormValues(raBasicInformationQuery.data)
				: MOCK_RA_BASIC_VALUES,
		);

	const raContactInformationQuery = useRecruitmentAgencyContactInformation(
		isRaContext ? raGdUserId : null,
	);
	const updateRaContactInformationMutation =
		useUpdateRecruitmentAgencyContactInformation();
	const [raContactValues, setRaContactValues] =
		useState<RaContactInformationValues>(DEFAULT_RA_CONTACT_VALUES);
	useEffect(() => {
		if (raContactInformationQuery.data) {
			setRaContactValues(
				mapContactInformationToFormValues(raContactInformationQuery.data),
			);
		} else if (!raContactInformationQuery.isLoading) {
			setRaContactValues(MOCK_RA_CONTACT_VALUES);
		}
	}, [raContactInformationQuery.data, raContactInformationQuery.isLoading]);
	const updateRaContactValues = (patch: Partial<RaContactInformationValues>) =>
		setRaContactValues((prev) => ({ ...prev, ...patch }));
	const saveRaContact = async () => {
		if (raGdUserId == null) return;
		try {
			const updated = await updateRaContactInformationMutation.mutateAsync({
				userId: raGdUserId,
				payload: mapFormValuesToContactInformationPayload(raContactValues),
			});
			setRaContactValues(mapContactInformationToFormValues(updated));
			showToast.success(t("companyProfilePage.actions.save"));
		} catch {
			showToast.error(t("companyProfilePage.actions.save"));
		}
	};
	const cancelRaContact = () =>
		setRaContactValues(
			raContactInformationQuery.data
				? mapContactInformationToFormValues(raContactInformationQuery.data)
				: MOCK_RA_CONTACT_VALUES,
		);
	const [nationalBreakdownEditing, setNationalBreakdownEditing] =
		useState(false);
	const [nationalityBreakdown, setNationalityBreakdown] =
		useState<NationalityBreakdownValues>(createEmptyNationalityBreakdownValues);
	const [draftNationalityBreakdown, setDraftNationalityBreakdown] =
		useState<NationalityBreakdownValues>(createEmptyNationalityBreakdownValues);
	const [nationalityGenderBreakdown, setNationalityGenderBreakdown] =
		useState<NationalityGenderBreakdownValues>(
			createEmptyNationalityGenderBreakdownValues,
		);
	const [draftNationalityGenderBreakdown, setDraftNationalityGenderBreakdown] =
		useState<NationalityGenderBreakdownValues>(
			createEmptyNationalityGenderBreakdownValues,
		);
	const [sourcingCountryIds, setSourcingCountryIds] = useState<number[]>([]);
	const [industryIds, setIndustryIds] = useState<number[]>([]);
	const [productCatIds, setProductCatIds] = useState<number[]>([]);
	const [draftCountryIds, setDraftCountryIds] = useState<number[]>([]);
	const [draftIndustryIds, setDraftIndustryIds] = useState<number[]>([]);
	const [draftProductCatIds, setDraftProductCatIds] = useState<number[]>([]);
	const [humanRights, setHumanRights] = useState("");
	const [humanRightsLink, setHumanRightsLink] = useState("");
	const [responsibleRecruitment, setResponsibleRecruitment] = useState("");
	const [responsibleRecruitmentLink, setResponsibleRecruitmentLink] =
		useState("");
	const [responsibleProcurement, setResponsibleProcurement] = useState("");
	const [responsibleProcurementLink, setResponsibleProcurementLink] =
		useState("");
	useEffect(() => {
		const profileData = isSupplierContext ? supplierData : spData;
		if (!profileData) return;

		const resolvedName =
			profileData.name ??
			(profileData as { name_en?: string | null }).name_en ??
			"";
		// Prefer the freshly signed URL from Django. The `image` column reached
		// through cascade-api is only a legacy fallback for partners that never
		// had a file uploaded (e.g. "/static/media/logo/logo_tesco.jpg").
		const resolvedAvatarImage = resolveAvatarImageUrl(
			[
				signedLogoUrl,
				(profileData as { image?: string | null }).image,
				(profileData as { logo?: string | null }).logo,
			].find((candidate) => candidate?.trim()),
		);
		const resolvedLocationId =
			profileData.country_id != null
				? String(profileData.country_id)
				: String(profileData.country);
		const resolvedAddress =
			profileData.address ??
			(profileData as { addresses?: Array<{ street?: string | null }> })
				.addresses?.[0]?.street ??
			"";
		const resolvedDescription =
			(profileData as { background?: string | null }).background ??
			(profileData as { description?: string | null }).description ??
			(profileData as { business_profile?: string | null }).business_profile ??
			"";

		// Use the pre-computed sourcing object from the API when available,
		// otherwise fall back to the flat arrays on the partner object.
		const sourcingData =
			(
				profileData as {
					sourcing?: {
						sourcing_country_ids?: number[];
						industry_ids?: number[];
						product_category_ids?: number[];
					};
				}
			).sourcing ?? null;
		const sourcingCountryIdsFromProfile =
			(profileData as { sourcing_country_ids?: number[] })
				.sourcing_country_ids ?? [];
		const industryIdsFromProfile =
			(profileData as { industry_ids?: number[] }).industry_ids ||
			(profileData as { industries?: number[] }).industries ||
			[];
		const productCategoryIdsFromProfile =
			(profileData as { product_category_ids?: number[] })
				.product_category_ids ?? [];
		const resolvedSourcingCountryIds = getUniqueNumericIds(
			sourcingData?.sourcing_country_ids ??
				sourcingCountryIdsFromProfile ??
				(
					(
						profileData as {
							sourcingCountries?: Array<{ country_id?: number | null }>;
						}
					).sourcingCountries ?? []
				).map((sc) => sc.country_id ?? null),
		);
		const resolvedIndustryIds = getUniqueNumericIds(
			sourcingData?.industry_ids ??
				industryIdsFromProfile ??
				(
					(
						profileData as {
							industries?: Array<{ industry_id?: number | null }>;
						}
					).industries ?? []
				).map((ind) => ind.industry_id ?? null),
		);
		const resolvedProductCategoryIds = getUniqueNumericIds(
			sourcingData?.product_category_ids ??
				productCategoryIdsFromProfile ??
				(
					(
						profileData as {
							strategicPartnerProductCategories?: Array<{
								product_category_id?: number | null;
							}>;
						}
					).strategicPartnerProductCategories ?? []
				).map((item) => item.product_category_id),
		);
		const resolvedHumanRightsText =
			humanRightsCompliance?.text_value ??
			(profileData as { human_rights_policy?: string | null })
				.human_rights_policy ??
			"";
		const resolvedHumanRightsLink =
			humanRightsCompliance?.link_url ??
			(profileData as { human_rights_policy_url?: string | null })
				.human_rights_policy_url ??
			"";
		const resolvedRecruitmentText =
			recruitmentCompliance?.text_value ??
			(profileData as { responsible_recruitment_policy?: string | null })
				.responsible_recruitment_policy ??
			"";
		const resolvedRecruitmentLink =
			recruitmentCompliance?.link_url ??
			(profileData as { responsible_recruitment_policy_url?: string | null })
				.responsible_recruitment_policy_url ??
			"";
		const resolvedProcurementText =
			procurementCompliance?.text_value ??
			(profileData as { responsible_procurement_policy?: string | null })
				.responsible_procurement_policy ??
			"";
		const resolvedProcurementLink =
			procurementCompliance?.link_url ??
			(profileData as { responsible_procurement_policy_url?: string | null })
				.responsible_procurement_policy_url ??
			"";
		const resolvedNationalityBreakdown = NATIONALITY_BREAKDOWN_FIELDS.reduce(
			(acc, field) => {
				acc[field.key] = getStringValue(Reflect.get(profileData, field.key));
				return acc;
			},
			createEmptyNationalityBreakdownValues(),
		);
		const resolvedNationalityGenderBreakdown =
			NATIONALITY_BREAKDOWN_FIELDS.slice(3).reduce((acc, field) => {
				const { menKey, womenKey } = getNationalityGenderKeys(
					field.key as NationalityTotalFieldKey,
				);
				acc[menKey] = getStringValue(Reflect.get(profileData, menKey));
				acc[womenKey] = getStringValue(Reflect.get(profileData, womenKey));
				return acc;
			}, createEmptyNationalityGenderBreakdownValues());

		setCompanyName(resolvedName);
		setAvatarImage(resolvedAvatarImage);
		setDraftAvatarFile(null);
		setHqLocationId(resolvedLocationId);
		setHqAddress(resolvedAddress);
		setCompanyDescription(resolvedDescription);
		setDraftName(resolvedName);
		setDraftAvatarImage(resolvedAvatarImage);
		setDraftLocationId(resolvedLocationId);
		setDraftAddress(resolvedAddress);
		setDraftDescription(resolvedDescription);
		setSourcingCountryIds(resolvedSourcingCountryIds);
		setIndustryIds(resolvedIndustryIds);
		setProductCatIds(resolvedProductCategoryIds);
		setDraftCountryIds(resolvedSourcingCountryIds);
		setDraftIndustryIds(resolvedIndustryIds);
		setDraftProductCatIds(resolvedProductCategoryIds);
		setHumanRights(resolvedHumanRightsText);
		setHumanRightsLink(resolvedHumanRightsLink);
		setResponsibleRecruitment(resolvedRecruitmentText);
		setResponsibleRecruitmentLink(resolvedRecruitmentLink);
		setResponsibleProcurement(resolvedProcurementText);
		setResponsibleProcurementLink(resolvedProcurementLink);
		setNationalityBreakdown(resolvedNationalityBreakdown);
		setDraftNationalityBreakdown(resolvedNationalityBreakdown);
		setNationalityGenderBreakdown(resolvedNationalityGenderBreakdown);
		setDraftNationalityGenderBreakdown(resolvedNationalityGenderBreakdown);
	}, [
		isSupplierContext,
		supplierData,
		spData,
		signedLogoUrl,
		humanRightsCompliance,
		recruitmentCompliance,
		procurementCompliance,
	]);

	const hqLocationLabel =
		countryOptions.find((o) => o.value === hqLocationId)?.label || "N/A";

	const getProfileNotificationOwner = () => {
		const ownerId = isSupplierContext ? loggedInSupplierId : spId;
		if (!(Number.isFinite(ownerId ?? NaN) && (ownerId ?? 0) > 0)) {
			return null;
		}

		const displayName =
			companyName.trim() ||
			(isSupplierContext ? supplierData?.name : spData?.name) ||
			(isSupplierContext ? "Supplier" : "Strategic partner");

		return {
			displayName,
			ownerId: ownerId as number,
			ownerType: isSupplierContext ? "supplier" : "strategic_partner",
		};
	};

	const emitCompanyProfileFieldNotifications = (
		changes: Array<{
			field: string;
			label: string;
			newValue: string;
			oldValue?: string;
			section: string;
		}>,
	) => {
		const owner = getProfileNotificationOwner();
		if (!owner || changes.length === 0) return;

		emitNotifications(
			changes.map((change) => ({
				recipient_id: ISSARA_STAFF_RECIPIENT,
				recipient_role: "staff",
				type: "COMPANY_PROFILE_UPDATE",
				title: `${owner.displayName} updated ${change.label}`,
				message: `${owner.displayName} updated ${change.label} to "${change.newValue}"`,
				data: {
					sender_name: owner.displayName,
					sender_id: owner.ownerId,
					owner_id: owner.ownerId,
					owner_type: owner.ownerType,
					section: change.section,
					field: change.field,
					field_label: change.label,
					old_value: change.oldValue,
					new_value: change.newValue,
				},
			})),
		);
	};

	const normalizeNotificationValue = (value: unknown) => {
		if (value === null || value === undefined) return "";
		if (Array.isArray(value)) return value.map(String).join(", ");
		return String(value).trim();
	};

	const buildNotificationChange = ({
		field,
		label,
		oldValue,
		newValue,
		section,
	}: {
		field: string;
		label: string;
		oldValue: unknown;
		newValue: unknown;
		section: string;
	}) => {
		const normalizedOldValue = normalizeNotificationValue(oldValue);
		const normalizedNewValue = normalizeNotificationValue(newValue);
		if (normalizedOldValue === normalizedNewValue) return null;

		return {
			field,
			label,
			section,
			oldValue: normalizedOldValue || "Not provided",
			newValue: normalizedNewValue || "Not provided",
		};
	};

	const formatNames = (
		allItems: { id: number; name: string }[],
		ids: number[],
	) => {
		const names = resolveNames(allItems, ids);
		return names.length > 0 ? names.join(", ") : "Not provided";
	};

	const startBasicEdit = () => {
		setDraftName(companyName);
		setDraftAvatarImage(avatarImage);
		setDraftAvatarFile(null);
		setDraftLocationId(hqLocationId);
		setDraftAddress(hqAddress);
		setDraftDescription(companyDescription);
		setDraftCountryIds([...sourcingCountryIds]);
		setDraftIndustryIds([...industryIds]);
		setDraftProductCatIds([...productCatIds]);
		setBasicEditing(true);
	};

	const buildPolicyCompliancesPayload = (
		entries: {
			id: number;
			textValue: string;
			linkValue: string;
		}[],
	) =>
		entries.map((entry) => ({
			policy_compliance_id: entry.id,
			text_value: entry.textValue.trim() !== "" ? entry.textValue.trim() : null,
			link_url: entry.linkValue.trim() !== "" ? entry.linkValue.trim() : null,
		}));

	const updateCompanyProfile = async ({
		name,
		avatarImage,
		address,
		countryId,
		background,
		sourcingCountryIds: nextSourcingCountryIds,
		industryIds: nextIndustryIds,
		productCategoryIds: nextProductCategoryIds,
		avatarFile,
		humanRightsText,
		humanRightsLink,
		recruitmentText,
		recruitmentLink,
		procurementText,
		procurementLink,
		nationalityBreakdown,
		successMessage,
	}: {
		name: string;
		avatarImage: string;
		address: string;
		countryId: string;
		background: string;
		sourcingCountryIds: number[];
		industryIds: number[];
		productCategoryIds: number[];
		avatarFile: File | null;
		humanRightsText: string;
		humanRightsLink: string;
		recruitmentText: string;
		recruitmentLink: string;
		procurementText: string;
		procurementLink: string;
		nationalityBreakdown: NationalityBreakdownValues;
		nationalityGenderBreakdown: NationalityGenderBreakdownValues;
		successMessage: string;
	}) => {
		let nextAvatarImage = avatarImage.trim();

		if (avatarFile) {
			const companyId = isSupplierContext ? loggedInSupplierId : spId;
			if (!(Number.isFinite(companyId ?? NaN) && (companyId ?? 0) > 0)) {
				showToast.error("Unable to determine company ID for image upload.");
				return false;
			}

			const uploadKind = isSupplierContext ? "supplier" : "strategic-partner";
			try {
				const uploadResponse = await uploadCompanyProfileImage({
					file: avatarFile,
					id: companyId as number,
					kind: uploadKind,
				});
				const uploadedImageUrl = extractCompanyProfileImageUrl(uploadResponse);
				if (!uploadedImageUrl) {
					showToast.error("Image upload did not return a usable URL.");
					return false;
				}
				nextAvatarImage = uploadedImageUrl;
			} catch (error) {
				console.error("Failed to upload company profile image", error);
				showToast.error("Failed to upload image.");
				return false;
			}

			await syncLogoToGd(avatarFile);
		}

		if (isSupplierContext) {
			if (
				!(
					Number.isFinite(loggedInSupplierId ?? NaN) &&
					(loggedInSupplierId ?? 0) > 0
				)
			) {
				showToast.error("Unable to determine supplier ID.");
				return false;
			}

			const supplierId = loggedInSupplierId as number;
			const trimmedAvatarImage = nextAvatarImage;

			try {
				setIsSupplierSavingProfile(true);
				await api.put(
					`${import.meta.env.VITE_APP_CASCADE_API_URL}/supplier`,
					{
						partner: {
							name: name.trim(),
							address: address.trim(),
							website:
								(
									supplierData as {
										website?: string | null;
									} | null
								)?.website ?? "",
							background: background.trim(),
							country_id: countryId ? Number(countryId) : null,
							image: toPersistableImageValue(trimmedAvatarImage),
							...buildNationalityBreakdownPayload(
								nationalityBreakdown,
								nationalityGenderBreakdown,
							),
						},
						sourcing: {
							sourcing_country_ids: nextSourcingCountryIds,
							industry_ids: nextIndustryIds,
							product_category_ids: nextProductCategoryIds,
						},
						policy_compliances: buildPolicyCompliancesPayload([
							{
								id:
									humanRightsCompliance?.policy_compliance_id ??
									POLICY_CONFIG.humanRights.fallbackId,
								textValue: humanRightsText,
								linkValue: humanRightsLink,
							},
							{
								id:
									recruitmentCompliance?.policy_compliance_id ??
									POLICY_CONFIG.recruitment.fallbackId,
								textValue: recruitmentText,
								linkValue: recruitmentLink,
							},
							{
								id:
									procurementCompliance?.policy_compliance_id ??
									POLICY_CONFIG.procurement.fallbackId,
								textValue: procurementText,
								linkValue: procurementLink,
							},
						]),
					},
					{
						params: { id: supplierId },
						withCredentials: true,
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
						},
					},
				);

				showToast.success(successMessage);
				// Invalidate supplier query to refetch updated data
				queryClient.invalidateQueries({
					queryKey: ["ilm-supplier-detail", supplierId],
				});
				return nextAvatarImage;
			} catch (error) {
				console.error("Failed to update supplier profile", error);
				showToast.error(t("companyProfilePage.messages.updateError"));
				return false;
			} finally {
				setIsSupplierSavingProfile(false);
			}
		}

		if (!(Number.isFinite(spId ?? NaN) && (spId ?? 0) > 0)) {
			showToast.error(
				t("companyProfilePage.messages.unableDeterminePartnerId"),
			);
			return false;
		}

		const strategicPartnerId = spId as number;
		const trimmedAvatarImage = nextAvatarImage;

		try {
			await updateStrategicPartner.mutateAsync({
				id: strategicPartnerId,
				partner: {
					name: name.trim(),
					address: address.trim(),
					website: spData?.website ?? "",
					background: background.trim(),
					country_id: countryId ? Number(countryId) : null,
					image: toPersistableImageValue(trimmedAvatarImage),
					...buildNationalityBreakdownPayload(
						nationalityBreakdown,
						nationalityGenderBreakdown,
					),
				},
				sourcing: {
					sourcing_country_ids: nextSourcingCountryIds,
					industry_ids: nextIndustryIds,
					product_category_ids: nextProductCategoryIds,
				},
				policy_compliances: buildPolicyCompliancesPayload([
					{
						id:
							humanRightsCompliance?.policy_compliance_id ??
							POLICY_CONFIG.humanRights.fallbackId,
						textValue: humanRightsText,
						linkValue: humanRightsLink,
					},
					{
						id:
							recruitmentCompliance?.policy_compliance_id ??
							POLICY_CONFIG.recruitment.fallbackId,
						textValue: recruitmentText,
						linkValue: recruitmentLink,
					},
					{
						id:
							procurementCompliance?.policy_compliance_id ??
							POLICY_CONFIG.procurement.fallbackId,
						textValue: procurementText,
						linkValue: procurementLink,
					},
				]),
			});

			showToast.success(successMessage);
			return nextAvatarImage;
		} catch (error) {
			console.error("Failed to update company profile", error);
			showToast.error(t("companyProfilePage.messages.updateError"));
			return false;
		}
	};

	const saveBasic = async () => {
		const savedAvatarImage = await updateCompanyProfile({
			name: draftName,
			avatarImage: draftAvatarImage,
			avatarFile: draftAvatarFile,
			address: draftAddress,
			countryId: draftLocationId,
			background: draftDescription,
			sourcingCountryIds: draftCountryIds,
			industryIds: draftIndustryIds,
			productCategoryIds: draftProductCatIds,
			humanRightsText: humanRights,
			humanRightsLink,
			recruitmentText: responsibleRecruitment,
			recruitmentLink: responsibleRecruitmentLink,
			procurementText: responsibleProcurement,
			procurementLink: responsibleProcurementLink,
			nationalityBreakdown,
			nationalityGenderBreakdown,
			successMessage: t("companyProfilePage.messages.basicUpdated"),
		});

		if (savedAvatarImage === false) return;

		if (loggedInPartnerId) {
			try {
				await updateLksgRiskSettings({
					human_rights_officer_confirmed: humanRightsOfficerConfirmed,
					human_rights_officer_name:
						humanRightsOfficerConfirmed && humanRightsOfficerName.trim()
							? humanRightsOfficerName.trim()
							: null,
				});
				commitLksgRiskFields([...HR_OFFICER_FIELDS]);
			} catch (error) {
				console.error("Failed to update human rights officer", error);
				showToast.error(t("companyProfilePage.messages.updateError"));
				return;
			}
		}

		const basicClientChanges = [
			buildNotificationChange({
				field: "name",
				label: "Company Name",
				oldValue: companyName,
				newValue: draftName,
				section: "Basic Information",
			}),
			buildNotificationChange({
				field: "address",
				label: "Headquarters Address",
				oldValue: hqAddress,
				newValue: draftAddress,
				section: "Basic Information",
			}),
			buildNotificationChange({
				field: "description",
				label: "Company Description",
				oldValue: companyDescription,
				newValue: draftDescription,
				section: "Basic Information",
			}),
			buildNotificationChange({
				field: "country_id",
				label: "HQ country",
				oldValue:
					countryOptions.find((option) => option.value === hqLocationId)
						?.label ?? hqLocationId,
				newValue:
					countryOptions.find((option) => option.value === draftLocationId)
						?.label ?? draftLocationId,
				section: "Basic Information",
			}),
			buildNotificationChange({
				field: "company_logo",
				label: "Company logo",
				oldValue: avatarImage,
				newValue: draftAvatarFile?.name ?? savedAvatarImage,
				section: "Basic Information",
			}),
			buildNotificationChange({
				field: "sourcing_country_ids",
				label: "Sourcing countries",
				oldValue: formatNames(multiCountryItems, sourcingCountryIds),
				newValue: formatNames(multiCountryItems, draftCountryIds),
				section: "Basic Information",
			}),
			buildNotificationChange({
				field: "industry_ids",
				label: "Industries",
				oldValue: formatNames(industryItems, industryIds),
				newValue: formatNames(industryItems, draftIndustryIds),
				section: "Basic Information",
			}),
			buildNotificationChange({
				field: "product_category_ids",
				label: "Product categories",
				oldValue: formatNames(productCategoryItems, productCatIds),
				newValue: formatNames(productCategoryItems, draftProductCatIds),
				section: "Basic Information",
			}),
		].filter((change): change is NonNullable<typeof change> => Boolean(change));
		emitCompanyProfileFieldNotifications(basicClientChanges);

		setCompanyName(draftName);
		setAvatarImage(savedAvatarImage);
		setDraftAvatarFile(null);
		setHqLocationId(draftLocationId);
		setHqAddress(draftAddress);
		setCompanyDescription(draftDescription);
		setSourcingCountryIds(draftCountryIds);
		setIndustryIds(draftIndustryIds);
		setProductCatIds(draftProductCatIds);
		setBasicEditing(false);
	};
	const cancelBasic = () => {
		resetLksgRiskFields([...HR_OFFICER_FIELDS]);
		setBasicEditing(false);
	};

	// ── Avatar-only quick save ─────────────────────────────────────────────────
	const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

	const handleAvatarChange = async (file: File) => {
		const companyId = isSupplierContext ? loggedInSupplierId : spId;
		if (!(Number.isFinite(companyId ?? NaN) && (companyId ?? 0) > 0)) {
			showToast.error("Unable to determine company ID for image upload.");
			return;
		}
		const uploadKind = isSupplierContext ? "supplier" : "strategic-partner";
		setIsUploadingAvatar(true);
		try {
			const uploadResponse = await uploadCompanyProfileImage({
				file,
				id: companyId as number,
				kind: uploadKind,
			});
			const uploadedImageUrl = extractCompanyProfileImageUrl(uploadResponse);
			if (!uploadedImageUrl) {
				showToast.error("Image upload did not return a usable URL.");
				return;
			}
			await syncLogoToGd(file);
			// Persist the new image URL via the profile update
			const saved = await updateCompanyProfile({
				name: companyName,
				avatarImage: uploadedImageUrl,
				avatarFile: null,
				address: hqAddress,
				countryId: hqLocationId,
				background: companyDescription,
				sourcingCountryIds,
				industryIds,
				productCategoryIds: productCatIds,
				humanRightsText: humanRights,
				humanRightsLink,
				recruitmentText: responsibleRecruitment,
				recruitmentLink: responsibleRecruitmentLink,
				procurementText: responsibleProcurement,
				procurementLink: responsibleProcurementLink,
				nationalityBreakdown,
				nationalityGenderBreakdown,
				successMessage: t("companyProfilePage.messages.avatarUpdated"),
			});
			if (saved !== false) {
				const savedImageUrl =
					typeof saved === "string" ? saved : uploadedImageUrl;
				emitCompanyProfileFieldNotifications([
					{
						field: "company_logo",
						label: "Company logo",
						oldValue: avatarImage || "Not provided",
						newValue: file.name,
						section: "Basic Information",
					},
				]);
				setAvatarImage(savedImageUrl);
				setDraftAvatarImage(savedImageUrl);
			}
		} catch {
			showToast.error("Failed to upload avatar.");
		} finally {
			setIsUploadingAvatar(false);
		}
	};

	const handleRaAvatarChange = async (file: File) => {
		if (raGdUserId == null) {
			showToast.error("Unable to determine company ID for image upload.");
			return;
		}
		try {
			await updateGdAvatarMutation.mutateAsync(file);
			await queryClient.invalidateQueries({
				queryKey: ["recruitment-agency-basic-information", raGdUserId],
			});
			showToast.success(t("companyProfilePage.messages.avatarUpdated"));
		} catch {
			showToast.error("Failed to upload avatar.");
		}
	};

	const resolveNames = (
		allItems: { id: number; name: string }[],
		ids: number[],
	) =>
		ids.map(
			(id) =>
				allItems.find((item) => item.id === id)?.name ??
				t("companyProfilePage.messages.categoryFallback", { id }),
		);

	const startSourcingEdit = () => {
		setDraftCountryIds([...sourcingCountryIds]);
		setDraftIndustryIds([...industryIds]);
		setDraftProductCatIds([...productCatIds]);
		setDraftNationalityBreakdown({ ...nationalityBreakdown });
		setDraftNationalityGenderBreakdown({ ...nationalityGenderBreakdown });
		setNationalBreakdownEditing(true);
	};
	const updateDraftWorkforceBreakdown = (key: string, value: string) => {
		setDraftNationalityBreakdown((prev) => {
			const next = {
				...prev,
				[key as NationalityBreakdownFieldKey]: value,
			};

			if (
				!WORKFORCE_SUMMARY_KEYS.includes(
					key as (typeof WORKFORCE_SUMMARY_KEYS)[number],
				)
			) {
				return next;
			}

			const total = parseCountValue(next[WORKFORCE_TOTAL_KEY]);
			const male = parseCountValue(next[WORKFORCE_MALE_KEY]);
			const female = parseCountValue(next[WORKFORCE_FEMALE_KEY]);

			if (
				key === WORKFORCE_TOTAL_KEY &&
				total !== null &&
				hasCountValue(next[WORKFORCE_TOTAL_KEY])
			) {
				if (male !== null && hasCountValue(next[WORKFORCE_MALE_KEY])) {
					next[WORKFORCE_FEMALE_KEY] = formatCalculatedCount(total - male);
				} else if (
					female !== null &&
					hasCountValue(next[WORKFORCE_FEMALE_KEY])
				) {
					next[WORKFORCE_MALE_KEY] = formatCalculatedCount(total - female);
				}
			}

			if (
				key === WORKFORCE_MALE_KEY &&
				male !== null &&
				hasCountValue(next[WORKFORCE_MALE_KEY])
			) {
				if (total !== null && hasCountValue(next[WORKFORCE_TOTAL_KEY])) {
					next[WORKFORCE_FEMALE_KEY] = formatCalculatedCount(total - male);
				} else if (
					female !== null &&
					hasCountValue(next[WORKFORCE_FEMALE_KEY])
				) {
					next[WORKFORCE_TOTAL_KEY] = String(male + female);
				}
			}

			if (
				key === WORKFORCE_FEMALE_KEY &&
				female !== null &&
				hasCountValue(next[WORKFORCE_FEMALE_KEY])
			) {
				if (total !== null && hasCountValue(next[WORKFORCE_TOTAL_KEY])) {
					next[WORKFORCE_MALE_KEY] = formatCalculatedCount(total - female);
				} else if (male !== null && hasCountValue(next[WORKFORCE_MALE_KEY])) {
					next[WORKFORCE_TOTAL_KEY] = String(male + female);
				}
			}

			return next;
		});
	};
	const saveSourcing = async () => {
		const {
			total: sumNatTotal,
			male: sumNatMale,
			female: sumNatFemale,
		} = getSumOfNationalities(
			draftNationalityBreakdown,
			draftNationalityGenderBreakdown,
		);

		const enteredTotal = toNumberOrZero(
			draftNationalityBreakdown.total_num_workers,
		);
		const enteredMale = toNumberOrZero(
			draftNationalityBreakdown.total_num_men_workers,
		);
		const enteredFemale = toNumberOrZero(
			draftNationalityBreakdown.total_num_women_workers,
		);

		if (sumNatTotal > enteredTotal) {
			showToast.error(
				`Total workers (${enteredTotal}) cannot be less than the sum of all nationalities (${sumNatTotal}).`,
			);
			return;
		}
		if (sumNatMale > enteredMale) {
			showToast.error(
				`Total male workers (${enteredMale}) cannot be less than the sum of all nationality male breakdowns (${sumNatMale}).`,
			);
			return;
		}
		if (sumNatFemale > enteredFemale) {
			showToast.error(
				`Total female workers (${enteredFemale}) cannot be less than the sum of all nationality female breakdowns (${sumNatFemale}).`,
			);
			return;
		}

		let didSave = false;

		if (isSupplierContext) {
			if (
				!(
					Number.isFinite(loggedInSupplierId ?? NaN) &&
					(loggedInSupplierId ?? 0) > 0
				)
			) {
				showToast.error("Unable to determine supplier ID.");
				return;
			}

			try {
				setIsSupplierSavingProfile(true);
				await api.put(
					`${import.meta.env.VITE_APP_CASCADE_API_URL}/supplier`,
					{
						partner: {
							name: companyName.trim(),
							address: hqAddress.trim(),
							website:
								(
									supplierData as {
										website?: string | null;
									} | null
								)?.website ?? "",
							background: companyDescription.trim(),
							country_id: hqLocationId ? Number(hqLocationId) : null,
							image: toPersistableImageValue(avatarImage),
							...buildNationalityBreakdownPayload(
								draftNationalityBreakdown,
								draftNationalityGenderBreakdown,
							),
						},
						sourcing: {
							sourcing_country_ids: draftCountryIds,
							industry_ids: draftIndustryIds,
							product_category_ids: draftProductCatIds,
						},
						policy_compliances: buildPolicyCompliancesPayload([
							{
								id:
									humanRightsCompliance?.policy_compliance_id ??
									POLICY_CONFIG.humanRights.fallbackId,
								textValue: humanRights,
								linkValue: humanRightsLink,
							},
							{
								id:
									recruitmentCompliance?.policy_compliance_id ??
									POLICY_CONFIG.recruitment.fallbackId,
								textValue: responsibleRecruitment,
								linkValue: responsibleRecruitmentLink,
							},
							{
								id:
									procurementCompliance?.policy_compliance_id ??
									POLICY_CONFIG.procurement.fallbackId,
								textValue: responsibleProcurement,
								linkValue: responsibleProcurementLink,
							},
						]),
					},
					{
						params: { id: loggedInSupplierId },
						withCredentials: true,
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
						},
					},
				);
				didSave = true;
				// Invalidate supplier query to refetch updated sourcing data
				queryClient.invalidateQueries({
					queryKey: ["ilm-supplier-detail", loggedInSupplierId],
				});
			} catch (error) {
				console.error("Failed to update supplier workforce breakdown", error);
				showToast.error(t("companyProfilePage.messages.updateError"));
			} finally {
				setIsSupplierSavingProfile(false);
			}
		} else {
			if (!(Number.isFinite(spId ?? NaN) && (spId ?? 0) > 0)) {
				showToast.error(
					t("companyProfilePage.messages.unableDeterminePartnerId"),
				);
				return;
			}

			try {
				await updateStrategicPartner.mutateAsync({
					id: spId as number,
					partner: {
						name: companyName.trim(),
						address: hqAddress.trim(),
						website: spData?.website ?? "",
						background: companyDescription.trim(),
						country_id: hqLocationId ? Number(hqLocationId) : null,
						image: toPersistableImageValue(avatarImage),
						...buildNationalityBreakdownPayload(
							draftNationalityBreakdown,
							draftNationalityGenderBreakdown,
						),
					},
					sourcing: {
						sourcing_country_ids: draftCountryIds,
						industry_ids: draftIndustryIds,
						product_category_ids: draftProductCatIds,
					},
					policy_compliances: (policyCompliances ?? []).map((compliance) => ({
						policy_compliance_id: compliance.policy_compliance_id,
						text_value: compliance.text_value ?? null,
						link_url: compliance.link_url ?? null,
					})),
				});
				didSave = true;
			} catch (error) {
				console.error(
					"Failed to update strategic partner workforce breakdown",
					error,
				);
				showToast.error(t("companyProfilePage.messages.updateError"));
			}
		}

		if (didSave) {
			showToast.success(t("companyProfilePage.messages.workforceUpdated"));
		}

		if (!didSave) return;

		setSourcingCountryIds(draftCountryIds);
		setIndustryIds(draftIndustryIds);
		setProductCatIds(draftProductCatIds);
		setNationalityBreakdown({ ...draftNationalityBreakdown });
		setNationalityGenderBreakdown({ ...draftNationalityGenderBreakdown });
		setNationalBreakdownEditing(false);
	};
	const cancelSourcing = () => setNationalBreakdownEditing(false);

	// ── Sourcing display names ─────────────────────────────────────────────────
	const displayCountries = resolveNames(
		multiCountryItems.length > 0 ? multiCountryItems : [],
		nationalBreakdownEditing ? draftCountryIds : sourcingCountryIds,
	);
	const displayIndustries = resolveNames(
		industryItems.length > 0 ? industryItems : [],
		nationalBreakdownEditing ? draftIndustryIds : industryIds,
	);
	const displayProductCats = resolveNames(
		productCategoryItems,
		nationalBreakdownEditing ? draftProductCatIds : productCatIds,
	);

	const raProfileStrength = useMemo(() => {
		const isThailand = raBasicValues.country === "Thailand";
		const profileFields = [
			raBasicValues.companyName,
			raBasicValues.companyDescription,
			raBasicValues.dateOfRegistration,
			raBasicValues.country,
			isThailand
				? raBasicValues.thaiLicenseNumber
				: raBasicValues.licenseNumber,
			raBasicValues.status,
			raBasicValues.sendingCountries.length > 0,
			raBasicValues.industries.length > 0,
			raContactValues.mainContactName,
			raContactValues.email,
			raContactValues.contactPhoneNumber || raContactValues.phoneNumbers,
		];

		const completedFields = profileFields.filter(Boolean).length;
		return Math.round((completedFields / profileFields.length) * 100);
	}, [raBasicValues, raContactValues]);

	const supplierProfileStrength = useMemo(() => {
		const profileFields = [
			companyName,
			hqLocationLabel,
			hqAddress,
			companyDescription,
			displayCountries.length > 0,
			displayIndustries.length > 0,
			displayProductCats.length > 0,
			humanRights,
			responsibleRecruitment,
			responsibleProcurement,
		];

		const completedFields = profileFields.filter(Boolean).length;
		return Math.round((completedFields / profileFields.length) * 100);
	}, [
		companyName,
		hqLocationLabel,
		hqAddress,
		companyDescription,
		displayCountries.length,
		displayIndustries.length,
		displayProductCats.length,
		humanRights,
		responsibleRecruitment,
		responsibleProcurement,
	]);

	const profileStrength = isRaContext
		? raProfileStrength
		: supplierProfileStrength;

	const queryClient = useQueryClient();
	const [userManagementMembers, setUserManagementMembers] = useState<
		UserManagementMember[]
	>([]);
	const authStoreRole = useAuthData((state) => state.role);

	const handleInviteUser = (values: InviteUserFormValues) => {
		setUserManagementMembers((prev) => {
			const nextId =
				prev.length > 0 ? Math.max(...prev.map((member) => member.id)) + 1 : 1;
			return [
				{
					id: nextId,
					name: values.name,
					email: values.email,
					role: values.role,
					status: "Pending",
					lastActive: "Invitation sent",
				},
				...prev,
			];
		});
	};
	const parsedUser = parseStoredJson<AuthUser>("auth_user");
	const mergedMainUser = parseStoredJson<MergedMainUser>("merged_main_user");
	const { role: authRole } = authStatus();
	const currentRole = authStoreRole ?? authRole;
	const email = parsedUser?.email || "";
	const userGroups = normalizeGroups(parsedUser?.groups);
	const mergedGroups = normalizeGroups(mergedMainUser?.authorization?.groups);
	const effectiveGroups = mergedGroups.length > 0 ? mergedGroups : userGroups;
	const roleValues = [
		currentRole,
		mergedMainUser?.authorization?.userType,
		...effectiveGroups,
	];
	const canShowWorkerVerificationQr = getCanShowWorkerVerificationQr({
		roles: roleValues,
		viewMode,
	});
	const canManageWorkerVerification = roleValues.some((role) =>
		isSupplierRole(role ?? ""),
	);

	useEffect(() => {
		if (
			!isCompanyProfileTab(activeTab) ||
			(!canManageWorkerVerification && activeTab === "company-qr")
		) {
			setActiveTab("profile");
		}
	}, [activeTab, canManageWorkerVerification]);
	const workerVerifierTargetId = getFirstStringValue(
		mergedMainUser?.authorization?.supplierId,
		parsedUser?.supplier,
		mergedMainUser?.links?.gd?.userId,
		parsedUser?.links?.gd?.userId,
		Number.isFinite(spId ?? NaN) && (spId ?? 0) > 0 ? spId : null,
	);

	// ── Business Images data ────────────────────────────────────────────────────
	// For suppliers: use gd_id from supplierData (the GD employer profile ID)
	// For RA: no ID needed (uses RA-specific endpoint)
	const userData = parseStoredJson<AuthUser>("auth_user");

	const gdEmployerProfileId = userData?.links?.gd?.userId;
	const employerProfileIdNumber =
		gdEmployerProfileId != null ? Number(gdEmployerProfileId) : null;
	const businessImagesContext = isSupplierContext ? "supplier" : "ra";

	// Company logo lives in two systems: ILM (Cascade, always present on this
	// page) and GD (only when the account is linked via links.gd.userId).
	// Keep both in sync when a new logo is uploaded.
	const updateGdAvatarMutation = useUpdateGdUserAvatar(employerProfileIdNumber);
	const syncLogoToGd = async (file: File) => {
		if (employerProfileIdNumber == null) return;
		try {
			await updateGdAvatarMutation.mutateAsync(file);
		} catch (error) {
			console.error("Failed to update GD user avatar", error);
			showToast.error("Failed to sync logo to GD.");
		}
	};
	const workerVerifierTargetToken = workerVerifierTargetId
		? buildWorkerVerificationTargetToken({
				id: workerVerifierTargetId,
				name: companyName || spData?.name,
				type: "supplier",
			})
		: null;

	const notifyBusinessImagesChanged = (
		change: BusinessImageNotificationChange,
	) => {
		emitCompanyProfileFieldNotifications([
			{
				field: change.field,
				label: change.label,
				oldValue: "Not provided",
				newValue: change.value,
				section: "Business Images",
			},
		]);
	};

	const workerQrTargetUrl = workerVerifierTargetToken
		? buildWorkerVerificationQrTargetUrl({
				appLinkPrefix: import.meta.env.VITE_APP_GD_LITE_DEEP_LINK_PREFIX,
				origin: window.location.origin,
				targetToken: workerVerifierTargetToken,
			})
		: null;
	const workerVerificationQueryKey = [
		"worker-verification-requests",
		workerVerifierTargetToken,
	];
	const [selectedWorkerRequestId, setSelectedWorkerRequestId] = useState<
		string | null
	>(null);
	const {
		data: workerRequests = [],
		isError: workerRequestsError,
		isLoading: workerRequestsLoading,
	} = useQuery<WorkerVerificationRequest[]>({
		queryKey: workerVerificationQueryKey,
		queryFn: () =>
			fetchWorkerVerificationRequests(workerVerifierTargetToken ?? ""),
		enabled: Boolean(canManageWorkerVerification && workerVerifierTargetToken),
	});
	const selectedWorkerProfileQueryKey = [
		"worker-verification-worker-profile",
		workerVerifierTargetToken,
		selectedWorkerRequestId,
	];
	const {
		data: selectedWorkerProfileResponse,
		error: selectedWorkerProfileError,
		isFetching: isWorkerProfileLoading,
	} = useQuery<WorkerVerificationProfileResponse>({
		queryKey: selectedWorkerProfileQueryKey,
		queryFn: () =>
			fetchWorkerVerificationWorkerProfile({
				requestId: selectedWorkerRequestId ?? "",
				targetToken: workerVerifierTargetToken ?? "",
			}),
		enabled: Boolean(
			canManageWorkerVerification &&
				workerVerifierTargetToken &&
				selectedWorkerRequestId,
		),
	});
	const updateWorkerStatusMutation = useMutation({
		mutationFn: ({
			requestId,
			status,
		}: {
			requestId: string;
			status: "verified" | "rejected";
		}) =>
			updateWorkerVerificationRequestStatus({
				requestId,
				status,
				targetToken: workerVerifierTargetToken ?? "",
			}),
		onSuccess: async (updatedRequest) => {
			queryClient.setQueryData<WorkerVerificationRequest[]>(
				workerVerificationQueryKey,
				(currentRequests = []) =>
					currentRequests.map((request) =>
						request.id === updatedRequest.id ? updatedRequest : request,
					),
			);
			queryClient.setQueryData<WorkerVerificationProfileResponse>(
				[
					"worker-verification-worker-profile",
					workerVerifierTargetToken,
					updatedRequest.id,
				],
				(currentProfile) =>
					currentProfile
						? {
								...currentProfile,
								request: updatedRequest,
							}
						: currentProfile,
			);
			await queryClient.invalidateQueries({
				queryKey: workerVerificationQueryKey,
			});
			await queryClient.refetchQueries({
				queryKey: workerVerificationQueryKey,
				type: "active",
			});
			await queryClient.invalidateQueries({
				queryKey: [
					"worker-verification-worker-profile",
					workerVerifierTargetToken,
					updatedRequest.id,
				],
			});
		},
	});
	const updatingWorkerRequestId = updateWorkerStatusMutation.isPending
		? (updateWorkerStatusMutation.variables?.requestId ?? null)
		: null;

	const handleVerifyWorker = async (requestId: string) => {
		if (!canManageWorkerVerification || !workerVerifierTargetToken) {
			showToast.error(
				t("companyProfilePage.messages.workerVerificationTargetMissing"),
			);
			return;
		}

		try {
			await updateWorkerStatusMutation.mutateAsync({
				requestId,
				status: "verified",
			});
			showToast.success(t("companyProfilePage.messages.workerVerified"));
		} catch {
			showToast.error(t("companyProfilePage.messages.workerVerifyFailed"));
		}
	};

	const handleRejectWorker = async (requestId: string) => {
		if (!canManageWorkerVerification || !workerVerifierTargetToken) {
			showToast.error(
				t("companyProfilePage.messages.workerVerificationTargetMissing"),
			);
			return;
		}

		try {
			await updateWorkerStatusMutation.mutateAsync({
				requestId,
				status: "rejected",
			});
			showToast.success(t("companyProfilePage.messages.workerRejected"));
		} catch {
			showToast.error(t("companyProfilePage.messages.workerRejectFailed"));
		}
	};

	const handleViewWorkerProfile = (requestId: string) => {
		if (!canManageWorkerVerification || !workerVerifierTargetToken) {
			showToast.error(
				t("companyProfilePage.messages.workerVerificationTargetMissing"),
			);
			return;
		}

		setSelectedWorkerRequestId(requestId);
	};

	const handleCloseWorkerProfile = () => {
		setSelectedWorkerRequestId(null);
	};

	const raAvatarUrl = raBasicInformationQuery.data?.avatar
		? buildRaAvatarUrl(raBasicInformationQuery.data.avatar)
		: null;
	const displayCompanyName = isRaContext
		? raBasicValues.companyName
		: companyName;

	return (
		<GuestLayout>
			<PageContainer>
				<CompanyProfilePageHeader companyName={displayCompanyName} />

				<CompanyProfileTabs
					activeTab={activeTab}
					onChange={setActiveTab}
					showCompanyQr={canManageWorkerVerification}
				/>
				{activeTab === "profile" && (
					<ProfileAvatarStrengthCard
						avatarImage={isRaContext ? raAvatarUrl : avatarImage}
						companyName={displayCompanyName}
						isUploadingAvatar={
							isRaContext ? updateGdAvatarMutation.isPending : isUploadingAvatar
						}
						onAvatarChange={
							isRaContext ? handleRaAvatarChange : handleAvatarChange
						}
						profileOwnerEmail={email}
						profileOwnerName={
							isRaContext
								? raBasicValues.companyName
								: t("companyProfilePage.profileOwnerName")
						}
						profileStrength={profileStrength}
					/>
				)}

				{canManageWorkerVerification && activeTab === "company-qr" && (
					<CompanyWorkerVerificationQrPanel
						companyName={companyName || spData?.name}
						targetUrl={canShowWorkerVerificationQr ? workerQrTargetUrl : null}
					/>
				)}

				{activeTab === "user-management" && (
					<UserManagementScreen
						members={userManagementMembers}
						onCloseWorkerProfile={handleCloseWorkerProfile}
						onInviteUser={handleInviteUser}
						onRejectWorker={handleRejectWorker}
						onVerifyWorker={handleVerifyWorker}
						onViewWorkerProfile={handleViewWorkerProfile}
						// Temporarily hidden. Keep the worker-verification wiring intact
						// so the supplier Workers Management table can be restored by
						// passing canManageWorkerVerification here again.
						showWorkerManagement={false}
						updatingWorkerRequestId={updatingWorkerRequestId}
						workerProfile={selectedWorkerProfileResponse?.worker ?? null}
						workerProfileError={Boolean(selectedWorkerProfileError)}
						workerProfileLoading={isWorkerProfileLoading}
						workerProfileOpen={Boolean(selectedWorkerRequestId)}
						workerRequests={workerRequests}
						workerRequestsError={workerRequestsError}
						workerRequestsLoading={workerRequestsLoading}
					/>
				)}

				{activeTab === "profile" && (
					<>
						{isRaContext ? (
							<>
								<RaBasicInformationSection
									actionDisabled={updateRaBasicInformationMutation.isPending}
									countryOptions={raCountryOptions}
									industryItems={raIndustryItems}
									onCancel={cancelRaBasic}
									onChange={updateRaBasicValues}
									onSave={saveRaBasic}
									saving={updateRaBasicInformationMutation.isPending}
									sendingCountryOptions={raCountryOptions}
									subIndustryItems={raSubIndustryItems}
									value={raBasicValues}
								/>
								<RaContactInformationSection
									actionDisabled={updateRaContactInformationMutation.isPending}
									country={raBasicValues.country}
									onCancel={cancelRaContact}
									onChange={updateRaContactValues}
									onSave={saveRaContact}
									saving={updateRaContactInformationMutation.isPending}
									value={raContactValues}
								/>
							</>
						) : (
							<CompanyProfileBasicInformationSection
								actionDisabled={isSavingProfile}
								basicEditing={basicEditing}
								companyDescription={companyDescription}
								companyName={companyName}
								countryOptions={countryOptions}
								displayIndustries={displayIndustries}
								displayProductCats={displayProductCats}
								draftAddress={draftAddress}
								draftDescription={draftDescription}
								draftHumanRightsOfficerConfirmed={humanRightsOfficerConfirmed}
								draftHumanRightsOfficerName={humanRightsOfficerName}
								draftIndustryIds={draftIndustryIds}
								draftLocationId={draftLocationId}
								draftName={draftName}
								draftProductCatIds={draftProductCatIds}
								hqAddress={hqAddress}
								hqLocationId={hqLocationId}
								hqLocationLabel={hqLocationLabel}
								industryItems={industryItems}
								isSavingProfile={isSavingProfile}
								onCancel={cancelBasic}
								onDraftAddressChange={setDraftAddress}
								onDraftDescriptionChange={setDraftDescription}
								onDraftHumanRightsOfficerConfirmedChange={
									setHumanRightsOfficerConfirmed
								}
								onDraftHumanRightsOfficerNameChange={setHumanRightsOfficerName}
								onDraftIndustryIdsChange={setDraftIndustryIds}
								onDraftLocationIdChange={setDraftLocationId}
								onDraftNameChange={setDraftName}
								onDraftProductCatIdsChange={setDraftProductCatIds}
								onSave={basicEditing ? saveBasic : startBasicEdit}
								productCategoryItems={productCategoryItems}
							/>
						)}

						{/* ── Business Images ───────────────────────────────────────────────── */}
						<BusinessImagesSection
							actionDisabled={isSavingProfile}
							context={businessImagesContext}
							editing={businessImagesEditing}
							employerProfileId={employerProfileIdNumber}
							onCancelEdit={() => setBusinessImagesEditing(false)}
							onImagesChanged={notifyBusinessImagesChanged}
							onStartEdit={() => setBusinessImagesEditing(true)}
						/>

						{!isRaContext && (
							<WorkforceBreakdownSection
								actionDisabled={isSavingProfile}
								draftValues={{
									...draftNationalityBreakdown,
									...draftNationalityGenderBreakdown,
								}}
								editing={nationalBreakdownEditing}
								fields={nationalityBreakdownFields}
								onCancel={cancelSourcing}
								onDraftValueChange={(key, value) => {
									updateDraftWorkforceBreakdown(key, value);

									if (
										value.trim() === "" &&
										key.startsWith("total_num_") &&
										key.endsWith("_workers") &&
										key !== "total_num_workers" &&
										key !== "total_num_men_workers" &&
										key !== "total_num_women_workers"
									) {
										const { menKey, womenKey } = getNationalityGenderKeys(
											key as NationalityTotalFieldKey,
										);
										setDraftNationalityGenderBreakdown((prev) => ({
											...prev,
											[menKey]: "",
											[womenKey]: "",
										}));
									}
								}}
								onNationalityTotalsAdd={({ key, female, male, total }) => {
									const { menKey, womenKey } = getNationalityGenderKeys(
										key as NationalityTotalFieldKey,
									);

									const updatedBreakdown = {
										...draftNationalityBreakdown,
										[key]: String(total),
									};
									const updatedGenderBreakdown = {
										...draftNationalityGenderBreakdown,
										[menKey]: String(male),
										[womenKey]: String(female),
									};

									const {
										total: sumNatTotal,
										male: sumNatMale,
										female: sumNatFemale,
									} = getSumOfNationalities(
										updatedBreakdown,
										updatedGenderBreakdown,
									);

									const currentTotal = toNumberOrZero(
										draftNationalityBreakdown.total_num_workers,
									);
									const currentMale = toNumberOrZero(
										draftNationalityBreakdown.total_num_men_workers,
									);
									const currentFemale = toNumberOrZero(
										draftNationalityBreakdown.total_num_women_workers,
									);

									const nextTotal = Math.max(currentTotal, sumNatTotal);
									const nextMale = Math.max(currentMale, sumNatMale);
									const nextFemale = Math.max(currentFemale, sumNatFemale);

									if (
										sumNatTotal > currentTotal ||
										sumNatMale > currentMale ||
										sumNatFemale > currentFemale
									) {
										showToast.warning(
											"The added nationality counts exceed the current total workforce counts. General totals have been adjusted to match.",
										);
									}

									setDraftNationalityBreakdown({
										...updatedBreakdown,
										total_num_workers: String(nextTotal),
										total_num_men_workers: String(nextMale),
										total_num_women_workers: String(nextFemale),
									});

									setDraftNationalityGenderBreakdown(updatedGenderBreakdown);
								}}
								onSave={
									nationalBreakdownEditing ? saveSourcing : startSourcingEdit
								}
								saveButtonText={
									isSavingProfile
										? t("companyProfilePage.actions.saving")
										: t("companyProfilePage.actions.save")
								}
								title={t("companyProfilePage.sections.workforceBreakdown")}
								values={{
									...nationalityBreakdown,
									...nationalityGenderBreakdown,
								}}
								zeroPlaceholder={t("companyProfilePage.placeholders.zero")}
							/>
						)}

						{/* ── Policies & Compliance ──────────────────────────────────────── */}
						<PoliciesComplianceSection
							onPoliciesChanged={(changes) =>
								emitCompanyProfileFieldNotifications(
									changes.map((change) => ({
										...change,
										oldValue: change.oldValue,
										section: "Policies & Compliance",
									})),
								)
							}
							owner={{
								kind: isSupplierContext ? "supplier" : "strategic-partner",
								id: isSupplierContext
									? (loggedInSupplierId ?? null)
									: (loggedInPartnerId ?? null),
							}}
						/>
					</>
				)}
			</PageContainer>
		</GuestLayout>
	);
}

export default RouteComponent;
