import { LoadingSpinner, ModalBackdrop, ModalHeader } from "./ModalComponents";
import SupplierDetailSection from "./SupplierDetailSection";

// import WorkerGenderChart from "./WorkerGenderChart";

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

type SupplierDetailPanelProps = {
	supplierDetail: SupplierDetail | null;
	isLoading: boolean;
	onClose: () => void;
	industriesData?: { id: number; name: string }[];
};

export default function SupplierDetailPanel({
	supplierDetail,
	isLoading,
	onClose,
	industriesData,
}: SupplierDetailPanelProps) {
	if (!supplierDetail && !isLoading) return null;

	// const menWorkers = supplierDetail?.total_num_men_workers || 0;
	// const womenWorkers = supplierDetail?.total_num_women_workers || 0;

	return (
		<>
			<ModalBackdrop onClose={onClose} />

			{/* Modal Content */}
			<div
				aria-modal="true"
				role="dialog"
				style={{
					position: "fixed",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					width: "90%",
					maxWidth: "1200px",
					maxHeight: "90vh",
					background: "white",
					borderRadius: "12px",
					boxShadow:
						"0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
					zIndex: 1000,
					overflowY: "auto",
					transition: "all 0.3s ease",
				}}
			>
				<div style={{ padding: "1.5rem" }}>
					<ModalHeader onClose={onClose} title="Supplier Details" />

					{isLoading ? (
						<LoadingSpinner />
					) : supplierDetail ? (
						<div
							style={{
								display: "grid",
								// gridTemplateColumns: "1fr 400px",
								gridTemplateColumns: "1fr",
								gap: "2rem",
							}}
						>
							{/* Left Column - Details */}
							<SupplierDetailSection
								industriesData={industriesData}
								supplierDetail={supplierDetail}
							/>

							{/* Urgent privacy request: hide gender chart and breakdown.
							<div className="bg-gray-100 p-4 rounded-lg">
								<WorkerGenderChart
									menWorkers={menWorkers}
									womenWorkers={womenWorkers}
								/>
							</div>
							*/}
						</div>
					) : null}
				</div>
			</div>
		</>
	);
}
