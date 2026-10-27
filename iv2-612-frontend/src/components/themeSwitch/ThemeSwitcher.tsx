import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import "./ThemeSwitcher.css";

// Add simple SVG icons for fullscreen
const FullscreenIcon = (props: React.SVGProps<SVGSVGElement>) => (
	<svg {...props} fill="none" viewBox="0 0 20 20">
		<path
			d="M3 8V3h5M17 8V3h-5M3 12v5h5M17 12v5h-5"
			stroke="currentColor"
			strokeLinecap="round"
			strokeWidth="2"
		/>
	</svg>
);
const ExitFullscreenIcon = (props: React.SVGProps<SVGSVGElement>) => (
	<svg {...props} fill="none" viewBox="0 0 20 20">
		<path
			d="M8 3H3v5M12 3h5v5M3 12v5h5M17 12v5h-5"
			stroke="currentColor"
			strokeLinecap="round"
			strokeWidth="2"
		/>
	</svg>
);

export const ThemeSwitcher = () => {
	const { setTheme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);

	useEffect(() => {
		setMounted(true);
		// Listen for fullscreen changes
		const handler = () => setIsFullscreen(!!document.fullscreenElement);
		document.addEventListener("fullscreenchange", handler);
		return () => document.removeEventListener("fullscreenchange", handler);
	}, []);

	if (!mounted) {
		return <div className="theme-switcher-placeholder" />;
	}

	const isDark = resolvedTheme === "dark";

	// Fullscreen handlers
	const handleFullscreenToggle = () => {
		if (!isFullscreen) {
			document.documentElement.requestFullscreen?.();
		} else {
			document.exitFullscreen?.();
		}
	};

	return (
		<div className="theme-switcher-container">
			<button
				aria-label="Toggle theme"
				className="theme-toggle-button"
				onClick={() => setTheme(isDark ? "light" : "dark")}
				type="button"
			>
				{isDark ? (
					<SunIcon className="theme-icon sun" />
				) : (
					<MoonIcon className="theme-icon moon" />
				)}
			</button>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
				}}
			>
				<button
					aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
					className="theme-toggle-button"
					onClick={handleFullscreenToggle}
					style={{ marginLeft: 8 }}
					type="button"
				>
					{isFullscreen ? (
						<ExitFullscreenIcon className="theme-icon fullscreen" />
					) : (
						<FullscreenIcon className="theme-icon fullscreen" />
					)}
				</button>
			</div>
		</div>
	);
};
