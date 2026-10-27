import { Box } from "@radix-ui/themes";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { WorkplanActivities } from "$src/components/workplan/WorkplanActivities";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import useMemberdirectory from "$src/store/store.memberdirectory";
import { requireSupplierAuth } from "$src/utils/auth";
import landingPageImage from "../assets/img/banner-image/gd-two-workers.jpg";

export const Route = createFileRoute("/social-responsibility-workplan")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireSupplierAuth({ isAuthenticated, role });
	},
	component: RouteComponent,
});

function RouteComponent() {
	const scrollRef = useRef<HTMLDivElement>(null);
	const { t } = useTranslation();

	const handleWheel = (e: WheelEvent) => {
		e.preventDefault();
		if (scrollRef.current) {
			scrollRef.current.scrollBy({
				left: e.deltaY,
				behavior: "smooth",
			});
		}
	};

	useEffect(() => {
		const current = scrollRef.current;
		if (current) {
			current.addEventListener("wheel", handleWheel, { passive: false });
			return () => current.removeEventListener("wheel", handleWheel);
		}
	}, []);

	const { updateBannerImg } = useMemberdirectory();

	useEffect(() => {
		updateBannerImg(landingPageImage);
	}, [updateBannerImg]);

	return (
		<GuestLayout>
			{/* Header section with golden ratio and improved alignment */}
			<div className="relative container mx-auto px-l py-xl z-10">
				<div className="grid grid-cols-1 md:grid-cols-13 gap-10 items-center">
					{/* Left content: ~62% */}
					<div className="md:col-span-8 flex flex-col justify-center order-2 md:order-1">
						<h1 className="text-4xl font-black uppercase mb-4 leading-tight text-white max-w-2xl">
							{t("socialResponsibilityWorkplan.hero.title")}
						</h1>
						<p className="leading-relaxed text-lg text-white bg-[#004A60] p-4 rounded-sm">
							&bull; &nbsp;{t("socialResponsibilityWorkplan.hero.description")}
						</p>
					</div>
				</div>
			</div>
			<div className="relative container mx-auto px-l py-xl z-10">
				<Box>
					<section className="w-full mb-8">
						<div className="flex flex-col items-center gap-6 p-4 bg-gray-50 rounded-md w-full">
							<WorkplanActivities />
						</div>
					</section>
				</Box>
			</div>
		</GuestLayout>
	);
}
