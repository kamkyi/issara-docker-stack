import { ImageIcon, PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import type React from "react";
import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import { SectionCard } from "$src/components/company-profile/SectionCard";
import { showToast } from "$src/components/toast/toastUtil";
import {
	useDeleteEmployerCoverImage,
	useDeleteRaBusinessImage,
	useEmployerCoverImages,
	useRaBusinessImages,
	useUploadEmployerCoverImage,
	useUploadRaBusinessImage,
} from "$src/hooks/useBusinessImages";
import { useTranslation } from "$src/hooks/useTranslation";

const EMPTY_IMAGES: Array<{ id: number; image: string }> = [];
const MAX_IMAGES = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

interface BusinessImagesSectionProps {
	/** "supplier" uses employer-cover-images; "ra" uses bussiness-images */
	context: "supplier" | "ra";
	/** GD employer profile ID for "supplier"; GD user ID for "ra" */
	employerProfileId?: number | null;
	/** Disable save/edit actions while another section is saving */
	actionDisabled?: boolean;
	/** Is this section in edit mode */
	editing: boolean;
	/** Start editing */
	onStartEdit: () => void;
	/** Cancel editing */
	onCancelEdit: () => void;
	/** Called after an image upload or delete succeeds */
	onImagesChanged?: (change: BusinessImageNotificationChange) => void;
}

export interface BusinessImageNotificationChange {
	action: "uploaded" | "removed";
	label: string;
	value: string;
	field: string;
}

/** Imperative handle so the section header's Save/Cancel buttons can drive
 * the panel's staged uploads without lifting all of its state up. */
export interface ImagesPanelHandle {
	/** Upload every staged file — called once, when the user clicks Save. */
	commit: () => Promise<void>;
	/** Drop staged files without uploading — called when the user clicks Cancel. */
	discard: () => void;
}

interface StagedImage {
	id: string;
	file: File;
	previewUrl: string;
}

// ── Shared panel UI + staging logic ───────────────────────────────────────────

interface ImagesPanelContainerProps {
	images: Array<{ id: number; image: string }>;
	isLoading: boolean;
	editing: boolean;
	upload: { mutateAsync: (file: File) => Promise<unknown>; isPending: boolean };
	remove: { mutateAsync: (id: number) => Promise<unknown> };
	onImagesChanged?: (change: BusinessImageNotificationChange) => void;
}

const ImagesPanelContainer = forwardRef<
	ImagesPanelHandle,
	ImagesPanelContainerProps
>(({ images, isLoading, editing, upload, remove, onImagesChanged }, ref) => {
	const { t } = useTranslation();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
	const [deletingId, setDeletingId] = useState<number | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	// Safety net: if edit mode is exited any other way, drop staged previews.
	useEffect(() => {
		if (!editing) {
			setStagedImages((prev) => {
				for (const item of prev) URL.revokeObjectURL(item.previewUrl);
				return prev.length ? [] : prev;
			});
		}
	}, [editing]);

	const totalCount = images.length + stagedImages.length;
	const atMax = totalCount >= MAX_IMAGES;

	const handleFilesSelected = (files: FileList) => {
		const slots = MAX_IMAGES - totalCount;
		if (slots <= 0) {
			showToast.error(
				t("companyProfilePage.businessImages.maxReached", { max: MAX_IMAGES }),
			);
			return;
		}
		const next: StagedImage[] = [];
		for (const file of Array.from(files).slice(0, slots)) {
			if (!ACCEPTED_TYPES.includes(file.type)) {
				showToast.error(
					t("companyProfilePage.businessImages.invalidType", {
						name: file.name,
					}),
				);
				continue;
			}
			if (file.size > MAX_FILE_SIZE_BYTES) {
				showToast.error(
					t("companyProfilePage.businessImages.tooLarge", { name: file.name }),
				);
				continue;
			}
			next.push({
				id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
				file,
				previewUrl: URL.createObjectURL(file),
			});
		}
		if (next.length > 0) {
			setStagedImages((prev) => [...prev, ...next]);
		}
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleRemoveStaged = (id: string) => {
		setStagedImages((prev) => {
			const target = prev.find((item) => item.id === id);
			if (target) URL.revokeObjectURL(target.previewUrl);
			return prev.filter((item) => item.id !== id);
		});
	};

	const getImageName = (url: string) => {
		const normalized = url.trim();
		if (!normalized) return "removed image";
		try {
			const parsed = new URL(normalized, window.location.origin);
			return decodeURIComponent(
				parsed.pathname.split("/").filter(Boolean).pop() ?? normalized,
			);
		} catch {
			return normalized.split("/").filter(Boolean).pop() ?? normalized;
		}
	};

	const handleDelete = async (image: { id: number; image: string }) => {
		setDeletingId(image.id);
		try {
			await remove.mutateAsync(image.id);
			onImagesChanged?.({
				action: "removed",
				field: "business_images",
				label: "Business image",
				value: `removed ${getImageName(image.image)}`,
			});
		} catch {
			showToast.error(t("companyProfilePage.businessImages.deleteFailed"));
		} finally {
			setDeletingId(null);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			handleFilesSelected(e.target.files);
		}
	};

	const handleDrop = (e: React.DragEvent<HTMLElement>) => {
		e.preventDefault();
		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			handleFilesSelected(e.dataTransfer.files);
		}
	};

	useImperativeHandle(ref, () => ({
		commit: async () => {
			if (stagedImages.length === 0) return;
			const toUpload = stagedImages;
			setStagedImages([]);
			setIsSaving(true);
			try {
				for (const item of toUpload) {
					try {
						await upload.mutateAsync(item.file);
						onImagesChanged?.({
							action: "uploaded",
							field: "business_images",
							label: "Business image",
							value: `uploaded ${item.file.name}`,
						});
					} catch {
						showToast.error(
							t("companyProfilePage.businessImages.uploadFailed", {
								name: item.file.name,
							}),
						);
					} finally {
						URL.revokeObjectURL(item.previewUrl);
					}
				}
			} finally {
				setIsSaving(false);
			}
		},
		discard: () => {
			for (const item of stagedImages) URL.revokeObjectURL(item.previewUrl);
			setStagedImages([]);
		},
	}));

	return (
		<div>
			{/* Image grid */}
			{isLoading ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							className="aspect-square rounded-xl bg-gray-100 animate-pulse"
							key={i}
						/>
					))}
				</div>
			) : totalCount > 0 ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
					{images.map((img) => (
						<div className="relative group aspect-square" key={img.id}>
							<img
								alt={t("companyProfilePage.businessImages.imageAlt")}
								className="w-full h-full object-cover rounded-xl border border-gray-100 shadow-sm"
								loading="lazy"
								onError={(e) => {
									(e.target as HTMLImageElement).style.display = "none";
								}}
								src={img.image}
							/>
							{editing && (
								<button
									aria-label={t(
										"companyProfilePage.businessImages.deleteAriaLabel",
									)}
									className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-white/90 border border-gray-200 shadow-sm flex items-center justify-center text-[#FB8379] hover:bg-[#FB8379] hover:text-white hover:border-[#FB8379] transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FB8379]"
									disabled={deletingId === img.id || isSaving}
									onClick={() => handleDelete(img)}
									type="button"
								>
									{deletingId === img.id ? (
										<span className="h-3 w-3 border-2 border-[#FB8379] border-t-transparent rounded-full animate-spin" />
									) : (
										<TrashIcon className="h-3.5 w-3.5" />
									)}
								</button>
							)}
						</div>
					))}
					{stagedImages.map((item) => (
						<div className="relative group aspect-square" key={item.id}>
							<img
								alt={t("companyProfilePage.businessImages.imageAlt")}
								className="w-full h-full object-cover rounded-xl border-2 border-dashed border-[#148696]/60 opacity-80"
								src={item.previewUrl}
							/>
							{editing && (
								<button
									aria-label={t(
										"companyProfilePage.businessImages.deleteAriaLabel",
									)}
									className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-white/90 border border-gray-200 shadow-sm flex items-center justify-center text-[#FB8379] hover:bg-[#FB8379] hover:text-white hover:border-[#FB8379] transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FB8379]"
									disabled={isSaving}
									onClick={() => handleRemoveStaged(item.id)}
									type="button"
								>
									<TrashIcon className="h-3.5 w-3.5" />
								</button>
							)}
						</div>
					))}
				</div>
			) : (
				<p className="text-sm text-[#8A979C] mb-4">
					{t("companyProfilePage.businessImages.noImages")}
				</p>
			)}

			{/* Upload drop-zone — edit mode only */}
			{editing && !atMax && (
				<button
					aria-label={t("companyProfilePage.businessImages.uploadAreaLabel")}
					className="w-full border-2 border-dashed border-[#D2D2D2] hover:border-[#148696] rounded-xl p-5 text-center cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] disabled:cursor-not-allowed disabled:opacity-60"
					disabled={isSaving}
					onClick={() => fileInputRef.current?.click()}
					onDragOver={(e) => e.preventDefault()}
					onDrop={handleDrop}
					type="button"
				>
					{isSaving ? (
						<div className="flex items-center justify-center gap-2 text-[#148696]">
							<span className="h-4 w-4 border-2 border-[#148696] border-t-transparent rounded-full animate-spin" />
							<span className="text-sm font-semibold">
								{t("companyProfilePage.businessImages.uploading")}
							</span>
						</div>
					) : (
						<>
							<div className="mx-auto mb-2 h-9 w-9 rounded-full bg-[rgba(20,134,150,0.1)] flex items-center justify-center">
								<PlusIcon className="h-5 w-5 text-[#148696]" />
							</div>
							<p className="text-sm font-semibold text-[#004A60]">
								{t("companyProfilePage.businessImages.clickOrDrop")}
							</p>
							<p className="text-xs text-[#8A979C] mt-1">
								{t("companyProfilePage.businessImages.hint", {
									max: MAX_IMAGES,
									current: totalCount,
								})}
							</p>
						</>
					)}
				</button>
			)}

			{editing && atMax && (
				<p className="text-xs text-[#8A979C] mt-2">
					{t("companyProfilePage.businessImages.maxReached", {
						max: MAX_IMAGES,
					})}
				</p>
			)}

			<input
				accept={ACCEPTED_TYPES.join(",")}
				className="sr-only"
				multiple
				onChange={handleInputChange}
				ref={fileInputRef}
				type="file"
			/>
		</div>
	);
});

