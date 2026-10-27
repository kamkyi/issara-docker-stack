interface ProgressData {
	not_yet_initiated?: number;
	partial_progress?: number;
	completed_ongoing?: number;
	suppliers?: {
		completed?: string[];
		not_yet_initiated?: string[];
		partial_progress?: string[];
	};
}

const transformProgressData = (data?: ProgressData) => {
	if (!data) {
		return [
			{
				label: "Not Yet Initiated",
				value: 0,
				color: "#9e9e9e",
			},
			{
				label: "Partial Progress",
				value: 0,
				color: "#ffd966",
			},
			{
				label: "Completed / Ongoing",
				value: 0,
				color: "#0097a7",
			},
		];
	}

	return [
		{
			label: "Not Yet Initiated",
			value: data.not_yet_initiated || 0,
			color: "#9e9e9e",
			suppliers: data.suppliers
				? {
						not_yet_initiated: data.suppliers.not_yet_initiated,
					}
				: undefined,
		},
		{
			label: "Partial Progress",
			value: data.partial_progress || 0,
			color: "#ffd966",
			suppliers: data.suppliers
				? {
						partial_progress: data.suppliers.partial_progress,
					}
				: undefined,
		},
		{
			label: "Completed / Ongoing",
			value: data.completed_ongoing || 0,
			color: "#0097a7",
			suppliers: data.suppliers
				? {
						completed: data.suppliers.completed,
					}
				: undefined,
		},
	];
};

export default transformProgressData;
