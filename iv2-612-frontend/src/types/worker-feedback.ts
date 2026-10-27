// Worker Feedback Form Component Types

export interface FormDataType {
	// Personal Information
	workerName?: string;
	workerAge?: number;
	workerGender?: string;
	workerNationality?: number;
	contactNumber?: string;

	// Employment Information
	currentEmployer?: string;
	jobPosition?: string;
	employmentDuration?: string;

	// Feedback Information
	feedbackType: string;
	feedbackCategory?: number[];
	feedbackDescription: string;

	// Additional Information
	anonymousSubmission: boolean;
	attachments?: string[];

	// Consent
	consentGiven: boolean;
}

export interface StepProps {
	data: FormDataType;
	updateData: (data: Partial<FormDataType>) => void;
	errors?: { [key: string]: string };
}

export interface StepperProps {
	steps: Array<{
		id: number;
		label: string;
		completed: boolean;
	}>;
	activeStep: number;
	onStepClick?: (step: number) => void;
}

export interface StepperFormProps {
	onSubmit: (data: FormDataType) => void;
	initialData?: Partial<FormDataType>;
	onCancel?: () => void;
}

export interface FormStepsProps {
	currentStep: number;
	data: FormDataType;
	updateData: (data: Partial<FormDataType>) => void;
	errors?: { [key: string]: string };
}
