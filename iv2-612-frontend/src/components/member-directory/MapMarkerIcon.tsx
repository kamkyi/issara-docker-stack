interface MapMarkerIconProps {
	className?: string;
}

export default function MapMarkerIcon({ className }: MapMarkerIconProps) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			focusable="false"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={2}
			viewBox="0 0 24 24"
		>
			<path d="M20 10c0 4.99-5.54 10.19-7.4 11.6a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 1 1 16 0Z" />
			<circle cx="12" cy="10" r="3" />
		</svg>
	);
}
