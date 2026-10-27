import { createFileRoute } from "@tanstack/react-router";
import { BookADemo } from "$src/components/routes/BookADemo";

export const Route = createFileRoute("/book-a-demo")({
	component: BookADemo,
});
