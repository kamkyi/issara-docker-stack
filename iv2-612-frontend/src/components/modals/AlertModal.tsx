import type { AlertModalProps } from "$src/types/modals";

const AlertModal = (props: AlertModalProps & { open: boolean }) => {
	const { open, title, message, onClose, onConfirm } = props;
	if (!open) return null;
	return (
		<div
			aria-modal="true"
			className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.6)]"
			role="alertdialog"
		>
			<div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 border border-gray-200">
				<h3 className="text-lg font-bold mb-2 text-teal">{title}</h3>
				<p className="mb-4 text-gray-700">{message}</p>
				<div className="flex justify-end gap-2">
					<button
						className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-teal font-medium border border-[#148696] transition"
						onClick={onClose}
					>
						Cancel
					</button>
					<button
						className="px-4 py-2 rounded bg-teal hover:bg-[#0e5e5e] text-white font-medium border border-[#148696] transition"
						onClick={onConfirm}
					>
						Confirm
					</button>
				</div>
			</div>
		</div>
	);
};

export default AlertModal;
