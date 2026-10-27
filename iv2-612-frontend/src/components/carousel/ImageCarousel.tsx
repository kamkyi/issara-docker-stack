import {
	ChevronLeftIcon,
	ChevronRightIcon,
	PauseIcon,
	PlayIcon,
} from "@radix-ui/react-icons";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import ImageViewAll from "../modals/ImageViewAll";

interface Review {
	author: string;
	comment: string;
	rating: number;
}

interface ImageCarouselProps {
	images: { id: string; image: string }[];
	companyName: string;
	industry?: string;
	reviews?: Review[];
	autoPlay?: boolean;
	autoPlayInterval?: number;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({
	images,
	companyName,
	industry,
	reviews = [],
	autoPlay = true,
	autoPlayInterval = 4000,
}) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isPlaying, setIsPlaying] = useState(autoPlay);
	const [isPaused, setIsPaused] = useState(false);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	// Combine cover image with business images if available
	const allImages =
		images && images.length > 0 ? images.map((img) => img.image) : [];

	// Mock reviews if not provided
	const mockReviews = [
		{ author: "John Doe", comment: "Great products and services!", rating: 5 },
		{
			author: "Jane Smith",
			comment: "The team was very professional.",
			rating: 4,
		},
		{
			author: "Peter Jones",
			comment: "Could be better, had some issues with delivery.",
			rating: 3,
		},
	];

	const displayReviews = reviews.length > 0 ? reviews : mockReviews;

	// Auto-play functionality
	useEffect(() => {
		if (isPlaying && allImages.length > 1 && !isPaused) {
			intervalRef.current = setInterval(() => {
				setCurrentIndex((prevIndex) =>
					prevIndex === allImages.length - 1 ? 0 : prevIndex + 1,
				);
			}, autoPlayInterval);
		} else {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		}

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [isPlaying, allImages.length, autoPlayInterval, isPaused]);

	// Pause auto-play when modal is open
	useEffect(() => {
		setIsPaused(isModalOpen);
	}, [isModalOpen]);

	if (allImages.length === 0) {
		return null;
	}

	const nextImage = () => {
		setCurrentIndex((prevIndex) =>
			prevIndex === allImages.length - 1 ? 0 : prevIndex + 1,
		);
	};

	const prevImage = () => {
		setCurrentIndex((prevIndex) =>
			prevIndex === 0 ? allImages.length - 1 : prevIndex - 1,
		);
	};

	const goToImage = (index: number) => {
		setCurrentIndex(index);
	};

	const togglePlayPause = () => {
		setIsPlaying(!isPlaying);
	};

	// Pause auto-play on hover
	const handleMouseEnter = () => {
		setIsPaused(true);
	};

	const handleMouseLeave = () => {
		setIsPaused(false);
	};

	return (
		<div className="mb-6">
			{/* <style jsx>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style> */}
			{/* Main Image Display */}
			<div
				className="relative mb-4"
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
			>
				<img
					alt={`${companyName} - ${industry} - ${currentIndex + 1}`}
					className="w-full h-100 object-cover rounded-md"
					src={allImages[currentIndex]}
				/>

				{/* Navigation Arrows - Only show if more than 1 image */}
				{allImages.length > 1 && (
					<>
						<button
							aria-label="Previous image"
							className="absolute left-2 top-1/2 cursor-pointer transform -translate-y-1/2 bg-[#148696] bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-200"
							onClick={prevImage}
						>
							<ChevronLeftIcon className="w-5 h-5" />
						</button>

						<button
							aria-label="Next image"
							className="absolute right-2 top-1/2 cursor-pointer transform -translate-y-1/2 bg-[#148696] bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-200"
							onClick={nextImage}
						>
							<ChevronRightIcon className="w-5 h-5" />
						</button>
					</>
				)}

				{/* Auto-play Control - Only show if more than 1 image */}
				{allImages.length > 1 && (
					<button
						aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
						className="absolute top-2 left-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all duration-200"
						onClick={togglePlayPause}
					>
						{isPlaying ? (
							<PauseIcon className="w-4 h-4" />
						) : (
							<PlayIcon className="w-4 h-4" />
						)}
					</button>
				)}

				{/* View All Button */}
				<button
					className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm hover:bg-opacity-70 transition-opacity"
					onClick={() => setIsModalOpen(true)}
				>
					View All
				</button>

				{/* Image Counter */}
				{allImages.length > 1 && (
					<div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
						{currentIndex + 1} / {allImages.length}
					</div>
				)}

				{/* Auto-play Progress Bar */}
				{allImages.length > 1 && isPlaying && !isPaused && (
					<div className="absolute bottom-0 left-0 w-full h-1 bg-black bg-opacity-20">
						<div
							className="h-full bg-[#148696] transition-all duration-100 ease-linear"
							style={{
								animation: `progress ${autoPlayInterval}ms linear infinite`,
							}}
						/>
					</div>
				)}
			</div>

			{/* Thumbnail Navigation - Only show if more than 1 image */}
			{allImages.length > 1 && (
				<div className="flex space-x-2 overflow-x-auto p-2 justify-end">
					{allImages.map((image, index) => (
						<button
							className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all duration-200 ${
								index === currentIndex
									? "border-[#148696] ring-1 ring-[#148696] ring-opacity-50"
									: "border-gray-300 hover:border-gray-400 opacity-70"
							}`}
							key={index}
							onClick={() => goToImage(index)}
						>
							<img
								alt={`${companyName} thumbnail ${index + 1}`}
								className="w-full h-full object-cover cursor-pointer"
								src={image}
							/>
						</button>
					))}
				</div>
			)}

			<ImageViewAll
				companyName={companyName}
				images={allImages}
				onOpenChange={setIsModalOpen}
				open={isModalOpen}
				reviews={displayReviews}
			/>
		</div>
	);
};

export default ImageCarousel;
