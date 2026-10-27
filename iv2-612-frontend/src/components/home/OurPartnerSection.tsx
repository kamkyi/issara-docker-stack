import { Heading } from "@radix-ui/themes";
import partner5 from "$src/assets/img/partners/AMKAS.png";
import partner3 from "$src/assets/img/partners/CDI.png";
import partner2 from "$src/assets/img/partners/CED.png";
import partner1 from "$src/assets/img/partners/issara.png";
import partner4 from "$src/assets/img/partners/safwa.jpg";
import partner6 from "$src/assets/img/partners/wage_indicator.png";

export function OurPartnerSection() {
	const partnersTargetUrl = "/about?scroll=core-partners";

	const partners = [
		{ src: partner1, alt: "Issara Institute" },
		{ src: partner2, alt: "CED" },
		{ src: partner3, alt: "CDI" },
		{ src: partner4, alt: "SAFWA" },
		{ src: partner5, alt: "AMKAS" },
		{ src: partner6, alt: "WAGE INDICATOR" },
		// { src: partner7, alt: "Issara Institute" },
		// { src: partner8, alt: "" },
	];

	return (
		<section className="w-full py-8 md:py-16 bg-white  items-center">
			<div className="text-center mb-12 flex flex-col items-center justify-center w-full">
				<Heading
					asChild
					className="text-center animated-underline text-2xl sm:text-3xl md:text-5xl lg:text-6xl text-[#148696]"
					mb={"4"}
					size={"9"}
				>
					<a href={partnersTargetUrl}>Our Partners</a>
				</Heading>
				<p className="text-base text-lg md:text-xl lg:text-2xl text-gray-600">
					Working together with leading organizations worldwide
				</p>
			</div>

			<div className="flex flex-row flex-wrap items-center justify-center gap-8 ">
				{partners.map((partner, idx) => (
					<a
						aria-label={`View CASCADE Core Partners on About page: ${partner.alt}`}
						className="flex items-center justify-center w-50 h-50 p-6 rounded-lg"
						href={partnersTargetUrl}
						key={idx}
					>
						<img
							alt={partner.alt}
							className="h-24 object-contain"
							src={partner.src}
						/>
					</a>
				))}
			</div>
		</section>
	);
}

export default OurPartnerSection;
