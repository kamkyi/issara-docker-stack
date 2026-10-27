import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { Button, Card, Separator, Text } from "@radix-ui/themes";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ManagementLayout } from "$src/layouts/ManagementLayout";
import { authStatus } from "$src/queries/auth";
import landingPageImage from "../assets/img/banner-image/gd-two-workers.jpg";
import mockData from "../assets/mock/latest-in-ilm.json";
import Speedometer from "../components/indicators/Speedometer";
import styles from "./latest-in-ilm.module.css";

// Replace the hardcoded data with imported mockData
const articles = mockData.articles;
const events = mockData.events;
const gauges = mockData.gauges;

export const Route = createFileRoute("/latest-in-ilm")({
	beforeLoad: () => {
		if (!authStatus().isAuthenticated) {
			return redirect({ to: "/" });
		}
		// No group checks, always allow access if authenticated
	},
	component: RouteComponent,
});

function RouteComponent() {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [showLeftArrow, setShowLeftArrow] = useState(false);
	const [showRightArrow, setShowRightArrow] = useState(true);
	const navigate = useNavigate();
	const speedometerContainerRef = useRef<HTMLDivElement>(null);

	// Function to determine speedometer size based on screen width
	const getSpeedometerSize = () => {
		const isMobile = window.innerWidth < 768;
		const isSmallMobile = window.innerWidth < 480;
		// Use the large size from company-dashboard but scale down for mobile
		return {
			width: isSmallMobile ? 140 : isMobile ? 160 : 185,
			height: isSmallMobile ? 140 : isMobile ? 160 : 185,
		};
	};

	// Get initial speedometer dimensions
	const [speedometerDimensions, setSpeedometerDimensions] = useState(
		getSpeedometerSize(),
	);

	// Update dimensions on window resize
	useEffect(() => {
		const handleResize = () => {
			setSpeedometerDimensions(getSpeedometerSize());
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const handleScroll = () => {
		if (scrollRef.current) {
			const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
			setShowLeftArrow(scrollLeft > 0);
			setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1); // Adding small buffer
		}
	};

	const handleWheel = (e: WheelEvent) => {
		e.preventDefault();
		if (scrollRef.current) {
			scrollRef.current.scrollBy({
				left: e.deltaY,
				behavior: "smooth",
			});
		}
	};

	const scrollNext = () => {
		if (scrollRef.current) {
			scrollRef.current.scrollBy({
				left: scrollRef.current.clientWidth / 2,
				behavior: "smooth",
			});
		}
	};

	const scrollPrev = () => {
		if (scrollRef.current) {
			scrollRef.current.scrollBy({
				left: -scrollRef.current.clientWidth / 2,
				behavior: "smooth",
			});
		}
	};

	useEffect(() => {
		const current = scrollRef.current;
		if (current) {
			current.addEventListener("scroll", handleScroll);
			current.addEventListener("wheel", (e) => handleWheel(e), {
				passive: false,
			}); // disable page scroll
			handleScroll();
			return () => {
				current.removeEventListener("scroll", handleScroll);
				current.removeEventListener("wheel", handleWheel);
			};
		}
	}, []);

	return (
		<ManagementLayout>
			<div className="w-full px-4 md:px-6 py-6">
				<div className="flex flex-col gap-6">
					{/* Header section */}
					<div className="flex flex-col md:flex-row gap-6">
						<div className="w-full md:w-1/2 order-2 md:order-1">
							<h1 className="text-2xl font-bold">Inclusive Labor Monitoring</h1>
							<h3 className="text-lg mt-[10px]">
								Connecting workers, communities, and businesses toward
								sustainable, equitable supply chains.
							</h3>
						</div>
						<div className="w-full md:w-1/2 order-1 md:order-2">
							<div className="relative w-full aspect-video">
								<img
									alt="A visual representation of Inclusive Labor Monitoring"
									className="absolute inset-0 w-full h-full object-cover rounded-md"
									src={landingPageImage}
								/>
							</div>
						</div>
					</div>

					<Separator orientation="horizontal" size="4" />

					{/* Welcome section with gauges */}
					<div className="border border-gray-200 rounded-xs p-4">
						<div className="flex flex-col lg:flex-row gap-6">
							{/* Text section */}
							<div className="flex flex-col justify-center lg:w-1/3">
								<h3 className="text-xl">
									Welcome, insert name of <b>ABC company</b>
								</h3>
								<Text className="mt-2">
									Cascading Sustainability Score today&nbsp;
									{new Date().toLocaleDateString()}
								</Text>
								<div className="mt-6">
									<Button
										className={styles.pointer}
										onClick={() => navigate({ to: "/company-dashboard" })}
										variant="outline"
									>
										Company Dashboard
									</Button>
								</div>
							</div>

							{/* Gauges section */}
							<div className="lg:w-2/3" ref={speedometerContainerRef}>
								<div className="grid grid-cols-1 sm:grid-cols-3 w-full gap-4 md:gap-6">
									{gauges.map((gauge, index) => (
										<div
											className="flex flex-col items-center justify-center py-3"
											key={index}
										>
											<Speedometer
												height={speedometerDimensions.height}
												label={gauge.label}
												value={gauge.value}
												width={speedometerDimensions.width}
											/>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* Latest in ILM section */}
					<div className="py-4">
						<h2 className="text-2xl font-bold mb-4">Latest in ILM</h2>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{articles.map((article, index) => (
								<Card
									className="min-h-[230px] flex flex-col justify-between p-4"
									key={index}
								>
									<div className="self-end mb-2">
										<Text color="gray" size="2">
											{article.type}
										</Text>
									</div>
									<div className="self-start">
										<Text as="p" size="3" weight="bold">
											{article.title} {article.date && ` | ${article.date}`}
										</Text>
										{article.author && (
											<Text as="p" color="gray">
												{article.author}
											</Text>
										)}
									</div>
								</Card>
							))}
						</div>
						<div className="flex justify-end mt-4">
							<Button className={styles.pointer} variant="outline">
								More news and insights
							</Button>
						</div>
					</div>

					{/* Events section */}
					<div className="relative mb-5">
						<h2 className="text-2xl font-bold mb-4">Events & Trainings</h2>
						<div className={styles.scrollContainer}>
							<div className={styles.cardsContainer} ref={scrollRef}>
								{events.map((event) => (
									<Card className={styles.eventCard} key={event.id}>
										<div className="absolute inset-0 flex items-center justify-center p-4">
											{/* Event content would go here */}
										</div>
										<span className={styles.eventDate}>{event.date}</span>
									</Card>
								))}
							</div>

							{showLeftArrow && (
								<button
									aria-label="Scroll left"
									className={styles.scrollButtonLeft}
									onClick={scrollPrev}
								>
									<ChevronLeftIcon height={20} width={20} />
								</button>
							)}

							{showRightArrow && (
								<button
									aria-label="Scroll right"
									className={styles.scrollButtonRight}
									onClick={scrollNext}
								>
									<ChevronRightIcon height={20} width={20} />
								</button>
							)}
						</div>
					</div>
				</div>
			</div>
		</ManagementLayout>
	);
}
