import { expect, test } from "@playwright/test";

test("renders a basic page without network dependencies", async ({ page }) => {
	await page.setContent(`
		<!doctype html>
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<title>ILM Facelift Playwright Smoke Test</title>
			</head>
			<body>
				<main>
					<h1>Playwright check is running</h1>
					<button type="button">Continue</button>
				</main>
			</body>
		</html>
	`);

	await expect(page).toHaveTitle(/ILM Facelift Playwright Smoke Test/);
	await expect(
		page.getByRole("heading", { name: "Playwright check is running" }),
	).toBeVisible();
	await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
});
