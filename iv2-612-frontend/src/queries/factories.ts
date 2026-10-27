export const getQueryKey = ({
	model,
	filter,
}: {
	model: string;
	filter?: { [key: string]: unknown };
}) => {
	return [model, filter].filter(Boolean);
};
