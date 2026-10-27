// Marketplace/Job Posting Component Types

export interface Step {
	id: number;
	title: string;
	completed: boolean;
}

export interface JobPostingStepsProps {
	steps: Step[];
	currentStep: number;
	onStepClick?: (stepId: number) => void;
}

export interface FormStepNavigationProps {
	currentStep: number;
	totalSteps: number;
	onNext: () => void;
	onPrevious: () => void;
	onSave?: () => void;
	isLastStep?: boolean;
	isFirstStep?: boolean;
	nextDisabled?: boolean;
}

export interface ApiJobPostingData {
	id?: number;
	title: string;
	description: string;
	company_id?: number;
	[key: string]: any;
}

export interface JobPostingData {
	// Basic Information
	jobTitle: string;
	numberOfPositions: number;
	employmentType: string;
	jobCategory: string;

	// Job Information
	jobDescription: string;
	requirements: string;
	responsibilities: string;

	// Location
	country: number;
	state?: number;
	city?: number;
	address?: string;

	// Contract Information
	contractDuration?: number;
	contractType: string;
	salary?: {
		min: number;
		max: number;
		currency: string;
	};

	// Benefits
	benefits?: string[];

	// Accommodation
	accommodationProvided: boolean;
	accommodationDetails?: string;

	// Recruitment Information
	recruitmentAgency?: number;
	applicationDeadline: string;

	// Available Shifts
	shifts?: Array<{
		day: string;
		startTime: string;
		endTime: string;
	}>;

	// Translation
	translations?: {
		[lang: string]: {
			jobTitle?: string;
			jobDescription?: string;
			requirements?: string;
		};
	};

	// Notifications
	notifyApplicants: boolean;
}

export interface JobPostingFormProps {
	initialData?: Partial<JobPostingData>;
	onSubmit: (data: JobPostingData) => void;
	onCancel?: () => void;
}

export interface BasicInformationStepProps {
	data: Partial<JobPostingData>;
	onChange: (data: Partial<JobPostingData>) => void;
	errors?: { [key: string]: string };
}

export interface JobInformationStepProps {
	data: Partial<JobPostingData>;
	onChange: (data: Partial<JobPostingData>) => void;
	errors?: { [key: string]: string };
}

export interface LocationStepProps {
	data: Partial<JobPostingData>;
	onChange: (data: Partial<JobPostingData>) => void;
	errors?: { [key: string]: string };
}

export interface ContractInformationStepProps {
	data: Partial<JobPostingData>;
	onChange: (data: Partial<JobPostingData>) => void;
	errors?: { [key: string]: string };
}

export interface BenefitsStepProps {
	data: Partial<JobPostingData>;
	onChange: (data: Partial<JobPostingData>) => void;
	errors?: { [key: string]: string };
}

export interface AccommodationStepProps {
	data: Partial<JobPostingData>;
	onChange: (data: Partial<JobPostingData>) => void;
	errors?: { [key: string]: string };
}

export interface RecruitmentInformationStepProps {
	data: Partial<JobPostingData>;
	onChange: (data: Partial<JobPostingData>) => void;
	errors?: { [key: string]: string };
}

export interface AvailableShiftsStepProps {
	data: Partial<JobPostingData>;
	onChange: (data: Partial<JobPostingData>) => void;
	errors?: { [key: string]: string };
}

export interface TranslationStepProps {
	data: Partial<JobPostingData>;
	onChange: (data: Partial<JobPostingData>) => void;
	errors?: { [key: string]: string };
}

export interface NotificationStepProps {
	data: Partial<JobPostingData>;
	onChange: (data: Partial<JobPostingData>) => void;
	errors?: { [key: string]: string };
}
