import { useTheme } from "next-themes";
import type React from "react";
import { Toaster } from "sonner";

interface ToastProviderProps {
	position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
	children?: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
	position = "bottom-right",
	children,
}) => {
	const { resolvedTheme } = useTheme();
	const isDark = resolvedTheme === "dark";

	return (
		<>
			<Toaster
				closeButton
				position={position}
				richColors
				theme={isDark ? "dark" : "light"}
				toastOptions={{
					className: "toast-custom",
					style: {
						borderRadius: "8px",
					},
				}}
			/>
			{children}
		</>
	);
};
