import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { Button, Flex } from "@radix-ui/themes";
import { useNavigate } from "@tanstack/react-router";
import styles from "./AdminNavbar.module.css";

const WORKOS_URL = "https://dashboard.workos.com/get-started";

export function AdminNavbar() {
	const navigate = useNavigate();

	return (
		<Flex align="center" className={styles.navbarSpacing} gap="3">
			<Button onClick={() => navigate({ to: "/admin" })} variant="soft">
				Admin Home
			</Button>

			<Button onClick={() => navigate({ to: "/admin/users" })} variant="soft">
				Users
			</Button>

			<Button
				onClick={() => navigate({ to: "/admin/settings" })}
				variant="soft"
			>
				Settings
			</Button>

			<a
				className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#004A60] transition-colors"
				href={WORKOS_URL}
				rel="noopener noreferrer"
				target="_blank"
			>
				WorkOS
				<ExternalLinkIcon height={12} width={12} />
			</a>

			<Button onClick={() => navigate({ to: "/" })} variant="soft">
				Back to App
			</Button>
		</Flex>
	);
}
