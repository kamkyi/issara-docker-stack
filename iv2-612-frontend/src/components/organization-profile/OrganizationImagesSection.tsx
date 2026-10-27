import {
	CheckCircledIcon,
	ImageIcon,
	PlusIcon,
	ReloadIcon,
	TrashIcon,
} from "@radix-ui/react-icons";
import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionCard } from "$src/components/company-profile/SectionCard";
import { showToast } from "$src/components/toast/toastUtil";
import {
	ORGANIZATION_IMAGES_QUERY_KEY,
	type OrganizationImage,
	useDeleteOrganizationImage,
	useOrganizationImages,
	useUploadOrganizationImage,
} from "$src/queries/organizationProfile";

const MAX_IMAGES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface StagedImage {
	id: string;
	file: File;
	preview: string;
	status: "ready" | "uploading" | "uploaded" | "error";
	progress: number;
	serverId?: number;
}

export default function OrganizationImagesSection() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { data: images = [], isLoading } = useOrganizationImages();
	const upload = useUploadOrganizationImage();
	const remove = useDeleteOrganizationImage();
	const [editing, setEditing] = useState(false);
	const [staged, setStaged] = useState<StagedImage[]>([]);
	const [removedIds, setRemovedIds] = useState<number[]>([]);
	const [saving, setSaving] = useState(false);
	const fileInput = useRef<HTMLInputElement>(null);
	const stagedRef = useRef<StagedImage[]>([]);
	stagedRef.current = staged;
	const stagedServerIds = new Set(
		staged.flatMap((item) =>
			item.serverId === undefined ? [] : [item.serverId],
		),
	);
	const visibleImages = images.filter(
		(image) => !removedIds.includes(image.id) && !stagedServerIds.has(image.id),
	);
	const total = visibleImages.length + staged.length;

	useEffect(
		() => () => {
			for (const item of stagedRef.current) URL.revokeObjectURL(item.preview);
		},
		[],
	);

	const discard = () => {
		if (saving) return;
		for (const item of staged) URL.revokeObjectURL(item.preview);
		setStaged([]);
		setRemovedIds([]);
		setEditing(false);
	};

	const addFiles = (files: FileList) => {
		if (saving) return;
		const slots = MAX_IMAGES - total;
		if (slots <= 0) return;
		const next: StagedImage[] = [];
		for (const file of Array.from(files).slice(0, slots)) {
			if (!ACCEPTED_TYPES.includes(file.type)) {
				showToast.error(
					t("organizationProfilePage.images.invalidType", {
						defaultValue: `${file.name} is not a supported image.`,
					}),
				);
				continue;
			}
			if (file.size > MAX_FILE_SIZE) {
				showToast.error(
					t("organizationProfilePage.images.tooLarge", {
						defaultValue: `${file.name} is larger than 5 MB.`,
					}),
				);
				continue;
			}
			next.push({
				id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
				file,
				preview: URL.createObjectURL(file),
				status: "ready",
				progress: 0,
			});
		}
		setStaged((current) => [...current, ...next]);
		if (fileInput.current) fileInput.current.value = "";
	};

	const updateStaged = (id: string, values: Partial<StagedImage>) => {
		setStaged((current) =>
			current.map((item) => (item.id === id ? { ...item, ...values } : item)),
		);
	};

	const save = async () => {
		if (saving) return;
		if (removedIds.length === 0 && staged.length === 0) {
			setEditing(false);
			return;
		}

		const removedSnapshot = [...removedIds];
		const stagedSnapshot = [...staged];
		const successfulIds = new Set<string>();
		let uploadFailed = false;
		setSaving(true);
		setStaged((current) =>
			current.map((item) => ({ ...item, status: "ready", progress: 0 })),
		);

		try {
			for (const id of removedSnapshot) await remove.mutateAsync(id);
		} catch {
			await queryClient.invalidateQueries({
				queryKey: ORGANIZATION_IMAGES_QUERY_KEY,
			});
			setRemovedIds([]);
			showToast.error(
				t("organizationProfilePage.images.saveFailed", {
					defaultValue: "Could not save organization images. Please try again.",
				}),
			);
			setSaving(false);
			return;
		}

		for (const item of stagedSnapshot) {
			updateStaged(item.id, { status: "uploading", progress: 0 });
			try {
				const uploadedImage = await upload.mutateAsync({
					file: item.file,
					onProgress: (progress) => updateStaged(item.id, { progress }),
				});
				successfulIds.add(item.id);
				updateStaged(item.id, {
					status: "uploaded",
					progress: 100,
					serverId: uploadedImage.id,
				});
			} catch {
				uploadFailed = true;
				updateStaged(item.id, { status: "error", progress: 0 });
			}
		}

		await queryClient.invalidateQueries({
			queryKey: ORGANIZATION_IMAGES_QUERY_KEY,
		});
		for (const item of stagedSnapshot) {
			if (successfulIds.has(item.id)) URL.revokeObjectURL(item.preview);
		}
		setStaged((current) =>
			current.filter((item) => !successfulIds.has(item.id)),
		);
		setRemovedIds([]);
		setSaving(false);

		if (uploadFailed) {
			showToast.error(
				t("organizationProfilePage.images.uploadFailed", {
					defaultValue:
						"Some images could not be uploaded. Please try saving them again.",
				}),
			);
		} else {
			setEditing(false);
			showToast.success(
				t("organizationProfilePage.images.saved", {
					defaultValue: "Organization images saved.",
				}),
			);
		}
	};

	const renderExisting = (image: OrganizationImage) => (
		<div className="group relative aspect-[4/3]" key={image.id}>
			<img
				alt={t("organizationProfilePage.images.imageAlt", {
					defaultValue: "Organization",
				})}
				className="h-full w-full rounded-xl border border-gray-100 object-cover shadow-sm"
				src={image.image}
			/>
			{editing && !saving && (
				<button
					aria-label={t("organizationProfilePage.images.remove", {
						defaultValue: "Remove image",
					})}
					className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#FB8379] shadow hover:bg-[#FB8379] hover:text-white"
					onClick={() => setRemovedIds((ids) => [...ids, image.id])}
					type="button"
				>
					<TrashIcon />
				</button>
			)}
		</div>
	);

	return (
		<SectionCard
			actionDisabled={saving || isLoading}
			editing={editing}
			icon={<ImageIcon className="h-5 w-5 text-[#148696]" />}
			onCancel={discard}
			onSave={editing ? save : () => setEditing(true)}
			title={t("organizationProfilePage.images.title", {
				defaultValue: "Organization Images",
			})}
		>
			<p className="mb-4 text-sm text-gray-500">
				{t("organizationProfilePage.images.help", {
					defaultValue:
						"Add up to 3 images that represent your organization and its work.",
				})}
			</p>
			<output aria-live="polite" className="sr-only">
				{saving
					? t("organizationProfilePage.images.uploadInProgress", {
							defaultValue: "Saving organization images",
						})
					: ""}
			</output>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				{isLoading ? (
					Array.from({ length: MAX_IMAGES }).map((_, index) => (
						<div
							className="aspect-[4/3] animate-pulse rounded-xl bg-gray-100"
							key={index}
						/>
					))
				) : (
					<>
						{visibleImages.map(renderExisting)}
						{staged.map((item) => (
							<div
								className="relative aspect-[4/3] overflow-hidden rounded-xl"
								key={item.id}
							>
								<img
									alt={item.file.name}
									className="h-full w-full rounded-xl border-2 border-dashed border-[#148696] object-cover opacity-80"
									src={item.preview}
								/>
								{!saving && (
									<button
										aria-label={t("organizationProfilePage.images.remove", {
											defaultValue: "Remove image",
										})}
										className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#FB8379] shadow"
										onClick={() => {
											URL.revokeObjectURL(item.preview);
											setStaged((current) =>
												current.filter((candidate) => candidate.id !== item.id),
											);
										}}
										type="button"
									>
										<TrashIcon />
									</button>
								)}
								{item.status === "uploading" && (
									<div className="absolute inset-0 flex flex-col items-center justify-center bg-[#004A60]/80 px-4 text-white">
										<ReloadIcon className="mb-2 h-6 w-6 animate-spin" />
										<span className="text-sm font-semibold">
											{t("organizationProfilePage.images.uploading", {
												defaultValue: "Uploading",
											})}{" "}
											{item.progress}%
										</span>
										<div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/30">
											<div
												className="h-full rounded-full bg-white transition-[width] duration-200"
												style={{ width: `${item.progress}%` }}
											/>
										</div>
									</div>
								)}
								{item.status === "uploaded" && (
									<div className="absolute inset-0 flex flex-col items-center justify-center bg-[#148696]/80 text-white">
										<CheckCircledIcon className="mb-2 h-7 w-7" />
										<span className="text-sm font-semibold">
											{t("organizationProfilePage.images.uploaded", {
												defaultValue: "Uploaded",
											})}
										</span>
									</div>
								)}
								{item.status === "error" && (
									<div className="absolute inset-x-0 bottom-0 bg-[#B42318]/90 px-3 py-2 text-center text-xs font-semibold text-white">
										{t("organizationProfilePage.images.retryUpload", {
											defaultValue: "Upload failed — save again to retry",
										})}
									</div>
								)}
							</div>
						))}
						{Array.from({ length: Math.max(0, MAX_IMAGES - total) }).map(
							(_, index) =>
								editing ? (
									<button
										className="flex aspect-[4/3] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-center hover:border-[#148696] disabled:cursor-not-allowed disabled:opacity-50"
										disabled={saving}
										key={`empty-${index}`}
										onClick={() => fileInput.current?.click()}
										onDragOver={(event) => event.preventDefault()}
										onDrop={(event) => {
											event.preventDefault();
											if (!saving && event.dataTransfer.files.length)
												addFiles(event.dataTransfer.files);
										}}
										type="button"
									>
										<span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#e5f6f9]">
											<PlusIcon className="text-[#148696]" />
										</span>
										<span className="text-sm font-semibold text-[#004A60]">
											{t("organizationProfilePage.images.add", {
												defaultValue: "Add image",
											})}
										</span>
									</button>
								) : (
									<div
										className="flex aspect-[4/3] items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-gray-300"
										key={`empty-${index}`}
									>
										<ImageIcon className="h-8 w-8" />
									</div>
								),
						)}
					</>
				)}
			</div>
			<input
				accept={ACCEPTED_TYPES.join(",")}
				className="sr-only"
				disabled={saving}
				multiple
				onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
					if (event.target.files) addFiles(event.target.files);
				}}
				ref={fileInput}
				type="file"
			/>
		</SectionCard>
	);
}
