import { Card, Flex, Text } from "@radix-ui/themes";
import type React from "react";

interface StepShellProps {
	title: string;
	subtitle?: string;
	children: React.ReactNode;
}

/** Same card, heading and field spacing as the supplier form's steps. */
export const StepShell: React.FC<StepShellProps> = ({
	title,
	subtitle,
	children,
}) => (
	<Card className="p-4">
		<Text className="mb-4" size="5" weight="bold">
			{title}
		</Text>
		{subtitle && (
			<Text className="mb-4" color="red" size="2">
				{subtitle}
			</Text>
		)}
		<Flex direction="column" gap="3">
			{children}
		</Flex>
	</Card>
);

export interface StepProps {
	formData: import("../formModel").WorkerVoiceFormData;
	update: <K extends keyof import("../formModel").WorkerVoiceFormData>(
		field: K,
		value: import("../formModel").WorkerVoiceFormData[K],
	) => void;
	/** Translation keys of required fields the user tried to skip. */
	missing: string[];
}

export const errorFor = (
	missing: string[],
	labelKey: string,
	message: string,
): string | undefined => (missing.includes(labelKey) ? message : undefined);
