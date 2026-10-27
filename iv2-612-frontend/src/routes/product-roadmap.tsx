import { createFileRoute } from "@tanstack/react-router";
import ProductRoadmap from "$components/routes/ProductRoadmap";
import { GuestLayout } from "$src/layouts/GuestLayout";

export const Route = createFileRoute("/product-roadmap")({
	validateSearch: (search: Record<string, unknown>) => {
		return {
			tab: search.tab as string | undefined,
		};
	},
	component: () => (
		<GuestLayout>
			<ProductRoadmap />
		</GuestLayout>
	),
});
