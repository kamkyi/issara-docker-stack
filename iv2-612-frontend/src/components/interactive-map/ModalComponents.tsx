import { Cross2Icon } from "@radix-ui/react-icons";
import { Flex, Text } from "@radix-ui/themes";

type LoadingSpinnerProps = {
	message?: string;
};

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				padding: "3rem 0",
			}}
		>
			<div
				style={{
					width: "40px",
					height: "40px",
					border: "4px solid #f3f3f3",
					borderTop: "4px solid #32b2c3",
					borderRadius: "50%",
					animation: "spin 1s linear infinite",
				}}
			/>
			{message && (
				<div style={{ marginLeft: "1rem", color: "#666", fontSize: "14px" }}>
					{message}
				</div>
			)}
		</div>
	);
}

type ModalHeaderProps = {
	title: string;
	onClose: () => void;
};

export function ModalHeader({ title, onClose }: ModalHeaderProps) {
	return (
		<Flex align="center" justify="between" mb="4">
			<Text size="6" weight="bold">
				{title}
			</Text>
			<button
				onClick={onClose}
				onMouseEnter={(e) => {
					e.currentTarget.style.background = "#f3f4f6";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.background = "none";
				}}
				style={{
					background: "none",
					border: "none",
					cursor: "pointer",
					padding: "0.5rem",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					borderRadius: "4px",
					transition: "background 0.2s",
				}}
				type="button"
			>
				<Cross2Icon height="20" width="20" />
			</button>
		</Flex>
	);
}

type ModalBackdropProps = {
	onClose: () => void;
};

export function ModalBackdrop({ onClose }: ModalBackdropProps) {
	return (
		<div
			className="fixed inset-0 bg-black/50 z-[999]"
			onClick={onClose}
			style={{ transition: "opacity 0.3s ease" }}
		/>
	);
}
