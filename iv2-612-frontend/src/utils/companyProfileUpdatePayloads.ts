type NumericStringValues = Record<string, string>;

const buildNumericPayload = (
	values: NumericStringValues,
): Record<string, number | null> =>
	Object.entries(values).reduce(
		(acc, [key, value]) => {
			const trimmedValue = value.trim();
			if (trimmedValue === "") {
				acc[key] = null;
				return acc;
			}

			const numericValue = Number(trimmedValue);
			acc[key] = Number.isFinite(numericValue) ? numericValue : null;
			return acc;
		},
		{} as Record<string, number | null>,
	);

export const buildBasicInformationUpdatePayload = ({
	name,
	address,
	website,
	background,
	countryId,
	image,
	industryIds,
	productCategoryIds,
}: {
	name: string;
	address: string;
	website: string;
	background: string;
	countryId: string;
	image: string;
	industryIds: number[];
	productCategoryIds: number[];
}) => ({
	partner: {
		name: name.trim(),
		address: address.trim(),
		website,
		background: background.trim(),
		country_id: countryId ? Number(countryId) : null,
		image: image.trim() !== "" ? image.trim() : null,
	},
	sourcing: {
		industry_ids: industryIds,
		product_category_ids: productCategoryIds,
	},
});

export const buildWorkforceBreakdownUpdatePayload = (
	values: NumericStringValues,
	genderValues: NumericStringValues,
) => ({
	partner: {
		...buildNumericPayload(values),
		...buildNumericPayload(genderValues),
	},
});
