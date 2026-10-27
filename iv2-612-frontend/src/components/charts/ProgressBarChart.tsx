import ProgressBar from "@ramonak/react-progress-bar";

interface ProgressBarChartProps {
	completed: number;
	color?: string;
	label?: string;
	height?: string;
}

const ProgressBarChart = (props: ProgressBarChartProps) => {
	const { completed, color, label, height } = props;

	return (
		<div className="flex items-center gap-4 my-1">
			{label && <div className="flex-col w-[200px] text-sm">{label}</div>}
			<div className="w-full">
				<ProgressBar
					animateOnRender
					barContainerClassName="rounded-full bg-gray-100"
					bgColor={color}
					completed={completed}
					// labelSize={"12px"}
					height={height || "16px"}
					isLabelVisible={false}
				/>
			</div>
		</div>
	);
};

export default ProgressBarChart;
