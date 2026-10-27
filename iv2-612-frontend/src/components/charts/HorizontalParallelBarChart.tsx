const categoriesRatings = [
	{ id: 1, label: "Working Conditions", scores: { 2023: 4.2, 2024: 3.5 } },
	{ id: 2, label: "Salary", scores: { 2023: 5, 2024: 4.8 } },
	{ id: 3, label: "Safety", scores: { 2023: 4.8, 2024: 4.9 } },
	{ id: 4, label: "Working Hours", scores: { 2023: 3.2, 2024: 4.1 } },
	{ id: 5, label: "Overtime Pay", scores: { 2023: 4.1, 2024: 3.8 } },
	{
		id: 6,
		label: "Line Managers/Net-supervisors/Boat Captains' Behavior",
		scores: { 2023: 4.6, 2024: 4.8 },
	},
	{ id: 7, label: "Healthcare", scores: { 2023: 5, 2024: 4.9 } },
	{
		id: 8,
		label: "Interpreters' Behavior & Treatment",
		scores: { 2023: 2.4, 2024: 3.5 },
	},
	{ id: 9, label: "Worker Housing", scores: { 2023: 2.6, 2024: 3.2 } },
	{
		id: 10,
		label: "Job application & Documents processing",
		scores: { 2023: 4.2, 2024: 4.9 },
	},
];

const MAX_SCORE = 5;

const HorizontalParallelBarChart = ({ review }) => {
	return (
		<div className="w-full p-4 rounded-md">
			<h3 className="text-2xl mb-4 text-center mb-8">
				Yearly Comparison (2023 vs 2024)
			</h3>

			<div>
				{categoriesRatings.slice(0, review).map((category) => (
					<div
						className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 my-4"
						key={category.id}
					>
						{/* 2023 Bar (left) */}
						<div className="flex items-center justify-end">
							<span className="text-sm font-bold mr-2">
								{category.scores[2023]}
							</span>
							<div
								className="bg-[#004A60] h-3 rounded-l-lg justify-self-end"
								style={{
									width: `${(category.scores[2023] / MAX_SCORE) * 100}%`,
								}}
							></div>
						</div>

						{/* Label */}
						<div
							className="text-xs text-center w-34 truncate px-1"
							title={category.label}
						>
							{category.label}
						</div>

						{/* 2024 Bar (right) */}
						<div className="flex items-center">
							<div
								className="bg-[#148696] h-3 rounded-r-lg"
								style={{
									width: `${(category.scores[2024] / MAX_SCORE) * 100}%`,
								}}
							></div>
							<span className="text-sm font-bold ml-2">
								{category.scores[2024]}
							</span>
						</div>
					</div>
				))}
			</div>
			<div className="flex justify-center items-center mt-4 space-x-4 text-sm">
				<div className="flex items-center">
					<div className="w-4 h-4 bg-[#004A60] rounded mr-2"></div>
					<span>2023</span>
				</div>
				<div className="flex items-center">
					<div className="w-4 h-4 bg-[#148696] rounded mr-2"></div>
					<span>2024</span>
				</div>
			</div>
		</div>
	);
};

export default HorizontalParallelBarChart;
