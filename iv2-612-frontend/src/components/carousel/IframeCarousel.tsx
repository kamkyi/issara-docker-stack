import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { useState } from "react";

export interface IframeSlide {
	title: string;
	src: string;
}

interface IframeCarouselProps {
	slides: IframeSlide[];
	className?: string;
}

export const IframeCarousel = ({
	slides,
	className = "",
}: IframeCarouselProps) => {
	const [current, setCurrent] = useState(0);

	const hasMany = slides.length > 1;

	const prev = () => setCurrent((i) => (i === 0 ? slides.length - 1 : i - 1));
	const next = () => setCurrent((i) => (i === slides.length - 1 ? 0 : i + 1));

	const goTo = (i: number) => setCurrent(i);

	return (
		<div className={`relative w-full ${className}`}>
			<div className="aspect-video bg-gray-200 relative rounded-sm overflow-hidden">
				<iframe
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
					allowFullScreen
					className="w-full h-full"
					src={slides[current].src}
					title={slides[current].title}
				/>

				{hasMany && (
					<>
						<button
							aria-label="Previous"
							className="absolute left-2 top-1/2 -translate-y-1/2 bg-[#148696] bg-opacity-60 hover:bg-opacity-80 text-white p-2 rounded-full"
							onClick={prev}
						>
							<ChevronLeftIcon className="w-5 h-5" />
						</button>
						<button
							aria-label="Next"
							className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#148696] bg-opacity-60 hover:bg-opacity-80 text-white p-2 rounded-full"
							onClick={next}
						>
							<ChevronRightIcon className="w-5 h-5" />
						</button>
					</>
				)}
			</div>

			{hasMany && (
				<div className="flex items-center justify-center gap-2 mt-3">
					{slides.map((s, i) => (
						<button
							aria-label={`Go to slide ${i + 1}`}
							className={`w-2.5 h-2.5 rounded-full transition-all ${
								i === current ? "bg-[#148696] w-6" : "bg-gray-300"
							}`}
							key={s.title + i}
							onClick={() => goTo(i)}
							title={s.title}
						/>
					))}
				</div>
			)}
		</div>
	);
};

export default IframeCarousel;
