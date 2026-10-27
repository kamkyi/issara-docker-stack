import { useTheme } from "next-themes";

const ProgressIndicatorChart = () => {
	const { theme } = useTheme();
	return (
		<div
			className="h-[30px] w-full relative flex items-center rounded-r-full"
			style={{
				background: theme === "dark" ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.05)",
			}}
		>
			<div className="bg-gray-400 w-[4px] h-[40px] absolute left-[76%]"></div>
			<div className="w-[80%] bg-[#148696] h-[10px] rounded-r-lg"></div>
			<span className="absolute start-0 -bottom-6 text-sm">0</span>
			<span className="absolute end-0 -bottom-6 text-sm">100</span>
		</div>
	);
};

export default ProgressIndicatorChart;
