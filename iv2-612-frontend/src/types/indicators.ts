// Indicator Component Types

export interface ScoreCardProps {
	score: number;
	maxScore?: number;
	label: string;
	icon?: React.ReactNode;
	color?: string;
}

export interface StatusBadgeProps {
	status: "not-initiated" | "partial progress" | "completed" | string;
	label: string;
	className?: string;
	variant?: "success" | "warning" | "error" | "info" | "default";
}

export interface RatingStarsProps {
	rating: number;
	maxRating?: number;
	size?: "small" | "medium" | "large";
	readonly?: boolean;
	onRatingChange?: (rating: number) => void;
}

export interface ScoreChartProps {
	score: number;
	maxScore: number;
	label?: string;
	color?: string;
	showPercentage?: boolean;
}

export interface SpeedometerProps {
	value: number;
	min?: number;
	max?: number;
	label?: string;
}

export interface ProgressDashboardProps {
	title?: string;
	data: Array<{
		category: string;
		progress: number;
		target: number;
	}>;
}

export interface HumanRightsSlide {
	title: string;
	description: string;
	image?: string;
	stats?: Array<{
		label: string;
		value: number | string;
	}>;
}

export interface HumanRightsOverviewProps {
	slides: HumanRightsSlide[];
	autoplay?: boolean;
	interval?: number;
}

export interface WorkerVoiceOverviewProps {
	data: {
		totalFeedback: number;
		categories: Array<{
			name: string;
			count: number;
		}>;
	};
}

export interface SuppliersModalProps {
	isOpen: boolean;
	onClose: () => void;
	suppliers: Array<{
		id: number;
		name: string;
		status: string;
	}>;
}

export type KpiCategoryData = {
	categoryName: string;
	score: number;
	maxScore: number;
};

export type KpiCategoryChartProps = {
	data: KpiCategoryData[];
	title?: string;
};

export interface SegmentData {
	label: string;
	value: number;
	color: string;
	percentage: number;
	count: number;
}

export interface ImpactIndicatorProps {
	segments: SegmentData[];
	title: string;
	subtitle?: string;
	totalLabel?: string;
}

export interface ImpactIndicator5Props {
	data: {
		categories: Array<{
			name: string;
			value: number;
		}>;
		total: number;
	};
}

export interface BarSegment {
	label: string;
	value: number;
	color: string;
	percentage: number;
	count: number;
}

export interface WorkerVoiceIndicatorProps {
	segments: BarSegment[];
	title: string;
	totalLabel?: string;
}

export type DataPoint = {
	month: string;
	opened: number;
	closed: number;
	remediated: number;
	pending: number;
};

export type TimelinessRemediationChartProps = {
	data: DataPoint[];
	title?: string;
};

export type ShapeProps = {
	cx?: number;
	cy?: number;
	fill?: string;
	payload?: any;
	value?: number;
};

export interface ImpactChartsProps {
	data: {
		timelineData: DataPoint[];
		categoryData: Array<{
			category: string;
			count: number;
		}>;
	};
	title?: string;
}

export interface PolicyItem {
	name: string;
	reviewed: boolean;
	date?: string;
}

export interface PolicyReviewIndicatorProps {
	policies: PolicyItem[];
	title?: string;
}

export interface SupplierKPITimelineChartProps {
	supplierId: number;
	title?: string;
	height?: number;
}

export interface SupplierKpisApexTimelineProps {
	supplierId: number;
	kpiId?: number;
	height?: number;
}

export interface ProgressIndicatorDashboardProps {
	title: string;
	categories: Array<{
		name: string;
		progress: number;
		image?: string;
	}>;
}

export interface LaborRecruitmentSectionProps {
	data: {
		stats: Array<{
			label: string;
			value: number | string;
		}>;
	};
}

export interface WorkingConditionsSectionProps {
	data: {
		conditions: Array<{
			category: string;
			rating: number;
		}>;
	};
}
