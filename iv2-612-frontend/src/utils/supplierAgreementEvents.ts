export const SUPPLIER_AGREEMENT_INVALIDATED_EVENT =
	"supplier-agreement-invalidated";

const getAgreementErrorDetails = (data: unknown) => {
	if (!data || typeof data !== "object") return { code: "", message: "" };
	const record = data as Record<string, unknown>;
	const detail =
		record.detail && typeof record.detail === "object"
			? (record.detail as Record<string, unknown>)
			: record;
	return {
		code: String(detail.code ?? record.code ?? ""),
		message: String(detail.message ?? record.message ?? ""),
	};
};

export const isSupplierAgreementAccessError = (
	status: number | undefined,
	data: unknown,
) => {
	if (status !== 403) return false;
	const { code, message } = getAgreementErrorDetails(data);
	return (
		code === "supplier_agreement_required" ||
		message.toLowerCase().includes("active supplier agreement is required")
	);
};
