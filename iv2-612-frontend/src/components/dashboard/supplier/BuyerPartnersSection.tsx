import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	type BuyerPartner,
	type BuyerPartnerFlagReason,
	useBuyerPartners,
	useCreateBuyerPartner,
	useCreateBuyerPartnerFlag,
} from "$src/queries/useBuyerPartners";
import { useMockData } from "$src/utils/config";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";
import styles from "./supplier-dashboard.module.css";

const ASK_REASON_KEYS = [
	"noLongerSources",
	"updateStatus",
	"correctInfo",
	"general",
] as const;
type AskReasonKey = (typeof ASK_REASON_KEYS)[number];

const REASON_KEY_TO_API: Record<AskReasonKey, BuyerPartnerFlagReason> = {
	noLongerSources: "no_longer_sources",
	updateStatus: "update_status",
	correctInfo: "correct_info",
	general: "general",
};

const ICON_BASE = {
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 1.8,
	strokeLinecap: "round" as const,
	strokeLinejoin: "round" as const,
};

const IconPlus = ({ size = 14 }: { size?: number }) => (
	<svg {...ICON_BASE} height={size} strokeWidth={2.4} width={size}>
		<path d="M12 5v14M5 12h14" />
	</svg>
);
const IconFlag = ({ size = 13 }: { size?: number }) => (
	<svg {...ICON_BASE} height={size} strokeWidth={2} width={size}>
		<path d="M5 21V4M5 4h11l-2 4 2 4H5" />
	</svg>
);
const IconClose = ({ size = 15 }: { size?: number }) => (
	<svg {...ICON_BASE} height={size} width={size}>
		<path d="M6 6l12 12M18 6L6 18" />
	</svg>
);
const IconCheck = ({ size = 26 }: { size?: number }) => (
	<svg {...ICON_BASE} height={size} strokeWidth={2.6} width={size}>
		<path d="M4 12.5L9 17.5L20 6.5" />
	</svg>
);
const IconShield = ({ size = 13 }: { size?: number }) => (
	<svg {...ICON_BASE} height={size} width={size}>
		<path d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6l8-3z" />
	</svg>
);
const IconEnvelope = ({ size = 15 }: { size?: number }) => (
	<svg {...ICON_BASE} height={size} width={size}>
		<rect height="14" rx="2" width="18" x="3" y="5" />
		<path d="M3.5 6.5l8.5 6 8.5-6" />
	</svg>
);
const IconHandshake = ({ size = 20 }: { size?: number }) => (
	<svg {...ICON_BASE} height={size} width={size}>
		<path d="M8 13l2 2a2 2 0 0 0 3 0l5-5" />
		<path d="M3 11l4-4 3 3-4 4-3-3z" />
		<path d="M21 11l-4-4-3 3 4 4 3-3z" />
		<path d="M10 15l1.5 1.5a1.5 1.5 0 0 0 2.5-1L13 14" />
	</svg>
);

function BuyerMark({
	initials,
	palette,
	className,
}: {
	initials: string;
	palette: [string, string];
	className?: string;
}) {
	return (
		<span
			className={`${styles.bpMark} ${className ?? ""}`}
			style={{ background: palette[0], color: palette[1] }}
		>
			{initials}
		</span>
	);
}

function BuyerCard({
	b,
	onAsk,
}: {
	b: BuyerPartner;
	onAsk: (b: BuyerPartner) => void;
}) {
	const { t } = useTranslation();
	const location = [b.city, b.country].filter(Boolean).join(", ");
	const meta = [location, b.industry].filter(Boolean).join(" · ");
	const pending = b.status === "pending";
	return (
		<div className={`${styles.bpCard} ${pending ? styles.pending : ""}`}>
			<div className={styles.bpCardTop}>
				<BuyerMark initials={b.initials} palette={b.palette} />
				<div className={styles.bpId}>
					<span className={styles.bpName}>{b.name}</span>
					<div className={styles.bpMeta}>{meta}</div>
				</div>
				<button
					className={styles.bpAskBtn}
					onClick={() => onAsk(b)}
					type="button"
				>
					<IconFlag /> {t("supplierDashboard.buyerPartners.askOrFlag")}
				</button>
			</div>
		</div>
	);
}

function useEscapeKey(open: boolean, onClose: () => void) {
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);
}

