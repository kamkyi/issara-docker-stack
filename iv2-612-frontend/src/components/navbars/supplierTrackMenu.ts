import type { SupplierTrack } from "$src/services/supplierTrackService";

const MARKETPLACE_ONLY_MENU_IDS = ["cascade-marketplace"] as const;

export const isMenuVisibleForSupplierTrack = (
	menuId: string,
	track: SupplierTrack | null,
) =>
	track !== "MARKETPLACE" ||
	(MARKETPLACE_ONLY_MENU_IDS as readonly string[]).includes(menuId);
