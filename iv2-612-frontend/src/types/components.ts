// Component Props Types - organized by feature area

// UI Components
export interface InputFieldProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
}

export interface LoadingSpinnerProps {
	size?: "small" | "medium" | "large";
	color?: string;
}

export interface SearchBoxProps {
	onSearch?: (query: string) => void;
	placeholder?: string;
	debounceMs?: number;
	value?: string;
}

// Button Components
export interface CascadeButtonType {
	text: string;
	onClick: () => void;
	className?: string;
	disabled?: boolean;
}

export type ViewMode = "grid" | "list";

export interface ViewOption {
	mode: ViewMode;
	icon: React.ReactNode;
	label: string;
	ariaLabel: string;
}

export interface GroupTabButtonProps {
	options: ViewOption[];
	selectedMode: ViewMode;
	onModeChange: (mode: ViewMode) => void;
}

// Checkbox Components
export interface CasCheckboxProps {
	label: string;
	checked: boolean;
	handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	disabled?: boolean;
}

// Upload Components
export interface UploadAreaProps {
	onUpload: (files: File[]) => void;
	accept?: string;
	multiple?: boolean;
	maxSize?: number;
}

// Selector Components
export interface SelectorProps {
	options: Array<{ value: string | number; label: string }>;
	value?: string | number;
	onChange: (value: string | number) => void;
	placeholder?: string;
	fullWidth?: boolean;
}

export interface KPICategory {
	id: number;
	name: string;
	description?: string;
	issue_category?: number;
}

export interface KPI {
	id: number;
	description: string;
	level: string | number;
	goal: string;
	kpi_category: {
		id: number;
		name: string;
	};
	eti_base_code?: {
		id: number;
		name: string;
		code: string;
		description: string;
		sub_code: string;
		sub_description: string;
		created: string;
		last_modified: string;
	};
	kpi_legal_violation?: Record<string, unknown>;
	kpi_systems_change?: Record<string, unknown>;
	// ILO forced-labor / LkSG indicator tags nested by the cascade-api /kpi
	// endpoint (kpiService.getKpis).
	ilo_indicators?: Array<{
		id: number;
		name: string;
		description?: string | null;
	}>;
	lksg_indicators?: Array<{
		id: number;
		name: string;
		description?: string | null;
	}>;
}

export interface KPISelectorProps {
	onSelectKpi: (categoryId: number, kpiId: number) => void;
	onSelectIssueCategory: (categoryId: number) => void;
	selectedKpis: Record<number, number[]>;
	issueCategory?: number;
	displayOnlyMode?: boolean;
}

// Breadcrumb Components
export interface BreadcrumbProps {
	items: Array<{
		label: string;
		href?: string;
	}>;
}

// Footer Components
export interface FooterProps {
	className?: string;
}

// Toast Components
export type ToastOptions = {
	type?: "success" | "error" | "info" | "warning";
	duration?: number;
	position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
};

export interface ToastProviderProps {
	children: React.ReactNode;
}

// Theme Components
export interface ThemeSwitcherProps {
	className?: string;
}

// Emoji Rating Components
export interface EmojiRatingProps {
	rating: number;
	onRatingChange?: (rating: number) => void;
	readonly?: boolean;
	size?: "small" | "medium" | "large";
}

// Reaction Components
export interface ReactionButtonGroupProps {
	reactions: Array<{
		type: string;
		count: number;
		icon: React.ReactNode;
	}>;
	onReaction: (type: string) => void;
	selectedReaction?: string;
}

// Auth Components
export interface AuthGuardProps {
	children: React.ReactNode;
	allowedGroups?: string[];
	fallback?: React.ReactNode;
	requireAuth?: boolean;
}

export interface UnauthorizedAccessProps {
	message?: string;
	redirectTo?: string;
}

export interface AuthState {
	isAuthenticated: boolean;
	user: any;
	isLoading: boolean;
}
