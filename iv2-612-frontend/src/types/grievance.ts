// Grievance Component Types

export interface GrievanceData {
	// Introduction
	caseNumber?: string;
	reportDate: string;
	reportedBy: string;

	// Information Collection
	workerName?: string;
	workerGender?: string;
	workerNationality?: number;
	contactInformation?: string;
	issueCategory?: number[];
	issueDescription: string;
	evidenceDocuments?: string[];

	// Ethical Investigation
	investigationDate?: string;
	investigator?: number;
	investigationNotes?: string;

	// Communication with Workers
	communicationMethod?: string;
	communicationDate?: string;
	communicationNotes?: string;

	// Safeguarding Affected Workers
	safeguardingMeasures?: string[];
	safeguardingNotes?: string;

	// Monitoring and Communication
	monitoringSchedule?: string;
	followUpDates?: string[];

	// Trainings
	trainingProvided?: boolean;
	trainingDetails?: string;

	// Additional fields
	status?: string;
	assignedTo?: number;
	priority?: "low" | "medium" | "high";
	supplierId?: number;
}

export interface GrievanceComponentProps {
	grievanceId?: number;
	initialData?: Partial<GrievanceData>;
	onSubmit: (data: GrievanceData) => void;
	onCancel?: () => void;
}

export interface GrievanceFormProps {
	onSubmit: (data: GrievanceData) => void;
	initialData?: Partial<GrievanceData>;
	readOnly?: boolean;
}

export type IntroductionProps = Record<string, never>;

export interface PrevTextDataComponentProps {
	text: string;
	title?: string;
}

export interface InformationCollectionProps {
	data: Partial<GrievanceData>;
	onChange: (data: Partial<GrievanceData>) => void;
	errors?: { [key: string]: string };
}

export interface EnsuringAnEthicalInvestigationProps {
	data: Partial<GrievanceData>;
	onChange: (data: Partial<GrievanceData>) => void;
	errors?: { [key: string]: string };
}

export interface CommunicatingWithTheWorkersProps {
	data: Partial<GrievanceData>;
	onChange: (data: Partial<GrievanceData>) => void;
	errors?: { [key: string]: string };
}

export interface SafeguardingAffectedWorkersProps {
	data: Partial<GrievanceData>;
	onChange: (data: Partial<GrievanceData>) => void;
	errors?: { [key: string]: string };
}

export interface MonitoringAndCommunicationProps {
	data: Partial<GrievanceData>;
	onChange: (data: Partial<GrievanceData>) => void;
	errors?: { [key: string]: string };
}

export interface TrainingsProps {
	data: Partial<GrievanceData>;
	onChange: (data: Partial<GrievanceData>) => void;
	errors?: { [key: string]: string };
}

export interface SummaryComponentProps {
	data: GrievanceData;
	onEdit?: () => void;
}

export interface PreviewGrievanceProps {
	data: GrievanceData;
	onClose: () => void;
}
