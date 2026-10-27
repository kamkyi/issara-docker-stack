import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

/**
 * Captures the current page content and exports it as a PDF.
 * The output is capped at a maximum of MAX_PAGES A4 pages.
 *
 * Strategy:
 *   1. Capture the full scrollable page as one tall canvas via html2canvas.
 *   2. Calculate how many natural A4 pages the content spans.
 *   3. Cap at MAX_PAGES – slice only that portion of the canvas height.
 *   4. Split into A4-sized page slices and add each to jsPDF.
 */

const MAX_PAGES = 3;

const SECTION_PAGE_IDS = ["pdf-page-1", "pdf-page-2", "pdf-page-3"] as const;

const PDF_WIDTH_MM = 210;
const PDF_HEIGHT_MM = 297;

async function captureElement(
	element: HTMLElement,
): Promise<HTMLCanvasElement> {
	return html2canvas(element, {
		scale: 2,
		useCORS: true,
		allowTaint: true,
		logging: false,
		windowWidth: element.scrollWidth,
		windowHeight: element.scrollHeight,
	});
}

function addFullPageImage(pdf: jsPDF, canvas: HTMLCanvasElement, page: number) {
	if (page > 0) {
		pdf.addPage();
	}
	const pageImgData = canvas.toDataURL("image/png");
	const ratio = canvas.width / canvas.height;
	let renderWidth = PDF_WIDTH_MM;
	let renderHeight = renderWidth / ratio;

	if (renderHeight > PDF_HEIGHT_MM) {
		renderHeight = PDF_HEIGHT_MM;
		renderWidth = renderHeight * ratio;
	}

	const x = (PDF_WIDTH_MM - renderWidth) / 2;
	const y = 0;
	pdf.addImage(pageImgData, "PNG", x, y, renderWidth, renderHeight);
}

function addSlicedPages(pdf: jsPDF, canvas: HTMLCanvasElement): void {
	const canvasWidth = canvas.width;
	const canvasHeight = canvas.height;
	const pxPerMm = canvasWidth / PDF_WIDTH_MM;
	const pageHeightPx = PDF_HEIGHT_MM * pxPerMm;
	const totalPages = Math.ceil(canvasHeight / pageHeightPx);
	const usedPages = Math.min(totalPages, MAX_PAGES);
	const effectiveCanvasHeight = Math.min(
		canvasHeight,
		pageHeightPx * MAX_PAGES,
	);

	for (let page = 0; page < usedPages; page++) {
		if (page > 0) {
			pdf.addPage();
		}

		const sourceY = Math.round(page * pageHeightPx);
		const sourceH = Math.min(pageHeightPx, effectiveCanvasHeight - sourceY);

		const pageCanvas = document.createElement("canvas");
		pageCanvas.width = canvasWidth;
		pageCanvas.height = Math.round(sourceH);

		const ctx = pageCanvas.getContext("2d");
		if (!ctx) continue;

		ctx.drawImage(
			canvas,
			0,
			sourceY,
			canvasWidth,
			Math.round(sourceH),
			0,
			0,
			canvasWidth,
			Math.round(sourceH),
		);

		const pageImgData = pageCanvas.toDataURL("image/png");
		const sliceHeightMm = sourceH / pxPerMm;
		pdf.addImage(pageImgData, "PNG", 0, 0, PDF_WIDTH_MM, sliceHeightMm);
	}
}

export const handleExportPDF = async (): Promise<void> => {
	// Prefer explicit page break sections, fallback to root/body slicing.
	const pageSections = SECTION_PAGE_IDS.map((id) =>
		document.getElementById(id),
	).filter((el): el is HTMLElement => el instanceof HTMLElement);
	const fallbackElement =
		(document.getElementById("dashboard-pdf-root") as HTMLElement | null) ??
		document.body;

	// Temporarily hide elements tagged as no-print
	const noPrintEls = document.querySelectorAll<HTMLElement>(".no-print");
	const printOnlyEls = document.querySelectorAll<HTMLElement>(".print-only");

	// Hide no-print elements, show print-only elements
	for (const el of noPrintEls) {
		el.style.setProperty("visibility", "hidden");
		el.style.setProperty("position", "absolute");
	}
	for (const el of printOnlyEls) {
		el.style.removeProperty("display");
	}

	try {
		// Build the jsPDF document
		const pdf = new jsPDF({
			orientation: "portrait",
			unit: "mm",
			format: "a4",
		});

		if (pageSections.length > 0) {
			const sectionsToExport = pageSections.slice(0, MAX_PAGES);
			for (const [idx, section] of sectionsToExport.entries()) {
				const canvas = await captureElement(section);
				addFullPageImage(pdf, canvas, idx);
			}
		} else {
			const fallbackCanvas = await captureElement(fallbackElement);
			addSlicedPages(pdf, fallbackCanvas);
		}

		pdf.save(`cascade-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`);
	} finally {
		// Always restore the DOM
		for (const el of noPrintEls) {
			el.style.removeProperty("visibility");
			el.style.removeProperty("position");
		}
		for (const el of printOnlyEls) {
			el.style.setProperty("display", "none");
		}
	}
};
