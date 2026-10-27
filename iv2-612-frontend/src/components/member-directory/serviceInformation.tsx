import { Card } from "@radix-ui/themes";
import { memo } from "react";

const ServiceInformation = ({ company }) => {
	return (
		<Card className="p-6 mb-4">
			<h3 className="text-lg font-bold mb-4">Service Information</h3>
			<div className="space-y-2 text-sm">
				<div className="flex justify-between">
					<b>Product Type</b>
					<span>{"Salmon Fish"}</span>
				</div>
				<div className="flex justify-between">
					<b>Export Countries</b>
					<span>{company.type}</span>
				</div>
				<div className="flex justify-between">
					<b>Established Year</b>
					<span>{2001}</span>
				</div>

				<div className="flex justify-between">
					<b>Spoken Language</b>
					<span>Myanmar, English, Thailand</span>
				</div>
			</div>
		</Card>
	);
};

export default memo(ServiceInformation);
