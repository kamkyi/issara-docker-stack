import { Box, Flex } from "@radix-ui/themes";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { jobPostingService } from "$src/services/jobPostingService";
import CascadeButton from "../button/button";
import { JobPostingSteps } from "./JobPostingSteps";
import { AccommodationStep } from "./steps/AccommodationStep";
import { AvailableShiftsStep } from "./steps/AvailableShiftsStep";
import { BasicInformationStep } from "./steps/BasicInformationStep";
import { BenefitsStep } from "./steps/BenefitsStep";
import { ContractInformationStep } from "./steps/ContractInformationStep";
import { JobInformationStep } from "./steps/JobInformationStep";
import { LocationStep } from "./steps/LocationStep";
import { NotificationStep } from "./steps/NotificationStep";
import { RecruitmentInformationStep } from "./steps/RecruitmentInformationStep";
import { TranslationStep } from "./steps/TranslationStep";

// API Data Structure
export interface ApiJobPostingData {
	job_poster_country: number;
	origin_country_currency: number;
	destination_country_currency: number;
	ra_currency: number;
	employer_size: string;
	translations: Array<{
		id?: number; // Translation ID from API
		language: number;
		accommodation_details?: string;
		is_rent_utilites_auto_deducted_details?: string;
		probation_period_details?: string;
		safe_grievance_mechanism_details?: string;
		title?: string;
		description?: string;
		requirements?: string;
		contact_name?: string;
		contact_phone_number?: string;
		contact_job_title?: string;
		benefits_details?: string;
		job_position_details?: string;
		remarks?: string;
		meals_allowance?: string;
	}>;
	terms_of_payment: string;
	timing_of_payment: string;
	open_to_genders: string[];
	openToNationalities: number[];
	currency: number;
	have_ethical_recruitment_policy: boolean;
	have_employer_pays_policy: boolean;
	worker_pays_visa_feess: boolean | null;
	worker_pays_work_permit_fees: boolean;
	worker_pays_medical_checkup_fee: boolean;
	hospitalization_insurance: boolean;
	is_social_security_maternity_leave_provided: boolean;
	recruitment_agency: number;
	is_draft: boolean;
	salary: number;

	// Additional API fields
	job_title?: string;
	job_type?: string;
	expired_at?: string;
	number_of_headcount_needed?: number;
	contract_duration_months?: number;
	daily_wage_rate?: string;
	available_shifts?: string;
	overtime_expectation?: string;
	day_of_week_off?: string;
	minimum_working_hours?: number;
	ot_rate_regular?: string;
	ot_rate_holiday?: string;
	normal_rate_holiday?: string;
	number_paid_annual_leave?: number;
	number_paid_sick_leave?: number;
	number_paid_business_leave?: number;
	number_paid_national_holidays?: number;
	is_accommodation_on_site?: boolean;
	is_rent_utilites_auto_deducted?: boolean;
	family_can_live_together?: boolean;
	safe_grievance_mechanism?: boolean;
	probation_period?: boolean;
	email_for_job_announcement?: string;
	passport?: boolean;
	open_to_pinkcard_holder?: boolean;
	open_to_workpermit_holder?: boolean;
	open_to_visa_holder?: boolean;
	open_to_cancellationletter_holder?: boolean;
	incentive_for_diligence?: boolean;
	life_insurance_cover?: boolean;
	meal_provided?: boolean;
	monthly_yearly_bonus?: boolean;
	personal_accident_insurance?: boolean;
	personal_development_training?: boolean;
	shuttle_bus_provided?: boolean;

	// Recruitment Information
	employer_pays_policy_type?: string;
	visa_fee_payer?: string;
	visa_fee_amount?: number;
	work_permit_fee_payer?: string;
	work_permit_fee_amount?: number;
	medical_checkup_fee_payer?: string;
	medical_checkup_fee_amount?: number;
	job_translations?: Record<string, any>;
	employer: number;
}

// Form Data Structure (for UI)
export interface JobPostingData {
	// ID field for editing
	id?: number;

