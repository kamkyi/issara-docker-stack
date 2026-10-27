import { motion } from "framer-motion";
import React, { useState } from "react";
import styles from "./CardCarousel.module.css";

type Props = {
	children: React.ReactNode;
};

const CardCarousel: React.FC<Props> = ({ children }) => {
	const items = React.Children.toArray(children);
	const [index, setIndex] = useState(0);

	const prev = () => setIndex((i) => (i - 1 + items.length) % items.length);
	const next = () => setIndex((i) => (i + 1) % items.length);

	const variants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.5, ease: "easeOut" as const },
		},
	};

	return (
		<div>
			<div className={styles.viewport}>
				<div className={styles.nav}>
					<button
						aria-label="Previous"
						className={styles.navButton}
						onClick={prev}
					>
						‹
					</button>
					<button aria-label="Next" className={styles.navButton} onClick={next}>
						›
					</button>
				</div>

				<motion.div
					animate={{ x: `-${index * 100}%` }}
					className={styles.track}
					transition={{ type: "spring", stiffness: 300, damping: 30 }}
				>
					{items.map((child, i) => (
						<motion.div
							animate={i === index ? "visible" : "hidden"}
							className={styles.slide}
							initial="hidden"
							key={i}
							variants={variants}
						>
							{child}
						</motion.div>
					))}
				</motion.div>
			</div>

			<div className={styles.dots}>
				{items.map((_, i) => (
					<button
						aria-label={`Go to slide ${i + 1}`}
						className={`${styles.dot} ${i === index ? styles.active : ""}`}
						key={i}
						onClick={() => setIndex(i)}
					/>
				))}
			</div>
		</div>
	);
};

export default CardCarousel;
