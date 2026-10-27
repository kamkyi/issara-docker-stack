import { Button } from "@radix-ui/themes";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

interface WorkplanningButtonsProps {
	isBuyerView: boolean;
}

const WorkplanningButtons = ({ isBuyerView }: WorkplanningButtonsProps) => {
	const navigate = useNavigate();
	const { t } = useTranslation();
	if (isBuyerView) return null;

	return (
		<div className="mt-8 flex gap-4">
			<Button
				className="rounded-full px-8 py-2 text-base hover:scale-105 transition-transform shadow-md hover:shadow-lg focus:ring-2 focus:ring-[#2dd4bf] focus:outline-none cursor-pointer"
				onClick={() => navigate({ to: "/social-responsibility-workplan" })}
				size="3"
				style={{
					background: "#1AAEC3",
					color: "#fff",
					fontWeight: 600,
					border: "none",
					boxShadow: "0 2px 8px 0 rgba(20,184,166,0.10)",
				}}
			>
				{t("socialResponsibilityWorkplan.hero.title")}
			</Button>
			<Button
				className="rounded-full px-8 py-2 text-base hover:scale-105 transition-transform shadow-md hover:shadow-lg focus:ring-2 focus:ring-[#2dd4bf] focus:outline-none cursor-pointer"
				onClick={() => navigate({ to: "/continuous-improvement" })}
				size="3"
				style={{
					background: "#004A60",
					color: "#fff",
					fontWeight: 600,
					border: "none",
					boxShadow: "0 2px 8px 0 rgba(20,184,166,0.10)",
				}}
			>
				Oceans Workplanning
			</Button>
		</div>
	);
};

export default WorkplanningButtons;
