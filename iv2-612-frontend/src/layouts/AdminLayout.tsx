import type React from "react";
import { Footer } from "$src/components/footer/Footer";
import { AccountNavbar } from "$src/components/navbars/AccountNavbar";
import { AdminNavbar } from "$src/components/navbars/AdminNavbar";
import styles from "./AdminLayout.module.css";

interface AdminLayoutProps {
	children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
	return (
		<div className={styles.fullLayout}>
			<header className={styles.header}>
				<AccountNavbar />
				<AdminNavbar />
			</header>

			<div className={styles.mainArea}>
				<main className={styles.content}>{children}</main>
			</div>
			<Footer />
		</div>
	);
}
