export const getInteractiveMapApiUrl = (
	path: string,
	baseUrl = import.meta.env.VITE_APP_CASCADE_API_URL,
) => {
	const normalizedBase = (baseUrl || "").replace(/\/+$/, "");
	const normalizedPath = path.replace(/^\/+|\/+$/g, "");
	return normalizedBase
		? `${normalizedBase}/maps/${normalizedPath}`
		: `/api/v1/maps/${normalizedPath}`;
};
