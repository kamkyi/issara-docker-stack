import * as Dialog from "@radix-ui/react-dialog";
import {
	CheckCircledIcon,
	Cross2Icon,
	ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import type React from "react";

interface SuccessModalProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	message?: string;
	actionLabel?: string;
	variant?: "success" | "error";
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
	isOpen,
	onClose,
	title = "Success",
	message = "Operation completed successfully!",
	actionLabel = "OK",
	variant = "success",
}) => {
	const isSuccess = variant === "success";

	return (
		<Dialog.Root onOpenChange={onClose} open={isOpen}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fadeIn" />
				<Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 shadow-2xl z-50 w-[90%] max-w-md animate-scaleIn">
					<div className="flex flex-col items-center text-center">
						<div
							className={`p-3 rounded-full mb-4 ${
								isSuccess ? "bg-green-100" : "bg-red-100"
							}`}
						>
							{isSuccess ? (
								<CheckCircledIcon className="text-green-600 w-8 h-8" />
							) : (
								<ExclamationTriangleIcon className="text-red-600 w-8 h-8" />
							)}
						</div>

						<Dialog.Title className="text-xl font-semibold text-gray-900 mb-2">
							{title}
						</Dialog.Title>

						<Dialog.Description className="text-gray-600 mb-6">
							{message}
						</Dialog.Description>

						<button
							className={`text-white py-2 px-6 rounded-md transition-colors w-full sm:w-auto font-medium ${
								isSuccess
									? "bg-green-600 hover:bg-green-700"
									: "bg-red-600 hover:bg-red-700"
							}`}
							onClick={onClose}
						>
							{actionLabel}
						</button>
					</div>

					<Dialog.Close asChild>
						<button
							aria-label="Close"
							className="absolute top-4 right-4 inline-flex items-center justify-center rounded-full h-8 w-8 text-gray-500 hover:bg-gray-100 transition-colors"
						>
							<Cross2Icon />
						</button>
					</Dialog.Close>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
