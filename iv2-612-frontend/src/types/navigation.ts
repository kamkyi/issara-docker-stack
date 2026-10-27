// Navigation Component Types

export type MenuItem = {
	label: string;
	href: string;
	icon?: React.ReactNode;
	badge?: number | string;
	children?: MenuItem[];
};

export interface NavbarLanguageSelectorProps {
	className?: string;
}

export interface GuestNavbarProps {
	menuItems?: MenuItem[];
	logo?: React.ReactNode;
}

export interface AccountNavbarProps {
	user?: {
		name: string;
		email: string;
		avatar?: string;
	};
	menuItems?: MenuItem[];
}

export interface AdminNavbarProps {
	menuItems?: MenuItem[];
	user?: {
		name: string;
		role: string;
		avatar?: string;
	};
}

export interface AnimatedStickyNavbarProps {
	menuItems: MenuItem[];
	logo?: React.ReactNode;
	transparent?: boolean;
}

export interface SideMenuProps {
	menuItems: MenuItem[];
	isOpen: boolean;
	onClose: () => void;
	activeItem?: string;
}
