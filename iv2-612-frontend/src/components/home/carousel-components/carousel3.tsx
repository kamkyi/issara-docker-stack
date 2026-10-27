import { useEffect, useRef } from "react";
import "./carousel1.css";
import CarouselImg1 from "$src/assets/img/carousel-screens/carousel_img_3.jpg";

export const Carousel3 = () => {
	const marqueeRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const marquee = marqueeRef.current;
		if (!marquee) return;

		// Clone images for seamless loop
		const clone = marquee.innerHTML;
		marquee.innerHTML = clone + clone;
	}, []);

	return (
		<div
			className="h-full w-full absolute"
			style={{
				backgroundImage: `url(${CarouselImg1})`,
				backgroundSize: "cover",
				backgroundPosition: "center",
				backgroundAttachment: "fixed",
			}}
		></div>
	);
};
