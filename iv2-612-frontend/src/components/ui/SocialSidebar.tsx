import { LinkedIn, X, YouTube } from "@mui/icons-material";
import type React from "react";
// React is imported for types and JSX runtime compatibility
import styles from "./SocialSidebar.module.css";

export const SOCIAL = [
	{
		href: "https://x.com/IssaraInstitute",
		label: "Twitter",
		icon: <X />,
	},
	// {
	// 	href: "https://facebook.com/Issara",
	// 	label: "Facebook",
	// 	icon: <Facebook />,
	// },
	{
		href: "https://www.linkedin.com/company/issarainstitute",
		label: "LinkedIn",
		icon: <LinkedIn />,
	},
	{
		href: "https://www.youtube.com/@issarainstitute",
		label: "Youtube",
		icon: <YouTube />,
	},
];

export default function SocialSidebar() {
	const handleShare = async (e: React.MouseEvent) => {
		e.preventDefault();
		try {
			await navigator.clipboard.writeText(window.location.href);
			// optionally show a small tooltip or toast in-app
		} catch (err) {
			void err;
			// ignore clipboard errors
		}
	};

	return (
		<aside aria-label="Social links" className={styles.sidebar}>
			{SOCIAL.map((s) => (
				<a
					aria-label={s.label}
					className={styles.button}
					href={s.href}
					key={s.label}
					onClick={s.label === "Copy link" ? handleShare : undefined}
					rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
					target={s.href.startsWith("http") ? "_blank" : undefined}
				>
					{s.icon}
				</a>
			))}
		</aside>
	);
}
