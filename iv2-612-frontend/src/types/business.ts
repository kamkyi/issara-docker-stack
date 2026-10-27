// Business Component Types

export interface CountrySelectProps {
	value?: number;
	onChange: (value: number) => void;
	placeholder?: string;
	error?: string;
}

export interface CountryStatesCitiesSelectProps {
	countryValue?: number;
	stateValue?: number;
	cityValue?: number;
	onCountryChange: (value: number) => void;
	onStateChange: (value: number) => void;
	onCityChange: (value: number) => void;
	errors?: {
		country?: string;
		state?: string;
		city?: string;
	};
}

export interface CountryProvinceDistrictSelectProps {
	countryValue?: number;
	provinceValue?: number;
	districtValue?: number;
	onCountryChange: (value: number) => void;
	onProvinceChange: (value: number) => void;
	onDistrictChange: (value: number) => void;
	errors?: {
		country?: string;
		province?: string;
		district?: string;
	};
}

export interface IndustriesSubindustriesProps {
	industryValue?: number;
	subindustryValue?: number;
	onIndustryChange: (value: number) => void;
	onSubindustryChange: (value: number) => void;
	errors?: {
		industry?: string;
		subindustry?: string;
	};
}

export interface InProps {
	value?: any;
	onChange: (value: any) => void;
	options?: Array<{ value: string | number; label: string }>;
}

export interface IndustriesSubIndustriesDropdownProps {
	value?: {
		industry?: number;
		subindustry?: number;
	};
	onChange: (value: { industry?: number; subindustry?: number }) => void;
}

export interface MultiSelectProps {
	options: Array<{ value: string | number; label: string }>;
	value: Array<string | number>;
	onChange: (value: Array<string | number>) => void;
	placeholder?: string;
	label?: string;
}

export interface Item {
	id: number | string;
	name: string;
}

export interface MuiMultiSelectDropdownProps<T extends Item> {
	items: T[];
	selectedItems: T[];
	onChange: (items: T[]) => void;
	label: string;
	placeholder?: string;
	error?: string;
}

export interface ItemProps {
	key: string;
	[key: string]: any;
}
