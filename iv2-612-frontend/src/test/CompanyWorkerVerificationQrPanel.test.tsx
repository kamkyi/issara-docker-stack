import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CompanyWorkerVerificationQrPanel, {
	DEFAULT_QR_SIZE,
	QR_SIZE_STEP,
} from "$src/components/company-profile/CompanyWorkerVerificationQrPanel";

vi.mock("$src/hooks/useTranslation", () => ({
	useTranslation: () => ({
		t: (key: string) =>
			(
				({
					"companyProfilePage.workerQr.title": "Worker Verification QR",
					"companyProfilePage.workerQr.subtitle":
						"Workers can scan this from GD Lite to request company verification.",
					"companyProfilePage.workerQr.defaultCompanyName": "Company profile",
					"companyProfilePage.workerQr.zoomOutAria":
						"Zoom out worker verification QR",
					"companyProfilePage.workerQr.resetZoomAria":
						"Reset worker verification QR zoom",
					"companyProfilePage.workerQr.zoomInAria":
						"Zoom in worker verification QR",
					"companyProfilePage.workerQr.copyLinkAria":
						"Copy worker verification QR link",
					"companyProfilePage.workerQr.unavailable":
						"Worker QR is unavailable because this company profile has no supplier ID.",
					"companyProfilePage.workerQr.copySuccess": "Worker QR link copied.",
					"companyProfilePage.workerQr.copyError":
						"Unable to copy worker QR link.",
				}) as Record<string, string>
			)[key] ?? key,
	}),
}));

const getRenderedQr = (container: HTMLElement) => {
	const qr = container.querySelector('[data-testid="worker-verification-qr"]');
	if (!qr) {
		throw new Error("Expected QR SVG to be rendered.");
	}
	return qr;
};

describe("CompanyWorkerVerificationQrPanel", () => {
	it("renders the company QR directly without a show QR button", () => {
		const { container } = render(
			<CompanyWorkerVerificationQrPanel
				companyName="Supplier One"
				targetUrl="gdlite://worker-verification?source=worker-qr&targetToken=abc123"
			/>,
		);

		expect(
			screen.getByRole("heading", { name: /worker verification qr/i }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /show qr/i }),
		).not.toBeInTheDocument();
		expect(screen.getByText("Supplier One")).toBeInTheDocument();
		expect(getRenderedQr(container)).toHaveAttribute(
			"height",
			String(DEFAULT_QR_SIZE),
		);
	});

	it("supports zooming the rendered QR in, out, and back to default", async () => {
		const user = userEvent.setup();
		const { container } = render(
			<CompanyWorkerVerificationQrPanel
				companyName="Supplier One"
				targetUrl="gdlite://worker-verification?source=worker-qr&targetToken=abc123"
			/>,
		);

		await user.click(
			screen.getByRole("button", {
				name: /zoom in worker verification qr/i,
			}),
		);
		expect(getRenderedQr(container)).toHaveAttribute(
			"height",
			String(DEFAULT_QR_SIZE + QR_SIZE_STEP),
		);

		await user.click(
			screen.getByRole("button", {
				name: /zoom out worker verification qr/i,
			}),
		);
		expect(getRenderedQr(container)).toHaveAttribute(
			"height",
			String(DEFAULT_QR_SIZE),
		);

		await user.click(
			screen.getByRole("button", {
				name: /zoom in worker verification qr/i,
			}),
		);
		await user.click(
			screen.getByRole("button", {
				name: /reset worker verification qr zoom/i,
			}),
		);
		expect(getRenderedQr(container)).toHaveAttribute(
			"height",
			String(DEFAULT_QR_SIZE),
		);
	});

	it("shows an unavailable state when no target URL is available", () => {
		const { container } = render(
			<CompanyWorkerVerificationQrPanel companyName="Supplier One" />,
		);

		expect(
			screen.getByText(
				/worker qr is unavailable because this company profile has no supplier id/i,
			),
		).toBeInTheDocument();
		expect(
			container.querySelector('[data-testid="worker-verification-qr"]'),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", {
				name: /zoom in worker verification qr/i,
			}),
		).toBeDisabled();
	});
});
