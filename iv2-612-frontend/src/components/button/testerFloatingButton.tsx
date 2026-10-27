import { SupervisorAccount } from "@mui/icons-material";
import SettingsIcon from "@mui/icons-material/Settings";
import {
	ColorWheelIcon,
	ComponentInstanceIcon,
	Cross1Icon,
	Link2Icon,
	MagnifyingGlassIcon,
	PersonIcon,
	ResetIcon,
} from "@radix-ui/react-icons";
import { Button, Card, Flex, Grid, Text } from "@radix-ui/themes";
import * as motion from "motion/react-client";
import { useState } from "react";
// import { isILMManagement } from "$src/utils/account";
import { showToast } from "$src/components/toast/toastUtil";
import useAuthData from "$src/store/store.auth";
import { getHomeRoute } from "$src/utils/homeRoute";
import { useViewModeStore, type ViewMode } from "../../store/viewModeStore";

// Custom hook for view mode management (now using Zustand)
export const useViewMode = () => {
	const { viewMode, setViewMode } = useViewModeStore();

	const updateViewMode = (mode: ViewMode) => {
		setViewMode(mode);
		// Trigger a custom event to notify other components
		window.dispatchEvent(new CustomEvent("viewModeChanged", { detail: mode }));
	};

	return { viewMode, updateViewMode };
};

const CascadeFloatingButton = () => {
	const { role } = useAuthData();
	// Call hooks unconditionally to satisfy rules of hooks
	const [isOpenSetting, setIsOpenSetting] = useState(false);
	const { viewMode, updateViewMode } = useViewMode();

	// Only render the settings for tester users
	if (
		role !== "org-test-user" &&
		role !== "org-issara-management" &&
		role !== "org-issara-staff"
	)
		return null;

	const _handleSettingClick = () => {
		setIsOpenSetting(!isOpenSetting);
	};

	const handleRoleSelect = (roleId: ViewMode) => {
		updateViewMode(roleId);
		setIsOpenSetting(false); // Close the panel after selection
	};

	// navigate to appropriate dashboard after view change

	const handleRoleSelectAndNavigate = (roleId: ViewMode) => {
		handleRoleSelect(roleId);
		// Full page load so the layout, theme and data fully re-initialize for the
		// new view (avoids stale backgrounds/styles when switching views).
		window.location.assign(getHomeRoute(role, roleId));
	};

	const handleResetToDefault = () => {
		const { resetToDefault } = useViewModeStore.getState();
		resetToDefault();
		setIsOpenSetting(false);
		showToast.info("View reset to default", { duration: 2500 });
		// Trigger event to notify other components
		window.dispatchEvent(
			new CustomEvent("viewModeChanged", { detail: "tester-view" }),
		);
	};

	const roles: Array<{
		id: ViewMode;
		label: string;
		icon: React.ComponentType;
		description: string;
		visible: boolean;
	}> = [
		{
			id: "buyer-view",
			label: "Buyer",
			icon: PersonIcon,
			description: "View as a buyer/client",
			visible: true,
		},
		{
			id: "supplier-view",
			label: "Supplier",
			icon: ComponentInstanceIcon,
			description: "View as a supplier",
			visible: true,
		},
		{
			id: "ra-view",
			label: "Recruitment Agency",
			icon: Link2Icon,
			description: "View as recruitment agency",
			visible: true,
		},
		{
			id: "tester-view",
			label: "Tester",
			icon: MagnifyingGlassIcon,
			description: "View as a tester",
			visible: role !== "org-test-user",
		},
		{
			id: "ilm-view",
			label: "Issara Management",
			icon: SupervisorAccount,
			description: "View as Issara management",
			visible: role !== "org-test-user",
		},
		{
			id: "cso-view",
			label: "CSO",
			icon: ColorWheelIcon,
			description: "View as CSO",
			visible: role !== "org-test-user",
		},
	];

	return (
		<div className="absolute w-1/2">
			<div
				className="transition duration-400 transform text-white cursor-pointer hover:shadow-md fixed w-13 h-13 hover:scale-110 shadow bottom-10 bg-[#ffc658] rounded-full flex items-center justify-center left-10 hover-bg-[#ddd]"
				onClick={_handleSettingClick}
				style={{
					opacity: isOpenSetting ? 1 : "undefined",
				}}
			>
				<SettingsIcon
					className="hover:scale-140 hover:rotate-90 transition duration-400 transform rotate-0 ease-in-out"
					style={{
						fontSize: 30,
					}}
				/>
			</div>
			{isOpenSetting && (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="bottom-28 left-10 fixed z-1000 w-96 pe-4"
					exit={{ opacity: 0, y: 20 }}
					initial={{ opacity: 0, y: 40 }}
					transition={{ duration: 0.3 }}
				>
					<Card className="backdrop-blur-xl relative p-4">
						<Cross1Icon
							className="absolute end-3 top-3 cursor-pointer hover:scale-110 transition-transform"
							onClick={_handleSettingClick}
						/>
						<Text className="block" mb="3" size="3" weight="bold">
							Hello Tester! 👋
						</Text>
						<Text className="block mb-4" size="2">
							Please select the UI that you would like to test. We look forward
							to your comments and requests through our feature flags - please
							note the "Got feedback?" tabs on the right side of each page.
							Happy testing!
						</Text>

						<Grid className="mt-4" columns="2" gap="3">
							{roles.map((role) => {
								const IconComponent = role.icon;
								const isSelected = viewMode === role.id;
								if (!role.visible) return null; // Skip rendering if not visible
								return (
									<Card
										className={`p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
											isSelected
												? "outline-[#148696] outline-2 shadow-md"
												: "hover:border-gray-300"
										}`}
										key={role.id}
										onClick={() => handleRoleSelectAndNavigate(role.id)}
									>
										<Flex align="center" direction="column" gap="2">
											<Flex align="center" className="w-full" gap="2">
												<div
													className={`p-2 rounded-full transition-colors ${
														isSelected
															? "bg-[#148696] text-white"
															: "bg-gray-100 text-gray-600"
													}`}
												>
													<IconComponent />
												</div>
											</Flex>
											<Flex align="center" direction="column" gap="1">
												<Text size="2" weight="medium">
													{role.label}
												</Text>
												<Text className={`text-center`} size="1">
													{role.description}
												</Text>
											</Flex>
										</Flex>
									</Card>
								);
							})}
						</Grid>

						<Flex className="mt-4" justify="center">
							<Button
								className="cursor-pointer"
								color="gray"
								onClick={handleResetToDefault}
								variant="soft"
							>
								<ResetIcon />
								Reset to Default
							</Button>
						</Flex>
					</Card>
				</motion.div>
			)}
		</div>
	);
};

export default CascadeFloatingButton;
