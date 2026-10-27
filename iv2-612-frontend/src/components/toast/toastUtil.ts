import { toast } from "sonner";

type ToastOptions = {
	duration?: number;
	id?: string;
	icon?: React.ReactNode;
};

export const showToast = {
	success: (message: string, options?: ToastOptions) => {
		return toast.success(message, options);
	},
	error: (message: string, options?: ToastOptions) => {
		return toast.error(message, options);
	},
	warning: (message: string, options?: ToastOptions) => {
		return toast.warning(message, options);
	},
	info: (message: string, options?: ToastOptions) => {
		return toast.info(message, options);
	},
	loading: (message: string, options?: ToastOptions) => {
		return toast.loading(message, options);
	},
	promise: <T>(
		promise: Promise<T>,
		messages: {
			loading: string;
			success: string | ((data: T) => string);
			error: string | ((error: Error) => string);
		},
	) => {
		return toast.promise(promise, messages);
	},
	dismiss: (toastId?: string) => {
		toast.dismiss(toastId);
	},
};
