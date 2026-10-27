import { Badge, Text } from "@radix-ui/themes";

type SupplierDetail = {
	id: number;
	name: string;
	industries: any[];
	subindustries: any[];
	total_num_workers: number | null;
	lat: string;
	lng: string;
	address?: string;
	zipcode?: string;
	gps?: string;
	contact_name?: string;
	contact_phone?: string;
	contact_email?: string;
	website?: string;
	description?: string;
	created?: string;
	country?: any;
	province?: any;
	district?: any;
	worker_voice?: boolean;
	worker_voice_status?: string;
	supply_chains?: any[];
	total_num_men_workers?: number | null;
	total_num_women_workers?: number | null;
	total_num_thai_workers?: number | null;
	total_num_cambodian_workers?: number | null;
	total_num_myanmar_workers?: number | null;
	total_num_lao_workers?: number | null;
	total_num_vietnamese_workers?: number | null;
	num_workers_reimbursed_recruitment_fees?: number | null;
	remain_num_workers_owed_recruitment_fee_reimbursement?: number | null;
	[key: string]: any;
};

type SupplierDetailSectionProps = {
	supplierDetail: SupplierDetail;
	industriesData?: { id: number; name: string }[];
};

export default function SupplierDetailSection({
	supplierDetail,
	industriesData,
}: SupplierDetailSectionProps) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "1.5rem",
			}}
		>
			<div>
				<Text as="div" color="gray" mb="1" size="2" weight="bold">
					Supplier Name
				</Text>
				<Text as="div" size="4" weight="medium">
					{supplierDetail.name}
				</Text>
			</div>

			{supplierDetail.industries && supplierDetail.industries.length > 0 && (
				<div>
					<Text as="div" color="gray" mb="1" size="2" weight="bold">
						Industries
					</Text>
					<Badge>
						{industriesData?.find(
							(ind) => ind.id === supplierDetail.industries[0],
						)?.name || supplierDetail.industries[0]}
					</Badge>
				</div>
			)}

			<div>
				<Text as="div" color="gray" mb="1" size="2" weight="bold">
					Total Workers
				</Text>
				<Text as="div" size="3">
					{supplierDetail.total_num_workers?.toLocaleString() || "N/A"}
				</Text>
			</div>

			{/* Urgent privacy request: hide gender worker breakdown.
			{(supplierDetail.total_num_men_workers !== null ||
				supplierDetail.total_num_women_workers !== null) && (
				<div
					style={{
						fontSize: "12px",
						color: "#6b7280",
					}}
				>
					{supplierDetail.total_num_men_workers !== null && (
						<span>
							Men:{" "}
							{(supplierDetail.total_num_men_workers ?? 0).toLocaleString()}
						</span>
					)}
					{supplierDetail.total_num_men_workers !== null &&
						supplierDetail.total_num_women_workers !== null && <span> • </span>}
					{supplierDetail.total_num_women_workers !== null && (
						<span>
							Women:{" "}
							{(supplierDetail.total_num_women_workers ?? 0).toLocaleString()}
						</span>
					)}
				</div>
			)}
			*/}

			{/* Urgent privacy request: hide Worker Voice status.
			{supplierDetail.worker_voice !== undefined && (
				<div>
					<Text as="div" color="gray" mb="1" size="2" weight="bold">
						Worker Voice
					</Text>
					<div
						style={{
							display: "inline-block",
							padding: "0.25rem 0.75rem",
							borderRadius: "100px",
							background: supplierDetail.worker_voice ? "#e0f2f4" : "#f3f4f6",
							color: supplierDetail.worker_voice ? "#0f766e" : "#6b7280",
							fontSize: "12px",
							fontWeight: 600,
						}}
					>
						{supplierDetail.worker_voice ? "Active" : "Inactive"}
					</div>
				</div>
			)}
			*/}

			{/* Urgent privacy request: hide address and location details.
			{supplierDetail.address && supplierDetail.address !== "-" && (
				<div>
					<Text as="div" color="gray" mb="1" size="2" weight="bold">
						Address
					</Text>
					<Text as="div" size="3">
						{supplierDetail.address}
						{supplierDetail.zipcode && supplierDetail.zipcode !== "-" && (
							<span>, {supplierDetail.zipcode}</span>
						)}
					</Text>
					{(supplierDetail.district ||
						supplierDetail.province ||
						supplierDetail.country) && (
						<Text
							as="div"
							color="gray"
							size="2"
							style={{ marginTop: "0.25rem" }}
						>
							{[
								supplierDetail.district?.name || supplierDetail.district,
								supplierDetail.province?.name || supplierDetail.province,
								supplierDetail.country?.name || supplierDetail.country,
							]
								.filter(Boolean)
								.filter((v) => v !== "-")
								.join(", ")}
						</Text>
					)}
				</div>
			)}
			*/}

			{/* Urgent privacy request: hide contact person.
			{supplierDetail.contact_name && supplierDetail.contact_name !== "-" && (
				<div>
					<Text as="div" color="gray" mb="1" size="2" weight="bold">
						Contact Person
					</Text>
					<Text as="div" size="3">
						{supplierDetail.contact_name}
					</Text>
				</div>
			)}
			*/}

			{/* {supplierDetail.contact_email &&
				supplierDetail.contact_email !== "-" && (
					<div>
						<Text as="div" color="gray" mb="1" size="2" weight="bold">
							Email
						</Text>
						<Text as="div" size="3">
							<a
								href={`mailto:${supplierDetail.contact_email}`}
								style={{ color: "#32b2c3", textDecoration: "none" }}
							>
								{supplierDetail.contact_email}
							</a>
						</Text>
					</div>
				)} */}

			{supplierDetail.website && (
				<div>
					<Text as="div" color="gray" mb="1" size="2" weight="bold">
						Website
					</Text>
					<Text as="div" size="3">
						<a
							href={supplierDetail.website}
							rel="noopener noreferrer"
							style={{ color: "#32b2c3", textDecoration: "none" }}
							target="_blank"
						>
							{supplierDetail.website}
						</a>
					</Text>
				</div>
			)}

			{/* Urgent privacy request: hide description.
			{supplierDetail.description && (
				<div>
					<Text as="div" color="gray" mb="1" size="2" weight="bold">
						Description
					</Text>
					<Text as="div" size="3">
						{supplierDetail.description}
					</Text>
				</div>
			)}
			*/}

			{/* Urgent privacy request: hide recruitment fee reimbursement details.
			{(supplierDetail.num_workers_reimbursed_recruitment_fees !== null ||
				supplierDetail.remain_num_workers_owed_recruitment_fee_reimbursement !==
					null) && (
				<div>
					<Text as="div" color="gray" mb="1" size="2" weight="bold">
						Recruitment Fee Reimbursement
					</Text>
					{supplierDetail.num_workers_reimbursed_recruitment_fees !== null && (
						<Text as="div" size="3">
							Reimbursed:{" "}
							{(
								supplierDetail.num_workers_reimbursed_recruitment_fees ?? 0
							).toLocaleString()}{" "}
							workers
						</Text>
					)}
					{supplierDetail.remain_num_workers_owed_recruitment_fee_reimbursement !==
						null && (
						<Text as="div" size="3">
							Remaining:{" "}
							{(
								supplierDetail.remain_num_workers_owed_recruitment_fee_reimbursement ??
								0
							).toLocaleString()}{" "}
							workers
						</Text>
					)}
				</div>
			)}
			*/}

			{/* Urgent privacy request: hide created date.
			{supplierDetail.created && (
				<div>
					<Text as="div" color="gray" mb="1" size="2" weight="bold">
						Created Date
					</Text>
					<Text as="div" size="3">
						{new Date(supplierDetail.created).toLocaleDateString()}
					</Text>
				</div>
			)}
			*/}
		</div>
	);
}
