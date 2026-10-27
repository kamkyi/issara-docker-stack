import { Card } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { useRatingCriteries } from "$src/hooks/useRatingCriteries";
import EmojiRatings from "../emojiRatings/emojiRatings";

interface ScoreCriteria {
	rating_criteria_id: number;
	score: number;
	count: number;
}

interface OverallRatingProps {
	reviews: number;
	rating: number;
	scoresForEachCriteria: ScoreCriteria[];
}

const OverallRating = ({
	reviews,
	rating,
	scoresForEachCriteria,
}: OverallRatingProps) => {
	const { t } = useTranslation();
	const { data: ratingCriteries = [] } = useRatingCriteries();
	const params = new URLSearchParams(window.location.search);

	const id = params.get("id");
	const type = params.get("type");

	const ratingScoresByCriteria = scoresForEachCriteria
		? scoresForEachCriteria.map((score) => ({
				...score,
				label:
					ratingCriteries?.find(
						(criteria) => criteria.id === score.rating_criteria_id,
					)?.name || t("memberDirectoryDetail.overallRating.unknownCriteria"),
			}))
		: [];

	const renderStars = (score: number) => {
		const rounded = Math.round(score);
		return Array.from({ length: 5 }, (_, index) => (
			<span
				className={index < rounded ? "text-[#f5a524]" : "text-gray-300"}
				key={index}
			>
				{index < rounded ? "★" : "☆"}
			</span>
		));
	};

	return (
		<Card>
			{id === "18136" && type === "Supplier" ? null : (
				<>
					<div className="items-center justify-center mb-4">
						<div className="md:col-span-2">
							<div className="text-center flex flex-col items-center">
								<p className="font-bold mb-2 text-xl">
									Overall Rating by Workers in Golden Dreams
								</p>
								<EmojiRatings score={rating} />
								{t("memberDirectoryDetail.overallRating.reviews", {
									count: reviews ?? 0,
								})}
							</div>
						</div>

						{/* <div className="col-span-4 p-2">
							<ProgressBarChart
								color="#148696"
								completed={(categories["Very Satisfied"] / totalCriteria) * 100}
								height="4px"
								label="Very Satisfied"
							/>
							<ProgressBarChart
								color="#148696"
								completed={(categories.Satisfied / totalCriteria) * 100}
								height="4px"
								label="Satisfied"
							/>
							<ProgressBarChart
								color="#148696"
								completed={(categories.Neutral / totalCriteria) * 100}
								height="4px"
								label="Neutral"
							/>
							<ProgressBarChart
								color="#148696"
								completed={(categories.Unsatisfied / totalCriteria) * 100}
								height="4px"
								label="Unsatisfied"
							/>
							<ProgressBarChart
								color="#148696"
								completed={(categories["Very Unsatisfied"] / totalCriteria) * 100}
								height="4px"
								label="Very Unsatisfied"
							/>
						</div> */}
					</div>
					<hr className="opacity-10 my-2" />
				</>
			)}

			<div className="grid grid-cols-1 gap-2">
				{ratingScoresByCriteria.map((category) => (
					<div
						className="flex flex-col gap-2 rounded-md border border-gray-100 p-3 md:flex-row md:items-center md:justify-between"
						key={category.rating_criteria_id}
					>
						<p className="text-sm font-bold leading-snug">{category.label}</p>
						<div className="flex shrink-0 items-center gap-2 text-sm">
							<span
								aria-label={`${category.score.toFixed(1)} out of 5`}
								className="text-base leading-none"
								role="img"
							>
								{renderStars(category.score)}
							</span>
							<span className="font-medium">
								{category.score.toFixed(1)} ({category.count})
							</span>
						</div>
					</div>
				))}
			</div>
		</Card>
	);
};

export default OverallRating;
