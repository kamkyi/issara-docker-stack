// Carousel Component Types

export interface GridCardProps {
	title: string;
	description?: string;
	image?: string;
	onClick?: () => void;
}

export interface QuarterlyCEICardProps {
	quarter: string;
	year: number;
	data: {
		cei: number;
		trend: "up" | "down" | "stable";
		highlights: string[];
	};
}

export interface Review {
	id: number;
	author: string;
	rating: number;
	comment: string;
	date: string;
	images?: string[];
}

export interface ImageCarouselProps {
	images: string[];
	reviews?: Review[];
	autoplay?: boolean;
	interval?: number;
	showThumbnails?: boolean;
}