	// Basic Information
	openToNationalities: number[];
	requireDocumentation: string[];
	documentationFile?: File;

	// Job Information
	jobTitle: string;
	employerIndustry: string;
	positionCategory: string; // Category name for display
	jobType: string;
	expiryDate: string;
	headcountNeeded: number;
	contractDuration: number;

	// Location
	country: string; // Changed to number for API
	state: string;
	city: string;

	// Contract Information
	termsOfPayment: string;
	timingOfPayment: string;
	currency: number; // Changed to number for API
	salary: number;
	dailyWageRate: number;

	// Available Shifts
	availableShift: string;
	overtimeExpectation: string;
	dayOfWeekOff: string;
	minimumWorkingHours: number;
	regularOT: number;
	dayOffRate: number;
	holidayOT: number;

	// Benefits
	paidAnnualLeave: number;
	paidSickLeave: number;
	paidBusinessLeave: number;
	paidNationalHolidays: number;
	socialSecurityBenefits: boolean;

	// Benefits Post Employment
	selectedBenefits: number[]; // Array of benefit IDs from API
	accommodationProvided: boolean;
	annualTrip: boolean;
	healthInsurance: boolean;
	hospitalizedInsurance: boolean;
	incentiveForDiligence: boolean;
	lifeInsuranceCover: boolean;
	mealProvided: boolean;
	monthlyYearlyBonus: boolean;
	personalAccidentInsurance: boolean;
	personalDevelopmentTraining: boolean;
	shuttleBusProvided: boolean;

	// Accommodation
	accommodationOnSite: boolean;
	familyMembersCanLiveTogether: boolean;
	rentUtilitiesAutoDeducted: boolean;

	// Other
	safeGrievanceMechanism: boolean;
	probationPeriod: boolean;
	haveEthicalRecruitmentPolicy: boolean;
	haveEmployerPaysPolicy: boolean;
	employerPaysPolicyType: string;
	workerPaysVisaFees: boolean | null;
	workerPaysWorkPermitFees: boolean;
	workerPaysMedicalCheckupFee: boolean;

	// Recruitment Information
	visaFeePayer: string;
	visaFeeAmount: number;
	workPermitFeePayer: string;
	workPermitFeeAmount: number;
	medicalCheckupFeePayer: string;
	medicalCheckupFeeAmount: number;

	// Notification
	notificationEmail: string;

	// Job Translations (array format matching API)
	jobTranslations: Array<{
		id?: number; // Translation ID from API (for updates)
		language: number;
		title?: string;
		job_position_details?: string;
		description?: string;
		requirements?: string;
		contact_name?: string;
		contact_phone_number?: string;
		contact_job_title?: string;
		accommodation_details?: string;
		is_rent_utilites_auto_deducted_details?: string;
		probation_period_details?: string;
		safe_grievance_mechanism_details?: string;
		benefits_details?: string;
	}>;

	// API specific fields
	originCountryCurrency: number;
	destinationCountryCurrency: number;
	raCurrency: number;
	employerSize: string;
	openToNationalitiesGenders: string[];
	recruitmentAgency: number;
	employer: number;
	is_draft?: boolean;
}

