function RatingStars({ score }: { score: number | null }) {
	if (!score) {
		return null;
	}

	const fullStars = Math.round(score);
	const hasHalfStar = score - fullStars >= 0.5;
	const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

	return (
		<div className="rating-stars gap-1 inline-flex">
			{Array.from({ length: fullStars }, (_, index) => (
				<span
					key={`full-${index}`}
					style={{
						color: "#eab308",
						// textShadow: "1px 1px 1px #b45309",
					}}
				>
					★
				</span>
			))}
			{/* {hasHalfStar && (
				<span
					style={{
						color: "#eab308",
						// textShadow: "1px 1px 1px #b45309",
					}}
				>
					½
				</span>
			)} */}
			{Array.from({ length: emptyStars }, (_, index) => (
				<span
					key={`empty-${index}`}
					style={{
						color: "lightgray",
						// textShadow: "1px 1px 1px #aaa",
					}}
				>
					★
				</span>
			))}
		</div>
	);
}

export default RatingStars;
