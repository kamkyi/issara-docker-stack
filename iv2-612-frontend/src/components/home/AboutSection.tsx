import { Heading, Text } from "@radix-ui/themes";
import partner5 from "$src/assets/img/partners/AMKAS.png";
import partner3 from "$src/assets/img/partners/CDI.png";
import partner2 from "$src/assets/img/partners/CED.png";
import partner1 from "$src/assets/img/partners/issara.png";
import partner7 from "$src/assets/img/partners/nomogaia.jpg";
import partner4 from "$src/assets/img/partners/safwa.jpg";
import partner6 from "$src/assets/img/partners/wage_indicator.png";

export const AboutSection = () => {
	const partnersTargetUrl = "/about?scroll=core-partners";

	// The logos have very different aspect ratios (0.86 to 2.40), so sizing them
	// all to one height makes the wide ones dominate the row. `scale` normalizes
	// them by area instead, then nudges for ink density: the circular seals read
	// small for their footprint, the solid NomoGaia block reads heavy.
	const partners = [
		{ src: partner1, alt: "Issara Institute", scale: "scale-[0.75]" },
		{ src: partner2, alt: "CED", scale: "scale-[0.76]" },
		{ src: partner3, alt: "CDI", scale: "scale-[1.09]" },
		{ src: partner4, alt: "SAFWA", scale: "scale-[1.09]" },
		{ src: partner5, alt: "AMKAS", scale: "scale-[0.93]" },
		{ src: partner6, alt: "WAGE INDICATOR", scale: "scale-[0.85]" },
		{ src: partner7, alt: "NomoGaia", scale: "scale-[0.83]" },
		// { src: partner8, alt: "", scale: "scale-100" },
	];

	// Balance the logos across two rows: 4 on the first, the rest on the second.
	const partnerRows = [partners.slice(0, 4), partners.slice(4)];

	return (
		<div className="py-6 sm:py-8 md:py-16 min-h-[70vh] container mx-auto flex flex-col items-center justify-center px-4">
			<div className="container mx-auto relative z-10 px-6 text-center">
				<div>
					<Heading
						className="text-[#148696] animated-underline text-2xl sm:text-3xl md:text-4xl lg:text-5xl"
						mb={"8"}
						size={"9"}
					>
						Who We Are
					</Heading>
				</div>
				<Text className="text-lg md:text-xl lg:text-1xl text-gray-700 leading-relaxed max-w-lg">
					CASCADE is a coalition of experienced non-profit organizations uniting
					as the Action Network to introduce a new, technology-enabled data +
					action ecosystem for social and environmental assurances and
					continuous improvement.
				</Text>

				<Text className="text-lg md:text-xl lg:text-1xl text-gray-700 leading-relaxed pb-10 max-w-lg">
					Through our platform, we are leading the new era of accountability
					with data rooted in empowered worker voice, ongoing monitoring, and
					systems changes.
				</Text>
			</div>
			<p className="text-base text-3xl md:text-3xl lg:text-1xl text-gray-600 text-center my-8 sm:mb-12 px-2 font-thin sm:px-0">
				Working together with leading organizations worldwide
			</p>

			<div className="flex flex-col items-center justify-center gap-2 sm:gap-4">
				{partnerRows.map((row, rowIdx) => (
					<div
						className="flex flex-row items-center justify-center gap-1 sm:gap-4 md:gap-6 lg:gap-10"
						key={rowIdx}
					>
						{row.map((partner, idx) => (
							<a
								aria-label={`View CASCADE Core Partners on About page: ${partner.alt}`}
								className="flex items-center justify-center rounded-lg w-[84px] h-14 sm:w-[110px] sm:h-[72px] md:w-[132px] md:h-24 lg:w-48 lg:h-28 transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#148696]"
								href={partnersTargetUrl}
								key={idx}
							>
								<img
									alt={partner.alt}
									className={`h-11 sm:h-14 md:h-16 lg:h-24 w-auto object-contain ${partner.scale}`}
									src={partner.src}
								/>
							</a>
						))}
					</div>
				))}
			</div>
		</div>
	);
};
