import * as Popover from "@radix-ui/react-popover";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import EmojiPicker, {
	type EmojiClickData,
	EmojiStyle,
	Theme,
} from "emoji-picker-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { I } from "$src/components/messageBoard/admin/icons";
import {
	messageHtmlToPlainText,
	normalizeEditorHtml,
	RICH_TEXT_EMPTY_HTML,
	sanitizeMessageHtml,
} from "$src/utils/messageBoardRichText";

interface RichTextEditorProps {
	id: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}

const FONT_SIZES = [
	{ label: "Small", mark: "T", shortcut: "⌘⌥1", value: "12px" },
	{ label: "Normal", mark: "Tt", shortcut: "⌘⌥0", value: "" },
	{ label: "Large", mark: "T", shortcut: "⌘⌥2", value: "18px" },
	{ label: "XL", mark: "T", shortcut: "⌘⌥3", value: "22px" },
] as const;

const COLORS = ["#17313a", "#148696", "#00516a", "#6b7280", "#e0584c"];

const sameHtml = (left: string, right: string) =>
	sanitizeMessageHtml(left) === sanitizeMessageHtml(right);

export function RichTextEditor({
	id,
	value,
	onChange,
	placeholder,
}: RichTextEditorProps) {
	const [emojiOpen, setEmojiOpen] = useState(false);
	const [styleOpen, setStyleOpen] = useState(false);
	const [linkOpen, setLinkOpen] = useState(false);
	const [linkUrl, setLinkUrl] = useState("");
	const savedRangeRef = useRef<{ from: number; to: number } | null>(null);
	const [, refreshToolbar] = useState(0);
	const { resolvedTheme } = useTheme();
	const emojiTheme = resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT;
	const initialContent = useMemo(
		() => normalizeEditorHtml(value || RICH_TEXT_EMPTY_HTML),
		[],
	);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				blockquote: false,
				code: false,
				codeBlock: false,
				horizontalRule: false,
				link: false,
				strike: false,
				underline: false,
			}),
			TextStyle,
			FontSize,
			Color,
			Underline,
			Link.configure({
				autolink: true,
				defaultProtocol: "https",
				openOnClick: false,
				HTMLAttributes: {
					rel: "noopener noreferrer",
					target: "_blank",
				},
			}),
		],
		content: initialContent,
		editorProps: {
			attributes: {
				"aria-label": "Message",
				class: "rich-input",
				id,
			},
		},
		immediatelyRender: false,
		onUpdate: ({ editor: activeEditor, transaction }) => {
			// Only propagate real document changes, not stored-mark transactions.
			// Stored marks (pre-typing Bold/Color/Size) don't alter the HTML and
			// should not cause a parent re-render that could race and reset state.
			if (transaction.docChanged) {
				onChange(sanitizeMessageHtml(activeEditor.getHTML()));
			}
		},
	});

	useEffect(() => {
		if (!editor) return;
		const nextHtml = normalizeEditorHtml(value || RICH_TEXT_EMPTY_HTML);
		if (!sameHtml(editor.getHTML(), nextHtml)) {
			editor.commands.setContent(nextHtml, { emitUpdate: false });
		}
	}, [editor, value]);

	useEffect(() => {
		if (!editor) return;
		const rerender = () => refreshToolbar((version) => version + 1);
		editor.on("transaction", rerender);
		editor.on("selectionUpdate", rerender);
		editor.on("focus", rerender);
		editor.on("blur", rerender);
		return () => {
			editor.off("transaction", rerender);
			editor.off("selectionUpdate", rerender);
			editor.off("focus", rerender);
			editor.off("blur", rerender);
		};
	}, [editor]);

	const normalizedValue = sanitizeMessageHtml(value || RICH_TEXT_EMPTY_HTML);
	const hasText = messageHtmlToPlainText(normalizedValue).length > 0;
	const hasListShell = /<(ul|ol)\b/i.test(normalizedValue);
	const showPlaceholder = Boolean(placeholder && !hasText && !hasListShell);
	// Prefer storedMarks for the toolbar state so pre-typing selections
	// (click Bold / pick a color / pick a size before typing) are reflected.
	const textStyleAttrs: Record<string, unknown> = (() => {
		if (!editor) return {};
		const { selection, storedMarks } = editor.state;
		if (selection.empty && storedMarks) {
			const stored = storedMarks.find((m) => m.type.name === "textStyle");
			if (stored) return stored.attrs as Record<string, unknown>;
		}
		return editor.getAttributes("textStyle");
	})();
	const currentFontSize = (textStyleAttrs.fontSize as string | undefined) ?? "";
	const currentFontLabel =
		FONT_SIZES.find((size) => size.value === currentFontSize)?.label ??
		"Normal";
	const currentColor = (textStyleAttrs.color as string | undefined) ?? "";

	const run = (callback: () => void) => {
		if (!editor) return;
		callback();
		refreshToolbar((version) => version + 1);
	};

	const applyFontSize = (size: string) => {
		run(() => {
			if (size) editor?.chain().focus().setFontSize(size).run();
			else editor?.chain().focus().unsetFontSize().run();
		});
		setStyleOpen(false);
	};

	const handleLinkOpenChange = (open: boolean) => {
		if (open && editor) {
			const { from, to } = editor.state.selection;
			savedRangeRef.current = { from, to };
			const previousUrl = editor.getAttributes("link").href as
				| string
				| undefined;
			setLinkUrl(previousUrl ?? "");
		}
		setLinkOpen(open);
	};

	const applyLink = () => {
		if (!editor) return;
		const saved = savedRangeRef.current;
		const trimmedUrl = linkUrl.trim();

		// Chain selection restoration + link command together so they run in one
		// transaction and the restored selection is not overwritten by focus().
		if (!trimmedUrl) {
			const chain = editor.chain().focus();
			if (saved) chain.setTextSelection({ from: saved.from, to: saved.to });
			chain.extendMarkRange("link").unsetLink().run();
		} else {
			const href = /^[a-z][a-z0-9+.-]*:/i.test(trimmedUrl)
				? trimmedUrl
				: `https://${trimmedUrl}`;
			if (!saved || saved.from === saved.to) {
				// No text selected — insert the URL as the link text.
				const chain = editor.chain().focus();
				if (saved) chain.setTextSelection({ from: saved.from, to: saved.to });
				chain
					.insertContent({
						type: "text",
						text: trimmedUrl,
						marks: [{ type: "link", attrs: { href } }],
					})
					.run();
			} else {
				// Text was selected — apply link mark to that range.
				editor
					.chain()
					.focus()
					.setTextSelection({ from: saved.from, to: saved.to })
					.extendMarkRange("link")
					.setLink({ href })
					.run();
			}
		}
		setLinkOpen(false);
		setLinkUrl("");
		savedRangeRef.current = null;
		refreshToolbar((v) => v + 1);
	};

	const insertEmoji = (emojiData: EmojiClickData) => {
		editor?.chain().focus().insertContent(emojiData.emoji).run();
		setEmojiOpen(false);
	};

	return (
		<div className="rich-editor">
			<div
				aria-label="Message formatting"
				className="rich-toolbar"
				role="toolbar"
			>
				<Popover.Root onOpenChange={setStyleOpen} open={styleOpen}>
					<Popover.Trigger asChild>
						<button
							aria-label={`Text size: ${currentFontLabel}`}
							className={`rich-tool rich-style-trigger${currentFontSize ? " on" : ""}`}
							type="button"
						>
							Tt
						</button>
					</Popover.Trigger>
					<Popover.Portal>
						<Popover.Content
							align="start"
							className="rich-style-popover"
							collisionPadding={16}
							side="bottom"
							sideOffset={8}
						>
							{FONT_SIZES.map((size) => (
								<button
									aria-pressed={currentFontLabel === size.label}
									className={`rich-style-option${currentFontLabel === size.label ? " active" : ""}`}
									key={size.label}
									onClick={() => applyFontSize(size.value)}
									type="button"
								>
									<span
										className="rich-style-mark"
										style={{ color: "inherit" }}
									>
										{size.mark}
									</span>
									<span
										className="rich-style-label"
										style={{
											color: "inherit",
											fontSize: size.value || "14px",
										}}
									>
										{size.label}
									</span>
									<span className="rich-style-shortcut">{size.shortcut}</span>
								</button>
							))}
						</Popover.Content>
					</Popover.Portal>
				</Popover.Root>
				{/* onMouseDown preventDefault keeps editor focus so stored marks
            (pre-typing Bold / Italic / Color / Size) survive the click. */}
				<button
					aria-label="Bold"
					className={`rich-tool${editor?.isActive("bold") ? " on" : ""}`}
					onClick={() => run(() => editor?.chain().focus().toggleBold().run())}
					onMouseDown={(e) => e.preventDefault()}
					type="button"
				>
					<strong>B</strong>
				</button>
				<button
					aria-label="Italic"
					className={`rich-tool${editor?.isActive("italic") ? " on" : ""}`}
					onClick={() =>
						run(() => editor?.chain().focus().toggleItalic().run())
					}
					onMouseDown={(e) => e.preventDefault()}
					type="button"
				>
					<em>I</em>
				</button>
				<button
					aria-label="Underline"
					className={`rich-tool${editor?.isActive("underline") ? " on" : ""}`}
					onClick={() =>
						run(() => editor?.chain().focus().toggleUnderline().run())
					}
					onMouseDown={(e) => e.preventDefault()}
					type="button"
				>
					<u>U</u>
				</button>
				<span className="rich-divider" />
				<button
					aria-label="Bulleted list"
					className={`rich-tool${editor?.isActive("bulletList") ? " on" : ""}`}
					onClick={() =>
						run(() => editor?.chain().focus().toggleBulletList().run())
					}
					onMouseDown={(e) => e.preventDefault()}
					type="button"
				>
					•≡
				</button>
				<button
					aria-label="Numbered list"
					className={`rich-tool${editor?.isActive("orderedList") ? " on" : ""}`}
					onClick={() =>
						run(() => editor?.chain().focus().toggleOrderedList().run())
					}
					onMouseDown={(e) => e.preventDefault()}
					type="button"
				>
					1≡
				</button>
				<span className="rich-divider" />
				<div className="rich-color-group">
					{COLORS.map((color) => (
						<button
							aria-label={`Text color ${color}`}
							aria-pressed={currentColor === color}
							className={`rich-swatch${currentColor === color ? " active" : ""}`}
							key={color}
							onClick={() =>
								run(() => editor?.chain().focus().setColor(color).run())
							}
							onMouseDown={(e) => e.preventDefault()}
							style={{ background: color }}
							type="button"
						/>
					))}
				</div>
				<span className="rich-divider" />
				<Popover.Root onOpenChange={setEmojiOpen} open={emojiOpen}>
					<Popover.Trigger asChild>
						<button
							aria-label="Emoji"
							className={`rich-tool${emojiOpen ? " on" : ""}`}
							type="button"
						>
							☺
						</button>
					</Popover.Trigger>
					<Popover.Portal>
						<Popover.Content
							align="start"
							className="rich-emoji-popover"
							collisionPadding={16}
							side="bottom"
							sideOffset={8}
						>
							<EmojiPicker
								emojiStyle={EmojiStyle.NATIVE}
								height={360}
								lazyLoadEmojis
								onEmojiClick={insertEmoji}
								previewConfig={{ showPreview: false }}
								searchPlaceHolder="Search..."
								theme={emojiTheme}
								width="100%"
							/>
						</Popover.Content>
					</Popover.Portal>
				</Popover.Root>
				<Popover.Root onOpenChange={handleLinkOpenChange} open={linkOpen}>
					<Popover.Trigger asChild>
						<button
							aria-label="Link"
							className={`rich-tool${
								editor?.isActive("link") || linkOpen ? " on" : ""
							}`}
							onMouseDown={() => {
								if (editor) {
									const { from, to } = editor.state.selection;
									savedRangeRef.current = { from, to };
								}
							}}
							type="button"
						>
							<I.link />
						</button>
					</Popover.Trigger>
					<Popover.Portal>
						<Popover.Content
							align="start"
							className="rich-link-popover"
							collisionPadding={16}
							side="bottom"
							sideOffset={8}
						>
							<form
								className="rich-link-form"
								onSubmit={(e) => {
									e.preventDefault();
									applyLink();
								}}
							>
								<input
									// biome-ignore lint/a11y/noAutofocus: intentional focus for link dialog
									autoFocus
									className="rich-link-input"
									onChange={(e) => setLinkUrl(e.target.value)}
									placeholder="https://..."
									type="text"
									value={linkUrl}
								/>
								<button className="rich-link-apply" type="submit">
									Apply
								</button>
							</form>
							<p className="rich-link-hint">
								{linkUrl
									? "Press Apply or Enter to confirm"
									: "Leave empty + Apply to remove link"}
							</p>
						</Popover.Content>
					</Popover.Portal>
				</Popover.Root>
			</div>
			<div className="rich-editor-wrap">
				<EditorContent editor={editor} />
				{showPlaceholder && (
					<div className="rich-placeholder">{placeholder}</div>
				)}
			</div>
		</div>
	);
}
