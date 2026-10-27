// Modal Component Types

export interface CommentType {
	id: number;
	author: string;
	content: string;
	timestamp: string;
	avatar?: string;
}

export interface SuccessModalProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	message: string;
	actionLabel?: string;
	onAction?: () => void;
}

export interface AlertModalProps {
	isOpen?: boolean;
	onClose?: () => void;
	title: string;
	message: string;
	type?: "info" | "warning" | "error" | "success";
	confirmText?: string;
	cancelText?: string;
	onConfirm?: () => void;
}

export interface AnnouncementData {
	id: number;
	title: string;
	content: string;
	date: string;
	author?: string;
}

export interface AnnouncementModalProps {
	isOpen: boolean;
	onClose: () => void;
	announcement?: AnnouncementData;
	onSubmit: (data: AnnouncementData) => void;
}

export interface Message {
	id: number;
	author: string;
	content: string;
	timestamp: string;
	attachments?: Array<{
		name: string;
		url: string;
		type: string;
	}>;
	reactions?: Array<{
		emoji: string;
		count: number;
		users: string[];
	}>;
}

export interface AnnouncementDetailModalProps {
	isOpen: boolean;
	onClose: () => void;
	announcement: Message;
}

export interface CommentModalProps {
	isOpen: boolean;
	onClose: () => void;
	postId: number | string;
	comments?: CommentType[];
	onSubmitComment: (comment: string) => void;
}

export interface FeedbackTypeOptionModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSelect: (type: string) => void;
}

export interface Review {
	id: number;
	author: string;
	rating: number;
	comment: string;
	images?: string[];
	date: string;
}

export interface ImageViewAllProps {
	images: string[];
	isOpen: boolean;
	onClose: () => void;
	initialIndex?: number;
}

export interface PreviewAllFieldsModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit?: () => void;
	data: {
		[key: string]: any;
	};
	summary?: {
		caseId: number;
		dateReceived: string;
		issueCategories: string;
		affectedWorkers: string;
		currentStatus: string;
		issueDescription: string;
	};
	title?: string;
}

export interface ResponsibleProcurementProps {
	isOpen: boolean;
	onClose: () => void;
	data?: {
		policies: Array<{
			name: string;
			status: string;
		}>;
	};
}

export interface CertificateModalProps {
	isOpen: boolean;
	onClose: () => void;
	certificate: {
		name: string;
		issuer: string;
		date: string;
		validUntil?: string;
		image?: string;
	};
}

export interface CreatePollStepperModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (pollData: any) => void;
}

export interface PollDetailModalProps {
	isOpen: boolean;
	onClose: () => void;
	pollId: number | string;
}

export interface PreviewGrievanceModalProps {
	isOpen: boolean;
	onClose: () => void;
	grievanceData: any;
}

// Poll Steps Types
export interface PollFormData {
	title: string;
	description: string;
	questionType: "multiple_choice" | "rating" | "text" | "yes_no";
	options?: string[];
	targetGroup: {
		suppliers?: number[];
		nationalities?: number[];
		genders?: string[];
	};
	startDate: string;
	endDate: string;
	anonymous: boolean;
}

export interface StepProps {
	formData: PollFormData;
	updateFormData: (data: Partial<PollFormData>) => void;
	errors?: { [key: string]: string };
}

export interface BasicInfoStepProps extends StepProps {}

export interface QuestionStepProps extends StepProps {}

export interface TargetGroupStepProps extends StepProps {}

export interface ReviewStepProps extends StepProps {}

export interface MultiSelectProps {
	options: Array<{ value: string | number; label: string }>;
	value: Array<string | number>;
	onChange: (value: Array<string | number>) => void;
	placeholder?: string;
}