// Transform API data to form format
const transformFromApiFormat = (apiData: any): JobPostingData => {
	return {
		// ID field for editing
		id: apiData.id,

		// Basic Information
		openToNationalities: apiData.open_to_nationalities || [],
		requireDocumentation: [
			...(apiData.passport ? ["Passport"] : []),
			...(apiData.open_to_pinkcard_holder ? ["Pink Card"] : []),
			...(apiData.open_to_workpermit_holder ? ["Work Permit"] : []),
			...(apiData.open_to_visa_holder ? ["Visa"] : []),
			...(apiData.open_to_cancellationletter_holder
				? ["Cancellation Letter"]
				: []),
		],

		// Job Information
		jobTitle: apiData.job_title || "",
		employerIndustry: apiData.employer_industry || "",
		positionCategory: apiData.job_position_category || null,
		jobType: apiData.job_type || "",
		expiryDate: new Date(apiData.expired_at).toISOString() || "",
		headcountNeeded: apiData.number_of_headcount_needed || 1,
		contractDuration: apiData.contract_duration_months || 12,

		// Location
		country: apiData.employer_country || "",
		state: apiData.employer_state || "",
		city: apiData.employer_city || "",

		// Contract Information
		termsOfPayment: apiData.terms_of_payment || "Monthly",
		timingOfPayment: apiData.timing_of_payment || "Once A Month",
		currency: apiData.currency || 1,
		salary: apiData.salary || 0,
		dailyWageRate: Number(apiData.daily_wage_rate) || 0,

		// Available Shifts
		availableShift: apiData.available_shifts || "",
		overtimeExpectation: apiData.overtime_expectation || "",
		dayOfWeekOff: apiData.day_of_week_off || "",
		minimumWorkingHours: apiData.minimum_working_hours || 40,
		regularOT: Number(apiData.ot_rate_regular) || 0,
		dayOffRate: Number(apiData.normal_rate_holiday) || 0,
		holidayOT: Number(apiData.ot_rate_holiday) || 0,

		// Benefits
		paidAnnualLeave: apiData.number_paid_annual_leave || 0,
		paidSickLeave: apiData.number_paid_sick_leave || 0,
		paidBusinessLeave: apiData.number_paid_business_leave || 0,
		paidNationalHolidays: apiData.number_paid_national_holidays || 0,
		socialSecurityBenefits:
			apiData.is_social_security_maternity_leave_provided || false,

		// Benefits Post Employment
		selectedBenefits: apiData.benefits || [],
		accommodationProvided: apiData.accommodation_provided || false,
		annualTrip: apiData.annual_trip || false,
		healthInsurance: apiData.health_insurance || false,
		hospitalizedInsurance: apiData.hospitalization_insurance || false,
		incentiveForDiligence: apiData.incentive_for_diligence || false,
		lifeInsuranceCover: apiData.life_insurance_cover || false,
		mealProvided: apiData.meal_provided || false,
		monthlyYearlyBonus: apiData.monthly_yearly_bonus || false,
		personalAccidentInsurance: apiData.personal_accident_insurance || false,
		personalDevelopmentTraining: apiData.personal_development_training || false,
		shuttleBusProvided: apiData.shuttle_bus_provided || false,

		// Accommodation
		accommodationOnSite: apiData.is_accommodation_on_site || false,
		familyMembersCanLiveTogether: apiData.family_can_live_together || false,
		rentUtilitiesAutoDeducted: apiData.is_rent_utilites_auto_deducted || false,

		// Other
		safeGrievanceMechanism: apiData.safe_grievance_mechanism || false,
		probationPeriod: apiData.probation_period || false,
		haveEthicalRecruitmentPolicy:
			apiData.have_ethical_recruitment_policy || false,
		haveEmployerPaysPolicy: apiData.have_employer_pays_policy || false,
		employerPaysPolicyType: apiData.employer_pays_policy_type || "",
		workerPaysVisaFees: apiData.worker_pays_visa_feess,
		workerPaysWorkPermitFees: apiData.worker_pays_work_permit_fees || false,
		workerPaysMedicalCheckupFee:
			apiData.worker_pays_medical_checkup_fee || false,

		// Recruitment Information
		visaFeePayer: apiData.visa_fee_payer || "employer",
		visaFeeAmount: apiData.visa_fee_amount || 0,
		workPermitFeePayer: apiData.work_permit_fee_payer || "employer",
		workPermitFeeAmount: apiData.work_permit_fee_amount || 0,
		medicalCheckupFeePayer: apiData.medical_checkup_fee_payer || "employer",
		medicalCheckupFeeAmount: apiData.medical_checkup_fee_amount || 0,

		// Notification
		notificationEmail: apiData.email_for_job_announcement || "",

		// Job Translations (convert from API array format)
		jobTranslations: apiData.translations || [],

		// API specific fields
		originCountryCurrency: apiData.origin_country_currency || 5,
		destinationCountryCurrency: apiData.destination_country_currency || 5,
		raCurrency: apiData.ra_currency || 5,
		employerSize: apiData.employer_size || "S",
		openToNationalitiesGenders: apiData.open_to_genders || ["M", "F"],
		recruitmentAgency: apiData.recruitment_agency || 91913,
		employer: apiData.employer || 18136,
	};
};