function AskModal({
	open,
	buyer,
	supplierId,
	onClose,
}: {
	open: boolean;
	buyer: BuyerPartner | null;
	supplierId: string | number | null;
	onClose: () => void;
}) {
	const { t } = useTranslation();
	const flagMutation = useCreateBuyerPartnerFlag();
	const isMock = useMockData();
	const noteId = useId();

	const [reasonKey, setReasonKey] = useState<AskReasonKey>(ASK_REASON_KEYS[0]);
	const [message, setMessage] = useState("");
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (open) {
			setReasonKey(ASK_REASON_KEYS[0]);
			setMessage("");
			setSent(false);
			setError(null);
		}
	}, [open, buyer?.id]);

	useEscapeKey(open, onClose);

	if (!buyer) return null;

	const submit = async () => {
		setError(null);
		if (isMock || !supplierId) {
			// Mock / test users: skip the network call so the demo still works.
			setSent(true);
			return;
		}
		try {
			await flagMutation.mutateAsync({
				supplier_id: supplierId,
				strategic_partner_id: /^\d+$/.test(buyer.id) ? buyer.id : null,
				reason: REASON_KEY_TO_API[reasonKey],
				note: message,
				buyer_name: buyer.name,
			});
			setSent(true);
		} catch (e: any) {
			setError(
				e?.response?.data?.detail ??
					t("supplierDashboard.buyerPartners.errorGeneric"),
			);
		}
	};

	return (
		<div
			className={`${styles.bpVeil} ${open ? styles.open : ""}`}
			onClick={onClose}
		>
			<div className={styles.bpModal} onClick={(e) => e.stopPropagation()}>
				<div className={styles.bpModalHero}>
					<button
						aria-label={t("common.close", "Close")}
						className={styles.bpModalClose}
						onClick={onClose}
						type="button"
					>
						<IconClose />
					</button>
					<div className={styles.bpEyebrow}>
						<IconFlag size={12} />{" "}
						{t("supplierDashboard.buyerPartners.askModal.eyebrow")}
					</div>
					<h2>{t("supplierDashboard.buyerPartners.askModal.title")}</h2>
					<p>{t("supplierDashboard.buyerPartners.askModal.description")}</p>
				</div>

				{sent ? (
					<div className={styles.bpModalBody}>
						<div className={styles.bpSuccess}>
							<div className={styles.bpCheck}>
								<IconCheck />
							</div>
							<h3>{t("supplierDashboard.buyerPartners.askModal.sentTitle")}</h3>
							<p>
								{t("supplierDashboard.buyerPartners.askModal.sentBody", {
									name: buyer.name,
								})}
							</p>
							<button
								className={styles.bpSubmit}
								onClick={onClose}
								style={{ margin: "0 auto" }}
								type="button"
							>
								{t("supplierDashboard.buyerPartners.done")}
							</button>
						</div>
					</div>
				) : (
					<div className={styles.bpModalBody}>
						<div className={styles.bpTarget}>
							<BuyerMark
								className={styles.bpTargetMark}
								initials={buyer.initials}
								palette={buyer.palette}
							/>
							<div>
								<div className={styles.tName}>{buyer.name}</div>
								<div className={styles.tMeta}>
									{[buyer.city, buyer.country].filter(Boolean).join(", ")} ·{" "}
									{buyer.industry}
								</div>
							</div>
						</div>

						<div className={styles.bpField}>
							<div className={styles.bpFieldLabel}>
								{t("supplierDashboard.buyerPartners.askModal.reasonLabel")}{" "}
								<span className={styles.bpReq}>*</span>
							</div>
							<div className={styles.bpReasons}>
								{ASK_REASON_KEYS.map((k) => (
									<button
										className={`${styles.bpReason} ${reasonKey === k ? styles.sel : ""}`}
										key={k}
										onClick={() => setReasonKey(k)}
										type="button"
									>
										<span className={styles.bpRdot}></span>
										{t(`supplierDashboard.buyerPartners.askReasons.${k}.label`)}
									</button>
								))}
							</div>
						</div>

						<div className={styles.bpField} style={{ marginBottom: 0 }}>
							<label htmlFor={noteId}>
								{t("supplierDashboard.buyerPartners.askModal.noteLabel")}{" "}
								<span className={styles.bpReq}>*</span>
							</label>
							<textarea
								className={styles.bpTextarea}
								id={noteId}
								onChange={(e) => setMessage(e.target.value)}
								placeholder={t(
									`supplierDashboard.buyerPartners.askReasons.${reasonKey}.placeholder`,
									{ name: buyer.name },
								)}
								value={message}
							/>
						</div>

						{error && (
							<div className={styles.bpError} role="alert">
								{error}
							</div>
						)}

						<div
							className={styles.bpModalFoot}
							style={{ justifyContent: "flex-end" }}
						>
							<button
								className={styles.bpCancel}
								onClick={onClose}
								type="button"
							>
								{t("supplierDashboard.buyerPartners.cancel")}
							</button>
							<button
								className={styles.bpSubmit}
								disabled={!message.trim() || flagMutation.isPending}
								onClick={submit}
								style={{ marginLeft: 0 }}
								type="button"
							>
								<IconEnvelope />{" "}
								{flagMutation.isPending
									? t("supplierDashboard.buyerPartners.sending")
									: t("supplierDashboard.buyerPartners.askModal.submit")}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function AddBuyerModal({
	open,
	supplierId,
	onClose,
	onAdd,
}: {
	open: boolean;
	supplierId: string | number | null;
	onClose: () => void;
	onAdd: (b: BuyerPartner) => void;
}) {
	const { t } = useTranslation();
	const createMutation = useCreateBuyerPartner();
	const isMock = useMockData();
	const [name, setName] = useState("");
	const [country, setCountry] = useState("");
	const [industry, setIndustry] = useState("");
	const [note, setNote] = useState("");
	const [error, setError] = useState<string | null>(null);
	const nameId = useId();
	const countryId = useId();
	const industryId = useId();
	const noteId = useId();

	useEffect(() => {
		if (open) {
			setName("");
			setCountry("");
			setIndustry("");
			setNote("");
			setError(null);
		}
	}, [open]);

	useEscapeKey(open, onClose);

	const initialsOf = (n: string) =>
		n
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0] || "")
			.join("")
			.toUpperCase() || "?";

	const submit = async () => {
		const trimmedName = name.trim();
		if (!trimmedName) return;
		setError(null);

		// Mock / test users: skip the network call, fabricate a local pending row.
		if (isMock || !supplierId) {
			onAdd({
				id: "new-" + Date.now(),
				name: trimmedName,
				city: "",
				country: country.trim() || "—",
				industry: industry.trim() || "Buyer",
				initials: initialsOf(trimmedName),
				palette: ["#004A60", "#A6DFDD"],
				status: "pending",
				added: true,
				note: note.trim(),
			});
			onClose();
			return;
		}

		try {
			const created = await createMutation.mutateAsync({
				supplier_id: supplierId,
				name: trimmedName,
				country: country.trim() || undefined,
				industry: industry.trim() || undefined,
				note: note.trim() || undefined,
			});
			onAdd(created);
			onClose();
		} catch (e: any) {
			setError(
				e?.response?.data?.detail ??
					t("supplierDashboard.buyerPartners.errorGeneric"),
			);
		}
	};

	return (
		<div
			className={`${styles.bpVeil} ${open ? styles.open : ""}`}
			onClick={onClose}
		>
			<div className={styles.bpModal} onClick={(e) => e.stopPropagation()}>
				<div className={styles.bpModalHero}>
					<button
						aria-label={t("common.close", "Close")}
						className={styles.bpModalClose}
						onClick={onClose}
						type="button"
					>
						<IconClose />
					</button>
					<div className={styles.bpEyebrow}>
						<IconPlus size={12} />{" "}
						{t("supplierDashboard.buyerPartners.addModal.eyebrow")}
					</div>
					<h2>{t("supplierDashboard.buyerPartners.addModal.title")}</h2>
					<p>{t("supplierDashboard.buyerPartners.addModal.description")}</p>
				</div>
				<div className={styles.bpModalBody}>
					<div className={styles.bpField}>
						<label htmlFor={nameId}>
							{t("supplierDashboard.buyerPartners.addModal.nameLabel")}{" "}
							<span className={styles.bpReq}>*</span>
						</label>
						<input
							className={styles.bpInput}
							id={nameId}
							onChange={(e) => setName(e.target.value)}
							placeholder={t(
								"supplierDashboard.buyerPartners.addModal.namePlaceholder",
							)}
							value={name}
						/>
					</div>
					<div className={styles.bpField}>
						<div className={styles.bpRow2}>
							<div>
								<label htmlFor={countryId}>
									{t("supplierDashboard.buyerPartners.addModal.countryLabel")}
								</label>
								<input
									className={styles.bpInput}
									id={countryId}
									onChange={(e) => setCountry(e.target.value)}
									placeholder={t(
										"supplierDashboard.buyerPartners.addModal.countryPlaceholder",
									)}
									value={country}
								/>
							</div>
							<div>
								<label htmlFor={industryId}>
									{t("supplierDashboard.buyerPartners.addModal.industryLabel")}
								</label>
								<input
									className={styles.bpInput}
									id={industryId}
									onChange={(e) => setIndustry(e.target.value)}
									placeholder={t(
										"supplierDashboard.buyerPartners.addModal.industryPlaceholder",
									)}
									value={industry}
								/>
							</div>
						</div>
					</div>
					<div className={styles.bpField} style={{ marginBottom: 0 }}>
						<label htmlFor={noteId}>
							{t("supplierDashboard.buyerPartners.addModal.noteLabel")}{" "}
							<span style={{ color: "var(--ink-4)", fontWeight: 500 }}>
								{t("supplierDashboard.buyerPartners.addModal.optional")}
							</span>
						</label>
						<textarea
							className={styles.bpTextarea}
							id={noteId}
							onChange={(e) => setNote(e.target.value)}
							placeholder={t(
								"supplierDashboard.buyerPartners.addModal.notePlaceholder",
							)}
							style={{ minHeight: 72 }}
							value={note}
						/>
					</div>
					{error && (
						<div className={styles.bpError} role="alert">
							{error}
						</div>
					)}
					<div className={styles.bpModalFoot}>
						<div className={styles.bpRouteNote}>
							<IconShield />{" "}
							{t("supplierDashboard.buyerPartners.addModal.routeNote")}
						</div>
						<button className={styles.bpCancel} onClick={onClose} type="button">
							{t("supplierDashboard.buyerPartners.cancel")}
						</button>
						<button
							className={styles.bpSubmit}
							disabled={!name.trim() || createMutation.isPending}
							onClick={submit}
							type="button"
						>
							<IconPlus size={15} />{" "}
							{createMutation.isPending
								? t("supplierDashboard.buyerPartners.sending")
								: t("supplierDashboard.buyerPartners.addModal.submit")}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function BuyerPartnersSection() {
	const { t } = useTranslation();
	const ids = getUserIdentifiers();
	const isMock = useMockData();
	const { data, isLoading } = useBuyerPartners({
		supplierId: ids.supplierId || undefined,
	});

	// For mock/test users we don't have a backend round-trip on Add, so we keep
	// a session-local list. Real users see the persisted result from the API.
	const [localPending, setLocalPending] = useState<BuyerPartner[]>([]);
	const [askBuyer, setAskBuyer] = useState<BuyerPartner | null>(null);
	const [addOpen, setAddOpen] = useState(false);

	const partners = isMock ? [...(data ?? []), ...localPending] : (data ?? []);

	return (
		<section className={styles.dashSection}>
			<div className={styles.sectionHeadRow}>
				<h2 className="heading-display">
					{t("supplierDashboard.buyerPartners.title")}
				</h2>
				<span className={styles.headMeta}>
					{t("supplierDashboard.buyerPartners.subtitle", {
						count: partners.length,
					})}
				</span>
			</div>

			<div className={styles.bpCardShell}>
				<div className={styles.bpIntro}>
					<span className={styles.bpIntroIco}>
						<IconHandshake />
					</span>
					<p
						// eslint-disable-next-line react/no-danger
						dangerouslySetInnerHTML={{
							__html: t("supplierDashboard.buyerPartners.intro"),
						}}
					/>
				</div>

				{partners.length === 0 && !isLoading ? (
					<div className={styles.bpEmpty}>
						{t("supplierDashboard.buyerPartners.empty")}
					</div>
				) : (
					<div className={styles.bpGrid}>
						{partners.map((b) => (
							<BuyerCard b={b} key={b.id} onAsk={setAskBuyer} />
						))}
					</div>
				)}

				<div className={styles.bpAddRow}>
					<button
						className={styles.bpAddMini}
						onClick={() => setAddOpen(true)}
						type="button"
					>
						<IconPlus /> {t("supplierDashboard.buyerPartners.addPartner")}
					</button>
				</div>
			</div>

			<AskModal
				buyer={askBuyer}
				onClose={() => setAskBuyer(null)}
				open={!!askBuyer}
				supplierId={ids.supplierId || null}
			/>
			<AddBuyerModal
				onAdd={(b) => {
					if (isMock) setLocalPending((prev) => [...prev, b]);
					// Real users: useCreateBuyerPartner already invalidates the
					// list query, so the new row will appear via refetch.
				}}
				onClose={() => setAddOpen(false)}
				open={addOpen}
				supplierId={ids.supplierId || null}
			/>
		</section>
	);
}
