// Labor and Recruitment Component Types

export interface RemediationData {
	category: string;
	before: number;
	after: number;
	improvement: number;
}

export interface OurImpactSectionProps {
	remediationData: RemediationData[];
	totalCases: number;
	successRate: number;
}

export interface WorkerTestimonial {
	id: number;
	name: string;
	nationality: string;
	testimonial: string;
	image?: string;
	date?: string;
}

export interface WorkerVoicesSectionProps {
	testimonials: WorkerTestimonial[];
	title?: string;
}

export interface ProcessOfChangeProps {
	steps: Array<{
		id: number;
		title: string;
		description: string;
		icon?: React.ReactNode;
	}>;
}

export interface StatCard {
	label: string;
	value: number | string;
	icon?: React.ReactNode;
	trend?: {
		value: number;
		direction: "up" | "down";
	};
}

export interface CategoryStats {
	category: string;
	total: number;
	resolved: number;
	pending: number;
	percentage: number;
}

export interface CategoryCard {
	id: number;
	title: string;
	description: string;
	icon: React.ReactNode;
	stats: CategoryStats;
}

export interface LaborLandingPageProps {
	stats: StatCard[];
	categories: CategoryCard[];
}

export interface RecruitmentLandingPageProps {
	stats: StatCard[];
	categories: CategoryCard[];
}
