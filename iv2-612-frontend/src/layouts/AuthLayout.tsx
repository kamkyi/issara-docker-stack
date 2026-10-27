import { Container } from "@radix-ui/themes";
import { useTheme } from "next-themes";
import type React from "react";
import { Footer } from "$src/components/footer/Footer";
import { AccountNavbar } from "$src/components/navbars/AccountNavbar";
import styles from "./AuthLayout.module.css";

interface AuthLayoutProps {
	children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
	const { theme } = useTheme();

	return (
		<div
			className={styles.fullLayout}
			style={{ background: theme === "dark" ? "#002a38" : "#FBF6EC" }}
		>
			<AccountNavbar />
			<div className={styles.mainArea}>
				<Container>
					<main className={styles.content}>{children}</main>
				</Container>
			</div>
			<Footer />
		</div>
	);
}
