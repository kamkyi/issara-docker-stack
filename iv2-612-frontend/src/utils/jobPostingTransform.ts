import type { JobPostingData } from "$src/components/marketplace/JobPostingForm";

// Transform API data to form data format
export const transformApiToFormData = (
	apiData: any,
	defaultData: JobPostingData,
): JobPostingData => {
	return {
		...defaultData,
		// Basic Information
		openToNationalities:
			apiData.open_to_nationalities || defaultData.openToNationalities,
		requireDocumentation:
			apiData.require_documentation || defaultData.requireDocumentation,

		// Job Information
		jobTitle: apiData.job_title || defaultData.jobTitle,
		employerIndustry: apiData.employer_industry || defaultData.employerIndustry,
		positionCategory:
			apiData.job_position_category || defaultData.positionCategory,
		jobType: apiData.job_type || defaultData.jobType,
		expiryDate: apiData.expired_at
			? apiData.expired_at
			: defaultData.expiryDate,
		headcountNeeded:
			apiData.number_of_headcount_needed || defaultData.headcountNeeded,
		contractDuration:
			apiData.contract_duration_months || defaultData.contractDuration,

		// Location
		country: apiData.employer_country || defaultData.country,
		state: apiData.employer_state || defaultData.state,
		city: apiData.employer_city || defaultData.city,

		// Contract Information
		termsOfPayment: apiData.terms_of_payment || defaultData.termsOfPayment,
		timingOfPayment: apiData.timing_of_payment || defaultData.timingOfPayment,
		currency: apiData.currency || defaultData.currency,
		salary: parseFloat(apiData.salary) || defaultData.salary,

		// Translation
		jobTranslations: apiData.translations || defaultData.jobTranslations,

		// Available Shifts
		availableShift: apiData.available_shifts || defaultData.availableShift,
		overtimeExpectation:
			apiData.overtime_expectation || defaultData.overtimeExpectation,
		dayOfWeekOff: apiData.day_of_week_off || defaultData.dayOfWeekOff,
		minimumWorkingHours:
			apiData.minimum_working_hours || defaultData.minimumWorkingHours,
		regularOT: parseFloat(apiData.ot_rate_regular) || defaultData.regularOT,
		dayOffRate:
			parseFloat(apiData.normal_rate_holiday) || defaultData.dayOffRate,
		holidayOT: parseFloat(apiData.ot_rate_holiday) || defaultData.holidayOT,

		// Benefits
		paidAnnualLeave:
			apiData.number_paid_annual_leave || defaultData.paidAnnualLeave,
		paidSickLeave: apiData.number_paid_sick_leave || defaultData.paidSickLeave,
		paidBusinessLeave:
			apiData.number_paid_business_leave || defaultData.paidBusinessLeave,
		paidNationalHolidays:
			apiData.number_paid_national_holidays || defaultData.paidNationalHolidays,
		socialSecurityBenefits:
			apiData.is_social_security_maternity_leave_provided ??
			defaultData.socialSecurityBenefits,
		selectedBenefits: apiData.benefits || defaultData.selectedBenefits,

		// Accommodation
		accommodationOnSite:
			apiData.is_accommodation_on_site ?? defaultData.accommodationOnSite,
		familyMembersCanLiveTogether:
			apiData.family_can_live_together ??
			defaultData.familyMembersCanLiveTogether,
		rentUtilitiesAutoDeducted:
			apiData.is_rent_utilites_auto_deducted ??
			defaultData.rentUtilitiesAutoDeducted,
		safeGrievanceMechanism:
			apiData.safe_grievance_mechanism ?? defaultData.safeGrievanceMechanism,
		probationPeriod: apiData.probation_period ?? defaultData.probationPeriod,

		// Notification
		notificationEmail:
			apiData.email_for_job_announcement || defaultData.notificationEmail,

		// Recruitment Information
		haveEthicalRecruitmentPolicy:
			apiData.have_ethical_recruitment_policy ??
			defaultData.haveEthicalRecruitmentPolicy,
		haveEmployerPaysPolicy:
			apiData.have_employer_pays_policy ?? defaultData.haveEmployerPaysPolicy,
		employerPaysPolicyType:
			apiData.employer_pays_policy_type || defaultData.employerPaysPolicyType,
		workerPaysVisaFees:
			apiData.worker_pays_visa_fees ?? defaultData.workerPaysVisaFees,
		workerPaysWorkPermitFees:
			apiData.worker_pays_work_permit_fees ??
			defaultData.workerPaysWorkPermitFees,
		workerPaysMedicalCheckupFee:
			apiData.worker_pays_medical_checkup_fees ??
			defaultData.workerPaysMedicalCheckupFee,
		visaFeePayer: apiData.visa_fee_payer || defaultData.visaFeePayer,
		visaFeeAmount:
			parseFloat(apiData.worker_pays_visa_fees_amount) ||
			defaultData.visaFeeAmount,
		workPermitFeePayer:
			apiData.work_permit_fee_payer || defaultData.workPermitFeePayer,
		workPermitFeeAmount:
			parseFloat(apiData.worker_pays_work_permit_fees_amount) ||
			defaultData.workPermitFeeAmount,
		medicalCheckupFeePayer:
			apiData.medical_checkup_fee_payer || defaultData.medicalCheckupFeePayer,
		medicalCheckupFeeAmount:
			parseFloat(apiData.worker_pays_medical_checkup_fees_amount) ||
			defaultData.medicalCheckupFeeAmount,
	};
};
