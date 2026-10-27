import { Flex, Select, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import EN from "$src/assets/img/language/en.svg";
import JA from "$src/assets/img/language/ja.png";
import KM from "$src/assets/img/language/km.png";
import MY from "$src/assets/img/language/my.png";
import NE from "$src/assets/img/language/ne.png";
import TH from "$src/assets/img/language/th.png";
import VI from "$src/assets/img/language/vi.svg";

const languages = [
	{
		code: "en",
		name: "English",
		flag: <img alt="en-flag" src={EN} width={24} />,
	},
	{
		code: "ja",
		name: "日本語",
		flag: <img alt="ja-flag" src={JA} width={24} />,
	},
	{
		code: "km",
		name: "ខ្មែរ",
		flag: <img alt="km-flag" src={KM} width={24} />,
	},
	{
		code: "my",
		name: "မြန်မာ",
		flag: <img alt="my-flag" src={MY} width={24} />,
	},
	{
		code: "ne",
		name: "नेपाली",
		flag: <img alt="ne-flag" src={NE} width={24} />,
	},
	{
		code: "th",
		name: "ไทย",
		flag: <img alt="th-flag" src={TH} width={24} />,
	},
	{
		code: "vi",
		name: "Tiếng Việt",
		flag: <img alt="vi-flag" src={VI} width={24} />,
	},
];

interface NavbarLanguageSelectorProps {
	variant?: "dark" | "light";
	className?: string;
}

const NavbarLanguageSelector = ({
	variant = "dark",
	className = "",
}: NavbarLanguageSelectorProps) => {
	const { i18n, t } = useTranslation();

	const handleLanguageChange = (value: string) => {
		i18n.changeLanguage(value);
	};

	const currentLanguage =
		languages.find((lang) => lang.code === i18n.language) || languages[0];

	const triggerClassName =
		variant === "light"
			? `min-w-14 rounded-xl border border-[#148696]/30 bg-white px-2.5 py-2 text-[#004A60] shadow-sm transition-all duration-200 hover:border-[#148696]/60 hover:bg-[#FFF8DE] focus-visible:ring-2 focus-visible:ring-[#148696]/50 sm:min-w-[108px] sm:px-3 ${className}`
			: `min-w-14 rounded-xl border border-white/20 bg-white/8 px-2.5 py-2 text-white shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-white/35 hover:bg-white/14 focus-visible:ring-2 focus-visible:ring-white/50 sm:min-w-[108px] sm:px-3 ${className}`;

	const textClassName =
		variant === "light"
			? "truncate text-sm font-semibold text-[#004A60]"
			: "truncate text-sm font-semibold text-white";

	const flagClassName =
		variant === "light"
			? "flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white shadow-sm"
			: "flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 shadow-sm";

	return (
		<Select.Root onValueChange={handleLanguageChange} value={i18n.language}>
			<Select.Trigger
				aria-label={t("common.language")}
				className={triggerClassName}
				style={{ outline: "none" }}
				variant="soft"
			>
				<Flex
					align="center"
					className="w-full justify-center sm:justify-start"
					gap="2"
				>
					<Flex align="center" gap="2">
						<span className={flagClassName}>{currentLanguage.flag}</span>
						<div className="hidden min-w-0 items-start leading-none sm:flex">
							<span className={textClassName}>{currentLanguage.name}</span>
						</div>
					</Flex>
				</Flex>
			</Select.Trigger>
			<Select.Content
				className="overflow-hidden rounded-2xl border border-gray-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-md"
				position="popper"
				sideOffset={8}
			>
				{languages.map((language) => (
					<Select.Item
						className="rounded-xl px-3 py-2 outline-none transition-colors duration-150 data-highlighted:bg-[#e5edef]"
						key={language.code}
						value={language.code}
					>
						<Flex
							align="center"
							className="min-w-[180px] justify-between"
							gap="3"
						>
							<Flex align="center" gap="2">
								<span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50 shadow-sm">
									{language.flag}
								</span>
								<Text size="2" weight="medium">
									{language.name}
								</Text>
							</Flex>
							{language.code === currentLanguage.code && (
								<span className="rounded-full bg-[#148696]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#004A60]">
									{t("common.active")}
								</span>
							)}
						</Flex>
					</Select.Item>
				))}
			</Select.Content>
		</Select.Root>
	);
};

export default NavbarLanguageSelector;
