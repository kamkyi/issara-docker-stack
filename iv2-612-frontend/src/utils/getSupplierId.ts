export function getSupplierIdFromMergedMainUser(): number | null {
	try {
		const raw = localStorage.getItem("merged_main_user");
		if (!raw) return null;
		const parsed = JSON.parse(raw as string);
		const id = parsed?.authorization?.supplierId;
		if (id === 0) return 0;
		if (id && !Number.isNaN(Number(id))) return Number(id);
		return null;
	} catch (_e) {
		return null;
	}
}

export default getSupplierIdFromMergedMainUser;
