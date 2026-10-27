import { Container, Heading, Text } from "@radix-ui/themes";

export const OutreachEffectivenessSection = () => {
	return (
		<section className="bg-white px-4 pb-16">
			<Container size="4">
				<div className="rounded-2xl border border-[#d3ecef] bg-[#f7fcfd] p-6 md:p-10">
					<Heading className="text-[#148696]" size="8">
						Outreach Effectiveness
					</Heading>
					<Text className="mt-3 text-gray-700 leading-relaxed" size="4">
						Community Outreach & Empowerment in Origin & Destination Countries
					</Text>
				</div>
			</Container>
		</section>
	);
};

export default OutreachEffectivenessSection;
