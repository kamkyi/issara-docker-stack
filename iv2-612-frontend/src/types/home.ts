// Home Page Component Types

export interface CTASectionProps {
	title: string;
	description: string;
	primaryAction?: {
		label: string;
		onClick: () => void;
	};
	secondaryAction?: {
		label: string;
		onClick: () => void;
	};
}

export interface CasesByCategoryProps {
	data: Array<{
		category: string;
		count: number;
		trend?: "up" | "down" | "stable";
	}>;
}

export interface FeaturesSectionProps {
	features: Array<{
		id: number;
		title: string;
		description: string;
		icon: React.ReactNode;
	}>;
}

export interface HeroCarouselProps {
	slides: Array<{
		id: number;
		title: string;
		description: string;
		image: string;
		action?: {
			label: string;
			link: string;
		};
	}>;
	autoplay?: boolean;
	interval?: number;
}

export interface ThumbnailGridProps {
	items: Array<{
		id: number;
		title: string;
		thumbnail: string;
		description?: string;
		onClick?: () => void;
	}>;
	columns?: number;
}

export interface IntroVideoProps {
	videoUrl: string;
	title?: string;
	description?: string;
	thumbnail?: string;
}

export interface FrequentlyAskedQuestionsProps {
	faqs: Array<{
		id: number;
		question: string;
		answer: string;
	}>;
}

export interface TestimonialsSectionProps {
	testimonials: Array<{
		id: number;
		author: string;
		role?: string;
		company?: string;
		content: string;
		avatar?: string;
		rating?: number;
	}>;
	autoplay?: boolean;
}

export interface FilterCardProps {
	filters: {
		[key: string]: Array<{
			value: string;
			label: string;
			count?: number;
		}>;
	};
	selectedFilters: { [key: string]: string[] };
	onFilterChange: (category: string, value: string) => void;
}

export interface StatsSectionProps {
	stats: Array<{
		label: string;
		value: number | string;
		icon?: React.ReactNode;
		trend?: {
			value: number;
			direction: "up" | "down";
		};
	}>;
}

export interface ServicesSectionProps {
	services: Array<{
		id: number;
		title: string;
		description: string;
		icon: React.ReactNode;
		link?: string;
	}>;
}

export interface WorkerViolationsSectionProps {
	data: {
		total: number;
		byCategory: Array<{
			category: string;
			count: number;
			percentage: number;
		}>;
	};
}

export interface OverallCardsProps {
	cards: Array<{
		id: number;
		title: string;
		value: number | string;
		icon?: React.ReactNode;
		trend?: {
			value: number;
			direction: "up" | "down";
		};
	}>;
}

export interface LatestUpdatesProps {
	updates: Array<{
		id: number;
		title: string;
		date: string;
		excerpt?: string;
		image?: string;
		category?: string;
	}>;
	onUpdateClick?: (updateId: number) => void;
}

export interface OurPartnerSectionProps {
	partners: Array<{
		id: number;
		name: string;
		logo: string;
		website?: string;
	}>;
}

export interface AutoSlideDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	content: React.ReactNode;
	position?: "left" | "right";
	width?: string;
}

export interface CardCarouselProps {
	cards: Array<{
		id: number;
		content: React.ReactNode;
	}>;
	autoplay?: boolean;
	interval?: number;
}
