// import { GlobeIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Container } from "@radix-ui/themes";

import Logo from "../../assets/img/logo.png";
import { SOCIAL } from "../ui/SocialSidebar";

export const CTASection = () => {
	return (
		<footer className="w-full bg-[#00516a] text-white">
			<Container className="py-12 px-4 sm:px-6 md:px-8 w-full" size="4">
				{/* Top: logo and small utilities */}
				<div className="flex items-center justify-between flex-wrap gap-4">
					<div className="flex items-center">
						<div className="w-12 h-12 md:w-18 md:h-18 flex items-center justify-start">
							<img
								alt="issara-logo"
								className="w-10 h-10 md:w-14 md:h-14"
								src={Logo}
							/>
						</div>
						<div>
							<div className="text-base md:text-lg font-black text-white">
								CASCADE
							</div>
							<div className="text-xs md:text-sm text-gray-200">
								Better Data + Better Solutions
							</div>
						</div>
					</div>

					{/* <div className="flex items-center gap-2 md:gap-4 text-white/90">
						<button
							aria-label="language"
							className="p-1.5 md:p-2"
							type="button"
						>
							<GlobeIcon className="w-4 h-4 md:w-5 md:h-5" />
						</button>
						<button aria-label="search" className="p-1.5 md:p-2" type="button">
							<MagnifyingGlassIcon className="w-4 h-4 md:w-5 md:h-5" />
						</button>
					</div> */}
				</div>

				<hr className="border-t border-white/25 my-6" />

				{/* Become Our Partner Section */}
				{/* <div className="mb-8 md:mb-12 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
					<div className="flex-1 w-full">
						<h3 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">
							Become Our Partner
						</h3>
						<p className="text-white/80 mb-4 md:mb-6 text-sm md:text-base leading-relaxed">
							Directly connect with worker voices in global supply chains and
							have higher quality data and insights for human rights due
							diligence (HRDD) and responsible sourcing.
						</p>
				
					
					</div>
				</div> */}

				<div className="mt-6 md:mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
					<div className="text-xs md:text-sm text-white/90 text-center md:text-left">
						© 2026 CASCADE |{" "}
						<a href="mailto:cascade@issarainstitute.org">
							cascade@issarainstitute.org
						</a>
					</div>
					<div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4">
						<a
							className="text-white/90 hover:text-white text-xs md:text-sm underline-offset-2 hover:underline"
							href="/privacy-policy"
						>
							Privacy Policy
						</a>
						<a className="text-white/90 text-xs md:text-sm" href="#">
							Contact Us:
						</a>
						<div className="flex items-center gap-2 md:gap-3 md:ml-6">
							{SOCIAL.map((social) => (
								<a
									aria-label={social.label}
									className="text-white/90 hover:text-white transition-colors w-5 h-5 md:w-6 md:h-6 flex items-center justify-center"
									href={social.href}
									key={social.label}
									rel="noopener noreferrer"
									target="_blank"
								>
									{social.icon}
								</a>
							))}
						</div>
					</div>
				</div>
			</Container>
		</footer>
	);
};

export default CTASection;
