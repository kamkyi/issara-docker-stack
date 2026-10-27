// Chart Component Types

export interface BarChartProps {
	data: Array<{ label: string; company: number; benchmark: number }>;
	companyLabel?: string;
	benchmarkLabel?: string;
	title?: string;
}

export interface MiniBarChartProps {
	data: Array<{ label: string; value: number }>;
	color?: string;
	height?: number;
}

export interface DoughnutChartProps {
	data?: Array<{
		name: string;
		value: number;
		color?: string;
	}>;
	title?: string;
	subtitle?: string;
}

export interface DonutSegment {
	label: string;
	value: number;
	color: string;
	percentage?: number;
}

export interface DonutChartProps {
	segments: DonutSegment[];
	centerText?: string;
	size?: number;
}

export interface ProgressBarChartProps {
	percentage: number;
	label?: string;
	color?: string;
	showPercentage?: boolean;
}

export interface CircularProgressChartProps {
	percentage: number;
	size?: number;
	strokeWidth?: number;
	color?: string;
}

export interface LineChartProps {
	data: Array<{
		date: string;
		value: number;
	}>;
	title?: string;
	color?: string;
}

export interface StackedBarData {
	name: string;
	[key: string]: string | number;
}

export interface HorizontalStackedBarProps {
	data: StackedBarData[];
	keys: string[];
	colors?: string[];
	height?: number;
}

export interface VerticalStackedBarData {
	name: string;
	[key: string]: string | number;
}

export interface DataKey {
	key: string;
	color: string;
	label?: string;
}

export interface VerticalStackedBarChartProps {
	data: VerticalStackedBarData[];
	dataKeys: DataKey[];
	height?: number;
	title?: string;
}

export interface NationalityData {
	nationality: string;
	male: number;
	female: number;
	other?: number;
}

export interface NationalityRadialChartProps {
	data: NationalityData[];
	title?: string;
}

export interface GenderRadarChartProps {
	data: Array<{
		subject: string;
		male: number;
		female: number;
		other?: number;
	}>;
	title?: string;
}

export interface ButterflyBarChartProps {
	data: Array<{
		category: string;
		male: number;
		female: number;
	}>;
	title?: string;
	colors?: {
		male: string;
		female: string;
	};
}

export interface HorizontalParallelBarChartProps {
	data: Array<{
		label: string;
		values: number[];
	}>;
	categories: string[];
	colors?: string[];
}

export interface ProgressIndicaterChartProps {
	value: number;
	max: number;
	label?: string;
	color?: string;
}

export type RadarDataPoint = {
	category: string;
	value: number;
	fullMark: number;
};

export type RadarChartProps = {
	data: RadarDataPoint[];
	title?: string;
	color?: string;
};