// ── Supplier inner component ──────────────────────────────────────────────────

const SupplierImagesPanel = forwardRef<
	ImagesPanelHandle,
	{
		employerProfileId: number;
		editing: boolean;
		onImagesChanged?: (change: BusinessImageNotificationChange) => void;
	}
>(({ employerProfileId, editing, onImagesChanged }, ref) => {
	const { data: images = EMPTY_IMAGES, isLoading } =
		useEmployerCoverImages(employerProfileId);
	const upload = useUploadEmployerCoverImage(employerProfileId);
	const remove = useDeleteEmployerCoverImage(employerProfileId);

	return (
		<ImagesPanelContainer
			editing={editing}
			images={images}
			isLoading={isLoading}
			onImagesChanged={onImagesChanged}
			ref={ref}
			remove={remove}
			upload={upload}
		/>
	);
});

// ── RA inner component ────────────────────────────────────────────────────────

const RaImagesPanel = forwardRef<
	ImagesPanelHandle,
	{
		editing: boolean;
		gdUserId?: number | null;
		onImagesChanged?: (change: BusinessImageNotificationChange) => void;
	}
>(({ editing, gdUserId, onImagesChanged }, ref) => {
	const { data: images = EMPTY_IMAGES, isLoading } =
		useRaBusinessImages(gdUserId);
	const upload = useUploadRaBusinessImage(gdUserId);
	const remove = useDeleteRaBusinessImage();

	return (
		<ImagesPanelContainer
			editing={editing}
			images={images}
			isLoading={isLoading}
			onImagesChanged={onImagesChanged}
			ref={ref}
			remove={remove}
			upload={upload}
		/>
	);
});

