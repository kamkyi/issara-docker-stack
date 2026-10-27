import ReactSpeedometer from "react-d3-speedometer";

interface SpeedometerProps {
	value: number;
	label: string;
	minValue?: number;
	maxValue?: number;
	segments?: number;
	width?: number;
	height?: number;
	needleColor?: string;
	segmentColors?: string[];
	forceRender?: boolean;
	aggregatedValue?: React.ReactNode;
	ringWidth?: number;
	hideLabelUnderGauge?: boolean;
	maxSegmentLabels?: number;
}

export default function Speedometer({
	value,
	label,
	minValue = 0,
	maxValue = 100,
	segments = 5,
	width = 150,
	height = 150,
	needleColor = "black",
	segmentColors = ["#d1046b", "#faa17a", "#faef70", "#4ede8f", "#148696"],
	forceRender = false,
	aggregatedValue,
	ringWidth = 35,
	hideLabelUnderGauge = false,
	maxSegmentLabels = 5,
}: SpeedometerProps) {
	return (
		<div className="speedometer-container flex flex-col items-center">
			<div style={{ width: `${width}px`, height: `${height}px` }}>
				<ReactSpeedometer
					currentValueText={hideLabelUnderGauge ? "" : label}
					forceRender={forceRender}
					height={height}
					maxSegmentLabels={maxSegmentLabels}
					maxValue={maxValue}
					minValue={minValue}
					needleColor={needleColor}
					paddingHorizontal={hideLabelUnderGauge ? 0 : undefined}
					// Always ensure currentValueText is empty when hideLabelUnderGauge is true
					paddingVertical={hideLabelUnderGauge ? 0 : undefined}
					ringWidth={ringWidth}
					segmentColors={segmentColors}
					segments={segments}
					// Add these additional props to reinforce label hiding
					textColor={hideLabelUnderGauge ? "transparent" : undefined}
					value={value}
					valueTextFontSize={hideLabelUnderGauge ? "0px" : undefined}
					width={width}
				/>
			</div>
			{aggregatedValue && (
				<div
					className="flex items-center justify-center"
					style={{
						marginTop: "-60px",
						padding: "9px 15px",
						background: "rgba(255, 255, 255, 0.92)",
						borderRadius: "13px",
						boxShadow: "0 4px 16px 0 rgba(0,0,0,0.18)",
						border: "1px solid rgba(0,0,0,0.08)",
						minWidth: `${width - 25}px`,
						fontWeight: 600,
						fontSize: "1.125rem",
						color: "#333",
						zIndex: 0, // Lowered z-index to prevent overlapping with datepickers
						position: "relative",
						pointerEvents: "auto", // Ensure interaction with this element only
					}}
				>
					{aggregatedValue}
				</div>
			)}
		</div>
	);
}