// Transform form data to API format
const transformToApiFormat = (formData: JobPostingData): any => {
	const apiData: any = {
		origin_country_currency:
			formData.originCountryCurrency || formData.currency || 5,
		destination_country_currency:
			formData.destinationCountryCurrency || formData.currency || 5,
		ra_currency: formData.raCurrency || formData.currency || 5,
		employer_size: formData.employerSize || "S",
		translations: formData.jobTranslations,
		terms_of_payment: formData.termsOfPayment || "Monthly",
		timing_of_payment: formData.timingOfPayment || "Once A Month",
		open_to_genders:
			formData.openToNationalitiesGenders.length > 0
				? formData.openToNationalitiesGenders
				: ["M", "F"],
		open_to_nationalities: formData.openToNationalities || [],
		openToNationalities: formData.openToNationalities || [],
		currency: formData.currency || 1,
		have_ethical_recruitment_policy:
			formData.haveEthicalRecruitmentPolicy || false,
		have_employer_pays_policy: formData.haveEmployerPaysPolicy || false,
		worker_pays_visa_feess: formData.workerPaysVisaFees,
		worker_pays_work_permit_fees: formData.workerPaysWorkPermitFees || false,
		worker_pays_medical_checkup_fee:
			formData.workerPaysMedicalCheckupFee || false,
		hospitalization_insurance: formData.healthInsurance || false,
		is_social_security_maternity_leave_provided:
			formData.socialSecurityBenefits || false,
		recruitment_agency: formData.recruitmentAgency || 91913,
		is_draft: formData.is_draft,
		employer_industry: formData.employerIndustry,
		employer_country: formData.country,
		employer_city: formData.city,
		employer_state: formData.state,

		// Additional form fields aligned with API
		job_title: formData.jobTitle,
		job_position_category: formData.positionCategory,
		job_type: formData.jobType,
		expired_at: formData.expiryDate || new Date().toISOString(),
		number_of_headcount_needed: formData.headcountNeeded,
		contract_duration_months: formData.contractDuration,
		daily_wage_rate: formData.dailyWageRate?.toString(),
		available_shifts: formData.availableShift,
		overtime_expectation: formData.overtimeExpectation,
		day_of_week_off: formData.dayOfWeekOff,
		minimum_working_hours: formData.minimumWorkingHours,

		// Leave benefits
		number_paid_annual_leave: formData.paidAnnualLeave,
		number_paid_sick_leave: formData.paidSickLeave,
		number_paid_business_leave: formData.paidBusinessLeave,
		number_paid_national_holidays: formData.paidNationalHolidays,

		// Selected benefits from API
		benefits: formData.selectedBenefits || [],

		// OT rates
		ot_rate_regular: formData.regularOT?.toString(),
		ot_rate_holiday: formData.holidayOT?.toString(),
		normal_rate_holiday: formData.dayOffRate?.toString(),

		// Accommodation & Policies
		is_accommodation_on_site: formData.accommodationOnSite,
		is_rent_utilites_auto_deducted: formData.rentUtilitiesAutoDeducted,
		family_can_live_together: formData.familyMembersCanLiveTogether,
		safe_grievance_mechanism: formData.safeGrievanceMechanism,
		probation_period: formData.probationPeriod,

		// Notification
		email_for_job_announcement: formData.notificationEmail,

		// Documentation requirements
		passport: formData.requireDocumentation?.includes("Passport") || false,
		open_to_pinkcard_holder:
			formData.requireDocumentation?.includes("Pink Card") || false,
		open_to_workpermit_holder:
			formData.requireDocumentation?.includes("Work Permit") || false,
		open_to_visa_holder: formData.requireDocumentation?.includes("Visa"),
		open_to_cancellationletter_holder:
			formData.requireDocumentation?.includes("Cancellation Letter") || false,
		regular_ot: formData.regularOT,
		day_off_rate: formData.dayOffRate,
		holiday_ot: formData.holidayOT,
		paid_annual_leave: formData.paidAnnualLeave,
		paid_sick_leave: formData.paidSickLeave,
		paid_business_leave: formData.paidBusinessLeave,
		paid_national_holidays: formData.paidNationalHolidays,
		accommodation_provided: formData.accommodationProvided,
		annual_trip: formData.annualTrip,
		health_insurance: formData.healthInsurance,
		hospitalized_insurance: formData.hospitalizedInsurance,
		incentive_for_diligence: formData.incentiveForDiligence,
		life_insurance_cover: formData.lifeInsuranceCover,
		meal_provided: formData.mealProvided,
		monthly_yearly_bonus: formData.monthlyYearlyBonus,
		personal_accident_insurance: formData.personalAccidentInsurance,
		personal_development_training: formData.personalDevelopmentTraining,
		shuttle_bus_provided: formData.shuttleBusProvided,
		accommodation_on_site: formData.accommodationOnSite,
		family_members_can_live_together: formData.familyMembersCanLiveTogether,
		// Recruitment Information
		employer_pays_policy_type: formData.employerPaysPolicyType,
		visa_fee_payer: formData.visaFeePayer,
		visa_fee_amount: formData.visaFeeAmount,
		work_permit_fee_payer: formData.workPermitFeePayer,
		work_permit_fee_amount: formData.workPermitFeeAmount,
		medical_checkup_fee_payer: formData.medicalCheckupFeePayer,
		medical_checkup_fee_amount: formData.medicalCheckupFeeAmount,
		employer: 18136,

		// Job Translations
		job_translations: formData.jobTranslations || [],
		salary: formData.salary,
	};

	// Include ID for editing mode
	if (formData.id) {
		apiData.id = formData.id;
	}

	return apiData;
};

