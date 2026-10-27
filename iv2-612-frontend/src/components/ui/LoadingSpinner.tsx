import type React from "react";
import SpinnerLogo from "$src/assets/img/spinner-logo.gif";

interface LoadingSpinnerProps {
	title?: string;
	subtitle?: string;
	useDefaultLogo?: boolean;
	customSpinnerSrc?: string;
	size?: number;
	className?: string;
	fullHeight?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
	title = "Loading supply chain data...",
	subtitle = "Fetching KPIs, suppliers, and category data",
	useDefaultLogo = true,
	customSpinnerSrc,
	size = 50,
	className = "",
	fullHeight = false,
}) => {
	const spinnerSrc = customSpinnerSrc || (useDefaultLogo ? SpinnerLogo : null);
	const containerClass = fullHeight
		? `flex flex-col justify-center items-center h-[70vh] ${className}`
		: `flex flex-col items-center justify-center p-8 ${className}`;

	return (
		<div className={containerClass}>
			{spinnerSrc ? (
				<img
					alt="spinner-logo"
					className="mb-4"
					src={spinnerSrc}
					style={{
						width: size,
						height: size,
					}}
				/>
			) : (
				<div
					className="animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 mb-4"
					style={{
						width: size,
						height: size,
					}}
				/>
			)}
			<p className="text-xs text-center">{title}</p>
			{subtitle && (
				<p className="text-xs text-gray-500 mt-2 text-center">{subtitle}</p>
			)}
		</div>
	);
};

export default LoadingSpinner;
