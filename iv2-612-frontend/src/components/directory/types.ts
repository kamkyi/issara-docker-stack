export interface CompanyAddressContact {
	email: string | null;
	phone_number: string | null;
	translation: {
		first_name: string | null;
		last_name: string | null;
		position: string | null;
	};
}

export interface CompanyAddress {
	id: number;
	country_id: string | null;
	state_id: string | null;
	city_id: string | null;
	street: string | null;
	zip: string | null;
	contacts: CompanyAddressContact[];
	language: string | null;
}

export interface Company {
	user: number;
	epp_policy: boolean;
	id: number;
	logo: string | null;
	type: string | null;
	date_joined: string | null;
	name_en: string | null;
	addresses: CompanyAddress[];
	name: string | null;
	description: string | null;
	rating_score: number | null;
	rating_count: number | null;
	comments_count: number | null;
	user_ratings: any[]; // replace with your UserRating type if available
	gd_id: number | null;
	main_contact_name: string | null;
	contact_phone_number: string | null;
	date_of_registration: string | null;
	cambodia_recruiter_registration_year: string | null;
	license_number: string | null;
	license_valid_date: string | null;
	thai_license_number: string | null;
	thai_license_valid_date: string | null;
	status: string | null;
	status_from_date: string | null;
	status_to_date: string | null;
	website: string | null;
	email: string | null;
	phone_numbers: string | null;
	facebook: string | null;
	viber: string | null;
	line: string | null;
	latitude: number | null;
	longitude: number | null;
	updated_at: string | null;
	sending_countries: string[]; // ISO country codes
	certificate: string | null;
	// Additional recruiter profile fields
	industries?: number[];
	sub_industries?: number[];
	other_industries?: string;
	destination_countries?: Array<{ id: number; name: string }>;
	destination_country_ids?: number[];
	destination_province_ids?: number[];
	destination_district_ids?: number[];
	contacts?: CompanyAddressContact[];
	logoData?: string;
	epp_policy_date?: string;
	on_the_level_cert?: boolean;
	on_the_level_date?: string;
	rba_cert?: boolean;
	rba_cert_date?: string;
}

export interface Filters {
	status?: "All" | "Operational" | "Processing" | "Permanently Blacklisted";
	managedBy?: "All" | "User" | "Issara";
	operationalCountry: string;
	sendingCountry: string;
	eppPolicy?: boolean | null;
	sortByScore?: string;
	search: string;
}

export interface DirectoryProps {
	companies: Company[];
}

export enum CompanyStatus {
	Operational = "Operational",
	TemporarilySuspended = "Temporarily Suspended",
	PermanentlyBlacklisted = "Permanently Blacklisted",
	LicenseIsNotExtended = "License is not extended",
	Processing = "Processing",
	// Add any other status types here if they exist
}

export interface CompanyStatusDisplayProps {
	status: CompanyStatus | string; // Use ENUM type, but allow string for flexibility/safety
	statusFromDate?: string | null; // Optional from date
	statusToDate?: string | null; // Optional to date
	// Removed context prop
}

export interface OptionType {
	value: string;
	label: string;
}

export enum DashboardFeaturesSection {
	EthicalPerformanceScore = "Cascade Index (CI)",
	CascadingEthicsIndex = "Cascade Index (CI) Score",
	CompanyDashboard = "Company Dashboard",
	CompanyProfile = "Company Profile",
	BusinessDirectories = "Business Directories",
	EmployeeRelations = "Employee Relations",
	ResponsibleProcurement = "ResponsibleProcurement",
	EthicalSupplyChainDesigner = "Ethical Supply Chain Designer",
}

export interface SlideData {
	id: number;
	category: string;
	content: string;
	image?: string;
	color?: string;
	q1: number;
	q2: number;
}

export enum SortBy {
	"-rating_score" = "Rating: Highest",
	rating_score = "Rating: Lowest",
	"-popularity" = "Popularity",
}
