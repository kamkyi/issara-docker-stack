import { Heading } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { useMemo } from "react";
import landingPageImage from "$src/assets/img/banner-image/gd-two-workers.jpg";
import issaraGroupPhoto from "$src/assets/img/issara_group_photo.jpg";
import ethicalRecruitmentSeafood from "$src/assets/img/our_services/ethical_recruitment_in_the_seafood_industry_1.jpeg";
import ourWorkspaceLandingPage from "$src/assets/img/our_workspace_landing_page.jpg";
import event from "$src/assets/img/thumbnails/event.jpg";
import ideaBoard from "$src/assets/img/thumbnails/idea-board.jpg";
import workerVoiceGroupMeeting from "$src/assets/img/thumbnails/worker-voice-group-meeting.png";
import styles from "./ThumbnailGrid.module.css";

const IMAGES = [
	{
		src: ethicalRecruitmentSeafood,
		title: "Community Education",
		desc: "Programs and workshops.",
	},
	{
		src: issaraGroupPhoto,
		title: "Volunteer Work",
		desc: "Our volunteers in action.",
	},
	{
		src: ourWorkspaceLandingPage,
		title: "Fundraising",
		desc: "Events and campaigns.",
	},
	{
		src: ideaBoard,
		title: "Medical Aid",
		desc: "Health outreach programs.",
	},
	{
		src: event,
		title: "Food Distribution",
		desc: "Feeding families in need.",
	},
	{
		src: workerVoiceGroupMeeting,
		title: "Education Support",
		desc: "Scholarships and supplies.",
	},
	{
		src: landingPageImage,
		title: "Shelter Projects",
		desc: "Housing initiatives.",
	},
	{
		src: ethicalRecruitmentSeafood,
		title: "Clean Water",
		desc: "Water access programs.",
	},
];

export function ThumbnailGrid() {
	const seeds = useMemo(() => {
		return IMAGES.map(() => {
			const x = Math.round((Math.random() - 0.5) * 80); // -40..40
			const y = Math.round(20 + Math.random() * 60); // 20..80
			const delay = Number((Math.random() * 0.4).toFixed(2));
			return { x, y, delay };
		});
	}, []);
	return (
		<section aria-label="Gallery thumbnails" className={styles.wrapper}>
			<div className="text-center mb-12">
				<Heading
					className="text-[#148696] animated-underline text-2xl sm:text-3xl md:text-5xl lg:text-6xl"
					mb={"6"}
					size={"9"}
				>
					Executive Board
				</Heading>
				<div className={styles.grid}>
					{IMAGES.map((it, i) => (
						<motion.button
							aria-describedby={`thumb-desc-${i}`}
							aria-labelledby={`thumb-title-${i}`}
							className={styles.thumb}
							initial={{ opacity: 0 }}
							key={i}
							transition={{ duration: 0.7, delay: seeds[i].delay }}
							type="button"
							viewport={{ once: true, amount: 0.2 }}
							whileInView={{ opacity: 1, x: 0, y: 0 }}
						>
							{/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
							<img alt={`${it.title} thumbnail`} src={it.src} />
							<motion.div
								className={styles.caption}
								initial="hidden"
								variants={{
									hidden: { opacity: 0 },
									visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
								}}
								whileHover="visible"
							>
								<div className={styles.captionInner}>
									<motion.div
										className={styles.captionTitle}
										id={`thumb-title-${i}`}
										transition={{ duration: 0.3 }}
										variants={{
											hidden: { opacity: 0, y: -20 },
											visible: { opacity: 1, y: 0 },
										}}
										// whileHover={{ scale: 1.05 }}
									>
										{it.title}
									</motion.div>
									<motion.div
										className={styles.captionDesc}
										id={`thumb-desc-${i}`}
										transition={{ duration: 0.3 }}
										variants={{
											hidden: { opacity: 0, y: -50 },
											visible: { opacity: 1, y: 0 },
										}}
									>
										{it.desc}
									</motion.div>
								</div>
							</motion.div>
						</motion.button>
					))}
				</div>
			</div>
		</section>
	);
}

export default ThumbnailGrid;
