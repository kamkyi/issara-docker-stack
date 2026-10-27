export const isSupplier = (role: string): boolean => {
	return role === "org-supplier";
};

export const isIssaraManagement = (role: string): boolean => {
	return role === "org-issara-management" || role === "org-issara-staff";
};

export const isILMManagement = (role: string): boolean => {
	return role === "org-issara-management" || role === "org-issara-staff";
};

// Only Issara Management can approve/reject access requests. Distinct from
// isILMManagement (which also includes org-issara-staff, who get read-only).
export const canApproveAccessRequests = (role: string): boolean => {
	return role === "org-issara-management";
};

export const isRecruiter = (role: string): boolean => {
	return role === "org-recruitment-agency";
};
