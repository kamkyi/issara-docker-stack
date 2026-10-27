/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: "class", // Enable class-based dark mode
	safelist: [
		"choropleth-cluster",
		"choropleth-cluster-small",
		"choropleth-cluster-medium",
		"choropleth-cluster-large"
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ["\"DM Sans\""],
				heading: ["\"DM Sans\""],
				display: ["\"Fugaz One\""],
			},
			colors: {
				primary: "var(--color-primary)",
				secondary: "var(--color-secondary)",
				bg: "var(--color-bg)",
				ink: "var(--color-ink)",
				body: "var(--color-body)",
				caption: "var(--color-caption)",
				border: "var(--color-border)",
				action: {
					teal: "#a6dfdd",
					purple: "#6f2e97",
					yellowSoft: "#ffedaf",
					yellow: "#fdda61",
					coral: "#fb8379",
					cream: "#fff8de",
				},
			},
			spacing: {
				xs: "5px",
				s: "10px",
				m: "15px",
				l: "25px",
				xl: "40px",
				xxl: "65px",
			},
			fontSize: {
				xs: "0.75rem",
				sm: "0.875rem",
				base: "1rem",
				lg: "1.125rem",
				xl: "1.25rem",
				"2xl": "1.5rem",
				"3xl": "1.875rem",
				"4xl": "2.25rem",
				"5xl": "3rem",
				"6xl": "4rem",
				// Style guide type scale [size, line-height]
				h1: ["40px", "52px"],
				h2: ["32px", "40px"],
				h3: ["22px", "28px"],
				h4: ["16px", "20px"],
				p: ["16px", "24px"],
				caption: ["10px", "12px"],
			},
			animation: {
				fadeIn: "fadeIn 0.2s ease-in-out",
				scaleIn: "scaleIn 0.2s ease-out",
			},
			keyframes: {
				fadeIn: {
					"0%": { opacity: 0 },
					"100%": { opacity: 1 },
				},
				scaleIn: {
					"0%": { transform: "translate(-50%, -50%) scale(0.95)", opacity: 0 },
					"100%": { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
				},
			},
		},
	},
};
