// Dropdown Component Types

export interface GenderOption {
	value: number | string;
	name: string;
}

export interface GenderDropdownProps {
	onSelect: (gender: GenderOption | null) => void;
	defaultValue?: number;
	placeholder?: string;
	className?: string;
	error?: string;
}

export interface IssueCategory {
	id: number;
	name: string;
	description?: string;
}

export interface IssueCategoriesDropdownProps {
	onSelect: (issueCategory: IssueCategory | null) => void;
	defaultValue?: number;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	error?: string;
}

export interface CaseCategoriesDropdownProps {
	value?: number;
	onChange: (value: number) => void;
	placeholder?: string;
	error?: string;
}

export interface NationalitiesDropdownProps {
	value?: number | number[];
	onChange: (value: number | number[]) => void;
	isMulti?: boolean;
	placeholder?: string;
	error?: string;
}

export interface AsyncOption {
	value: number;
	label: string;
}

export interface AdditionalParams {
	[key: string]: any;
}

export interface CaseCallTypeDropdownProps {
	value?: string;
	onChange: (value: string) => void;
	error?: string;
}

export interface IssaraStaffDropdownProps {
	value?: number | number[];
	onChange: (value: number | number[]) => void;
	isMulti?: boolean;
	placeholder?: string;
	error?: string;
}

export interface ClientTypesDropdownProps {
	value?: number;
	onChange: (value: number) => void;
	placeholder?: string;
	error?: string;
}

export interface MockHRStaffDropdownProps {
	value?: string;
	onChange: (value: string) => void;
	error?: string;
}

export interface ReasonsDropdownProps {
	value?: number | number[];
	onChange: (value: number | number[]) => void;
	isMulti?: boolean;
	placeholder?: string;
	error?: string;
}

export interface CaseStatus {
	id: number;
	name: string;
}

export interface CaseStatusesDropdownProps {
	onSelect: (caseStatus: CaseStatus | null) => void;
	defaultValue?: number;
	placeholder?: string;
	className?: string;
	label?: string;
	error?: string;
}

export interface SupplierDropdownProps {
	value?: number | number[];
	onChange: (value: number | number[]) => void;
	isMulti?: boolean;
	placeholder?: string;
	error?: string;
}

export interface OptionType {
	value: string | number;
	label: string;
}

export interface WorkerVoiceChannelDropdownProps {
	value?: string | number;
	onChange: (value: string | number) => void;
	options?: OptionType[];
	error?: string;
}

export interface ReferralActionsDropdownProps {
	value?: number | number[];
	onChange: (value: number | number[]) => void;
	isMulti?: boolean;
	error?: string;
}
