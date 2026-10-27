import {
	ClipboardCopyIcon,
	MinusIcon,
	PlusIcon,
	ResetIcon,
} from "@radix-ui/react-icons";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { showToast } from "$src/components/toast/toastUtil";
import { useTranslation } from "$src/hooks/useTranslation";

interface CompanyWorkerVerificationQrPanelProps {
	companyName?: string | null;
	targetUrl?: string | null;
}

const MIN_QR_SIZE = 180;
const MAX_QR_SIZE = 420;
const DEFAULT_QR_SIZE = 260;
const QR_SIZE_STEP = 40;

const clampQrSize = (size: number) =>
	Math.min(MAX_QR_SIZE, Math.max(MIN_QR_SIZE, size));

export default function CompanyWorkerVerificationQrPanel({
	companyName,
	targetUrl,
}: CompanyWorkerVerificationQrPanelProps) {
	const { t } = useTranslation();
	const [qrSize, setQrSize] = useState(DEFAULT_QR_SIZE);
	const displayName =
		companyName?.trim() || t("companyProfilePage.workerQr.defaultCompanyName");
	const canZoomOut = qrSize > MIN_QR_SIZE;
	const canZoomIn = qrSize < MAX_QR_SIZE;

	const updateQrSize = (nextSize: number) => {
		setQrSize(clampQrSize(nextSize));
	};

	const handleCopyLink = async () => {
		if (!targetUrl) return;

		try {
			await navigator.clipboard.writeText(targetUrl);
			showToast.success(t("companyProfilePage.workerQr.copySuccess"));
		} catch {
			showToast.error(t("companyProfilePage.workerQr.copyError"));
		}
	};

	return (
		<section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
			<div className="flex flex-col gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="font-heading text-xl font-semibold text-gray-900">
						{t("companyProfilePage.workerQr.title")}
					</h2>
					<p className="mt-2 text-sm text-gray-600">
						{t("companyProfilePage.workerQr.subtitle")}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						aria-label={t("companyProfilePage.workerQr.zoomOutAria")}
						className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] disabled:cursor-not-allowed disabled:opacity-40"
						disabled={!targetUrl || !canZoomOut}
						onClick={() => updateQrSize(qrSize - QR_SIZE_STEP)}
						type="button"
					>
						<MinusIcon />
					</button>
					<button
						aria-label={t("companyProfilePage.workerQr.resetZoomAria")}
						className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] disabled:cursor-not-allowed disabled:opacity-40"
						disabled={!targetUrl || qrSize === DEFAULT_QR_SIZE}
						onClick={() => updateQrSize(DEFAULT_QR_SIZE)}
						type="button"
					>
						<ResetIcon />
					</button>
					<button
						aria-label={t("companyProfilePage.workerQr.zoomInAria")}
						className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] disabled:cursor-not-allowed disabled:opacity-40"
						disabled={!targetUrl || !canZoomIn}
						onClick={() => updateQrSize(qrSize + QR_SIZE_STEP)}
						type="button"
					>
						<PlusIcon />
					</button>
					<button
						aria-label={t("companyProfilePage.workerQr.copyLinkAria")}
						className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-[#148696] text-white transition-colors hover:bg-[#004A60] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] disabled:cursor-not-allowed disabled:opacity-40"
						disabled={!targetUrl}
						onClick={handleCopyLink}
						type="button"
					>
						<ClipboardCopyIcon />
					</button>
				</div>
			</div>

			{targetUrl ? (
				<div className="flex flex-col items-center px-4 py-8">
					<div className="max-w-full overflow-auto rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
						<QRCodeSVG
							bgColor="#ffffff"
							data-testid="worker-verification-qr"
							fgColor="#004A60"
							includeMargin
							level="H"
							size={qrSize}
							value={targetUrl}
						/>
					</div>
					<p className="mt-4 max-w-[36rem] text-center text-sm text-gray-600">
						{displayName}
					</p>
				</div>
			) : (
				<div className="px-4 py-8 text-center">
					<p className="text-sm text-gray-500">
						{t("companyProfilePage.workerQr.unavailable")}
					</p>
				</div>
			)}
		</section>
	);
}

export { DEFAULT_QR_SIZE, MAX_QR_SIZE, MIN_QR_SIZE, QR_SIZE_STEP };
