import { Container } from "@radix-ui/themes";
import { useTheme } from "next-themes";
import type React from "react";
import CascadeFloatingButton from "$src/components/button/testerFloatingButton";
import { Footer } from "$src/components/footer/Footer";
import { AccountNavbar } from "$src/components/navbars/AccountNavbar";
import { GuestNavbar } from "$src/components/navbars/GuestNabar";
import { authStatus } from "$src/queries/auth";
import styles from "./ManagementLayout.module.css";

interface ManagementLayoutProps {
	children: React.ReactNode;
}

export function ManagementLayout({ children }: ManagementLayoutProps) {
	const { isAuthenticated } = authStatus();
	const { theme } = useTheme();
	return (
		<div
			className={styles.fullLayout}
			style={{ background: theme === "dark" ? "#002a38" : "#FBF6EC" }}
		>
			<AccountNavbar />
			<div className="mx-6 sm:px-2 flex justify-end items-center flex-wrap gap-4 mt-4">
				{isAuthenticated && <GuestNavbar />}
			</div>
			<div className={styles.mainArea}>
				<Container>
					<main className={styles.content}>{children}</main>
				</Container>
			</div>
			<CascadeFloatingButton />
			<Footer />
		</div>
	);
}