// ── Public export ─────────────────────────────────────────────────────────────

const BusinessImagesSection: React.FC<BusinessImagesSectionProps> = ({
	context,
	employerProfileId,
	actionDisabled = false,
	editing,
	onStartEdit,
	onCancelEdit,
	onImagesChanged,
}) => {
	const { t } = useTranslation();
	const panelRef = useRef<ImagesPanelHandle>(null);
	const [isSaving, setIsSaving] = useState(false);

	const canRender =
		(context === "supplier" && employerProfileId != null) || context === "ra";

	const handleSave = async () => {
		if (!editing) {
			onStartEdit();
			return;
		}
		setIsSaving(true);
		try {
			await panelRef.current?.commit();
		} finally {
			setIsSaving(false);
		}
		onCancelEdit();
	};

	const handleCancel = () => {
		panelRef.current?.discard();
		onCancelEdit();
	};

	return (
		<SectionCard
			actionDisabled={actionDisabled || isSaving}
			editing={editing}
			icon={<ImageIcon className="text-[#148696] w-5 h-5" />}
			onCancel={handleCancel}
			onSave={handleSave}
			saveButtonText={
				isSaving ? t("companyProfilePage.businessImages.uploading") : undefined
			}
			title={t("companyProfilePage.businessImages.title")}
		>
			{!canRender ? (
				<div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
					<p className="text-sm text-[#8A979C]">
						{context === "supplier" && !employerProfileId
							? "Loading company profile..."
							: t("companyProfilePage.businessImages.noImages")}
					</p>
				</div>
			) : context === "supplier" && employerProfileId != null ? (
				<SupplierImagesPanel
					editing={editing}
					employerProfileId={employerProfileId}
					onImagesChanged={onImagesChanged}
					ref={panelRef}
				/>
			) : (
				<RaImagesPanel
					editing={editing}
					gdUserId={employerProfileId}
					onImagesChanged={onImagesChanged}
					ref={panelRef}
				/>
			)}
		</SectionCard>
	);
};

export default BusinessImagesSection;
