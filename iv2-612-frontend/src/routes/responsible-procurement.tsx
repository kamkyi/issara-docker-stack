import { ChatBubbleIcon } from "@radix-ui/react-icons";
import {
	AspectRatio,
	Box,
	Container,
	Flex,
	Grid,
	Separator,
	Text,
} from "@radix-ui/themes";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import CascadeButton from "$src/components/button/button";
import { ResponsibleProcurementModal } from "$src/components/modals/ResponsibleProcurement"; // Import the new modal component
import { SuccessModal } from "$src/components/modals/SuccessModal"; // Import the SuccessModal
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import useAuthData from "$src/store/store.auth";
import { useViewModeStore } from "$src/store/viewModeStore";
import { isRecruiter, isSupplier } from "$src/utils/account";
import { requireRecruiterSupplierAuth } from "$src/utils/auth";
import landingPageImage from "../assets/img/banner-image/gd-two-workers.jpg";
import styles from "./responsible-procurement.module.css";

export const Route = createFileRoute("/responsible-procurement")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireRecruiterSupplierAuth({ isAuthenticated, role });
		// No group checks, always allow access if authenticated
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();
	// State to manage the visibility of the feedback modal
	const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
	// State to manage the visibility of the success modal
	const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

	const { role } = useAuthData() as { role: string | "" };
	const { viewMode } = useViewModeStore();

	// Handler for opening the feedback modal
	const handleOpenFeedbackModal = (
		type: "org-supplier" | "org-recruitment-agency",
	) => {
		localStorage.setItem("feedbackType", type); // Store the feedback type in localStorage
		setIsFeedbackModalOpen(true);
	};

	// Handler for closing the feedback modal
	const handleCloseFeedbackModal = () => {
		setIsFeedbackModalOpen(false);
	};

	// Handler for submitting the feedback form (called from the modal)
	const handleSubmitFeedback = (feedbackData: any): void => {
		console.log("Feedback submitted:", feedbackData); // Process the feedback data here
		// Close the feedback modal
		handleCloseFeedbackModal();
		// Open the success modal
		setIsSuccessModalOpen(true);
	};

	// Handler for closing the success modal
	const handleCloseSuccessModal = () => {
		setIsSuccessModalOpen(false);
	};

	// const flags = useFlags([
	//   'better_buying_feedback_single_button'
	// ]) as Record<string, IFlagsmithFeature | undefined>

	return (
		<GuestLayout>
			<Container
				className={`${styles.container} ${styles.containerPadding}`}
				size="4"
			>
				<Box>
					<Flex align="center" direction="row" gap="4" wrap="wrap">
						<Box className={`${styles.textBox} ${styles.flex1}`}>
							<h1 className="mb-xl font-black text-[#004A60] uppercase tracking-[-0.022em]">
								{t("responsibleProcurement.pageTitle")}
							</h1>
							<h3 className="text-lg font-bold text-[#004A60]">
								{t("responsibleProcurement.subtitle")}
							</h3>
						</Box>
						<Box className={`${styles.imageBox} ${styles.flex1}`}>
							<AspectRatio ratio={16 / 9}>
								<img
									alt={t("responsibleProcurement.bannerAlt")}
									className={styles.aspectImage}
									src={landingPageImage}
								/>
							</AspectRatio>
						</Box>
					</Flex>
					<Separator mb="6" mt="6" orientation="horizontal" size="4" />
				</Box>

				<Box>
					<Flex direction="column" gap="4">
						<Grid columns="1" gap="3" justify="center" mb={"4"}>
							<Text>{t("responsibleProcurement.intro")}</Text>
						</Grid>

						{/* Button to trigger the feedback modal */}

						{isSupplier(role) ||
						viewMode === "supplier-view" ||
						viewMode === "tester-view" ? (
							<CascadeButton
								buttonText={t("responsibleProcurement.feedbackAsSupplier")}
								handleOnClick={() => handleOpenFeedbackModal("org-supplier")}
								iconLeft={<ChatBubbleIcon width={20} />}
								size="4"
								variant="outline"
							/>
						) : null}
						{isRecruiter(role) ||
						viewMode === "ra-view" ||
						viewMode === "tester-view" ? (
							<CascadeButton
								buttonText={t(
									"responsibleProcurement.feedbackAsRecruitmentAgency",
								)}
								handleOnClick={() =>
									handleOpenFeedbackModal("org-recruitment-agency")
								}
								iconLeft={<ChatBubbleIcon width={20} />}
								size="4"
								variant="outline"
							/>
						) : null}

						{/* Render the AlertModal component */}

						{/* <FeedbackTypeOptionModal
              open={isFeedbackOptionModalOpen}
              title={'Provide Anonymous Feedback as a'}
              optionsData={[{
                id: '1',
                label: 'Supplier', 
              },
              {
                id: '2',
                label: 'Recruitment Agency',
              }]}
              onClose={()=>setIsFeedbackOptionModalOpen(false)}
              onClickOption={handleOpenFeedbackModal}
            /> */}

						{/* Render the ResponsibleProcurementModal component */}
						<ResponsibleProcurementModal
							isOpen={isFeedbackModalOpen}
							onClose={handleCloseFeedbackModal}
							onSubmit={handleSubmitFeedback}
						/>

						{/* Render the SuccessModal component */}
						<SuccessModal
							isOpen={isSuccessModalOpen}
							message={t("responsibleProcurement.thankYouMessage")}
							onClose={handleCloseSuccessModal}
							title={t("responsibleProcurement.thankYouTitle")}
						/>
					</Flex>
				</Box>
			</Container>
		</GuestLayout>
	);
}