// API Functions
const saveJobPostingDraft = async (formData: JobPostingData): Promise<any> => {
	const apiData = transformToApiFormat(formData);
	return await jobPostingService.saveDraft(apiData);
};

const submitJobPosting = async (formData: JobPostingData): Promise<any> => {
	const apiData = transformToApiFormat(formData);
	return await jobPostingService.submit(apiData);
};

const steps = [
	{ id: 1, title: "Basic Information", component: BasicInformationStep },
	{ id: 2, title: "Job Information", component: JobInformationStep },
	{ id: 3, title: "Translation", component: TranslationStep },
	{ id: 4, title: "Location", component: LocationStep },
	{ id: 5, title: "Contract Information", component: ContractInformationStep },
	{ id: 6, title: "Available Shifts", component: AvailableShiftsStep },
	{
		id: 7,
		title: "Recruitment Information",
		component: RecruitmentInformationStep,
	},
	{ id: 8, title: "Benefits", component: BenefitsStep },
	{ id: 9, title: "Accommodation", component: AccommodationStep },
	{ id: 10, title: "Notification", component: NotificationStep },
];

interface JobPostingFormProps {
	initialData?: JobPostingData;
	mode?: "create" | "edit";
	jobId?: number;
}

export const JobPostingForm = ({
	initialData,
	mode = "create",
	jobId,
}: JobPostingFormProps = {}) => {
	const [currentStep, setCurrentStep] = useState(1);
	const [isLoading, setIsLoading] = useState(false);

	// Use initialData if provided, otherwise use defaults
	const getDefaultFormData = (): JobPostingData => ({
		// Initialize with default values
		id: undefined,
		openToNationalities: [],
		requireDocumentation: [],
		jobTitle: "",
		employerIndustry: "",
		positionCategory: "",
		jobType: "",
		expiryDate: "",
		headcountNeeded: 1,
		contractDuration: 12,
		country: "", // Default country ID
		state: "",
		city: "",
		termsOfPayment: "Monthly",
		timingOfPayment: "Once A Month",
		currency: 1, // Default currency ID
		salary: 0,
		dailyWageRate: 0,
		availableShift: "",
		overtimeExpectation: "",
		dayOfWeekOff: "",
		minimumWorkingHours: 40,
		regularOT: 0,
		dayOffRate: 0,
		holidayOT: 0,
		paidAnnualLeave: 0,
		paidSickLeave: 0,
		paidBusinessLeave: 0,
		paidNationalHolidays: 0,
		socialSecurityBenefits: true,
		selectedBenefits: [],
		accommodationProvided: false,
		annualTrip: false,
		healthInsurance: false,
		hospitalizedInsurance: false,
		incentiveForDiligence: false,
		lifeInsuranceCover: false,
		mealProvided: false,
		monthlyYearlyBonus: false,
		personalAccidentInsurance: false,
		personalDevelopmentTraining: false,
		shuttleBusProvided: false,
		accommodationOnSite: false,
		familyMembersCanLiveTogether: false,
		rentUtilitiesAutoDeducted: false,
		safeGrievanceMechanism: false,
		probationPeriod: false,
		haveEthicalRecruitmentPolicy: true,
		haveEmployerPaysPolicy: true,
		employerPaysPolicyType: "",
		workerPaysVisaFees: null,
		workerPaysWorkPermitFees: false,
		workerPaysMedicalCheckupFee: false,
		visaFeePayer: "employer",
		visaFeeAmount: 0,
		workPermitFeePayer: "employer",
		workPermitFeeAmount: 0,
		medicalCheckupFeePayer: "employer",
		medicalCheckupFeeAmount: 0,
		notificationEmail: "",
		jobTranslations: [],

		// API specific fields with defaults
		originCountryCurrency: 5,
		destinationCountryCurrency: 5,
		raCurrency: 5,
		employerSize: "S",
		openToNationalitiesGenders: ["M", "F"],
		recruitmentAgency: 91913,
		employer: 18136,
	});

	const [formData, setFormData] = useState<JobPostingData>(() => {
		if (initialData) {
			// If initialData is provided (edit mode), transform it from API format to form format
			console.log("Raw API data:", initialData);
			const transformedData = transformFromApiFormat(initialData);
			console.log("Transformed form data:", transformedData);
			return transformedData;
		}
		return getDefaultFormData();
	});

	const updateFormData = (updates: Partial<JobPostingData>) => {
		setFormData((prev) => ({ ...prev, ...updates }));
	};

	const handleNext = () => {
		if (currentStep < steps.length) {
			setCurrentStep(currentStep + 1);
		}
	};

	const handlePrevious = () => {
		if (currentStep > 1) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleStepClick = (stepId: number) => {
		setCurrentStep(stepId);
	};

	const isStepFilled = (stepId: number) => {
		switch (stepId) {
			case 1:
				return formData.openToNationalities?.length > 0;
			case 2:
				return Boolean(
					formData.jobTitle?.trim() &&
						formData.employerIndustry &&
						formData.positionCategory &&
						formData.jobType &&
						formData.expiryDate &&
						formData.headcountNeeded > 0 &&
						formData.contractDuration > 0,
				);
			case 3:
				return (formData.jobTranslations || []).length > 0;
			case 4:
				return Boolean(formData.country && formData.state && formData.city);
			case 5:
				return Boolean(
					formData.termsOfPayment &&
						formData.timingOfPayment &&
						formData.currency > 0 &&
						formData.salary > 0,
				);
			case 6:
				return Boolean(
					formData.availableShift &&
						formData.overtimeExpectation &&
						formData.dayOfWeekOff &&
						formData.minimumWorkingHours > 0,
				);
			case 7:
				return Boolean(
					formData.visaFeePayer &&
						formData.workPermitFeePayer &&
						formData.medicalCheckupFeePayer,
				);
			case 8:
				return (
					formData.paidAnnualLeave >= 0 &&
					formData.paidSickLeave >= 0 &&
					formData.paidBusinessLeave >= 0 &&
					formData.paidNationalHolidays >= 0
				);
			case 9:
				return true;
			case 10:
				return Boolean(formData.notificationEmail?.trim());
			default:
				return false;
		}
	};

	const canClickStep = (targetStepId: number) => {
		if (targetStepId <= currentStep) {
			return true;
		}

		for (let stepId = 1; stepId < targetStepId; stepId++) {
			if (!isStepFilled(stepId)) {
				return false;
			}
		}

		return true;
	};

	const navigate = useNavigate();
	const handleSaveDraft = async () => {
		setIsLoading(true);
		try {
			let result: any;
			if (mode === "edit" && jobId) {
				const apiData = transformToApiFormat({ ...formData, is_draft: true });
				result = await jobPostingService.update(jobId, apiData);
				alert("Draft updated successfully!");
			} else {
				result = await saveJobPostingDraft(formData);
				alert("Draft created successfully!");
			}
			console.log("Draft operation successful:", result);
		} catch (error) {
			console.error("Error with draft operation:", error);
			alert(
				`Error ${mode === "edit" ? "updating" : "saving"} draft. Please try again.`,
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSubmitJobPosting = async () => {
		setIsLoading(true);
		try {
			let result: any;
			if (mode === "edit" && jobId) {
				const apiData = transformToApiFormat({ ...formData, is_draft: false });
				result = await jobPostingService.update(jobId, apiData);
				alert(
					`🎉 Job posting "${formData.jobTitle}" has been updated and submitted successfully!\n\nYou will receive notifications at: ${formData.notificationEmail}`,
				);
				navigate({
					to: "/marketplace/job-posting",
				});
			} else {
				result = await submitJobPosting(formData);
				alert(
					`🎉 Job posting "${formData.jobTitle}" has been submitted successfully!\n\nYou will receive notifications at: ${formData.notificationEmail}`,
				);
			}
			console.log("Job posting operation successful:", result);

			// Optionally redirect to success page or job listings
			// navigate({ to: "/marketplace/job-posting/success" });
			// Or redirect to drafts page to see all job postings
			// navigate({ to: "/marketplace/job-posting/drafts" });
		} catch (error) {
			console.error("Error with job posting operation:", error);
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";
			alert(
				`❌ Error ${mode === "edit" ? "updating" : "submitting"} job posting: ${errorMessage}\n\nPlease check your information and try again.`,
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handlePreview = () => {
		// For now, just log the data - you can implement a preview modal later
		console.log("Preview data:", formData);
		alert("Preview functionality - check console for data");
	};

	const CurrentStepComponent = steps.find(
		(step) => step.id === currentStep,
	)?.component;

	return (
		<div className="bg-white rounded-md shadow-sm">
			<Flex className="min-h-[600px]">
				{/* Left Sidebar - Progress Steps */}
				<Box className="w-80 bg-[#004A60] rounded-l-sm p-6">
					<JobPostingSteps
						canClickStep={canClickStep}
						currentStep={currentStep}
						mode={mode}
						onStepClick={handleStepClick}
						saveDraftButton={
							<CascadeButton
								buttonText={
									isLoading
										? mode === "edit"
											? "Updating..."
											: "Saving..."
										: mode === "edit"
											? "Update Draft"
											: "Save Draft"
								}
								disabled={isLoading}
								handleOnClick={handleSaveDraft}
								size="3"
							/>
						}
						steps={steps}
					/>
				</Box>

				{/* Right Content - Form */}
				<Box className="flex-1 p-8">
					{CurrentStepComponent && (
						<CurrentStepComponent
							data={formData}
							isFirstStep={currentStep === 1}
							isLastStep={currentStep === steps.length}
							isLoading={isLoading}
							onNext={handleNext}
							onPreview={handlePreview}
							onPrevious={handlePrevious}
							onSaveDraft={handleSaveDraft}
							onSubmit={handleSubmitJobPosting}
							updateData={updateFormData}
						/>
					)}
				</Box>
			</Flex>
		</div>
	);
};
