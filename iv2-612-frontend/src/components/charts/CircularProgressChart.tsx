import {
	buildStyles,
	CircularProgressbarWithChildren,
} from "react-circular-progressbar";

interface ProgressBarChartProps {
	completed: string;
	color: string;
	label: string;
}

const CircularProgressChart = (props: ProgressBarChartProps) => {
	const { completed, color, label } = props;
	const completedColor =
		completed >= "80"
			? "#148696"
			: completed < "80" && completed >= "60"
				? "rgba(214, 168, 57)"
				: "#fc287d";
	return (
		<CircularProgressbarWithChildren
			strokeWidth={9}
			styles={buildStyles({
				// Rotation of path and trail, in number of turns (0-1)

				// Whether to use rounded or flat corners on the ends - can use 'butt' or 'round'
				strokeLinecap: "round",

				// How long animation takes to go from one percentage to another, in seconds
				pathTransitionDuration: 0.9,

				// Can specify path transition in more detail, or remove it entirely
				// pathTransition: 'none',

				// Colors
				pathColor: completedColor,
				trailColor: "rgba(0, 0, 0, 0.15)",
				backgroundColor: color,
			})}
			value={Number(completed)}
		>
			<span
				className="text-5xl"
				style={{ fontWeight: 900, color: completedColor }}
			>
				{completed}
				<span style={{ fontSize: 16 }}></span>
			</span>
			<span className="text-sm text-center" style={{ width: "8.25rem" }}>
				{label}
			</span>
		</CircularProgressbarWithChildren>
	);
};

export default CircularProgressChart;
