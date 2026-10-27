import { ArrowRightIcon, Cross2Icon } from "@radix-ui/react-icons";
import { Button, Card, Dialog, Flex, Text } from "@radix-ui/themes";

interface FeedbackTypeOptionModalProps {
	open: boolean;
	title: string;
	optionsData?: { id: string; label: string }[];
	onClose: () => void;
	onClickOption: (data?: any) => void;
}

const FeedbackTypeOptionModal = ({
	open,
	title,
	optionsData,
	onClose,
	onClickOption,
}: FeedbackTypeOptionModalProps) => {
	if (!open) return null;
	return (
		<Dialog.Root onOpenChange={onClose} open={open}>
			<Dialog.Content style={{ maxWidth: 600 }}>
				<Flex align="center" justify="between">
					<Dialog.Title mb="0">{title}</Dialog.Title>
					<Dialog.Close>
						<Button
							className="rounded-full"
							onClick={onClose}
							size="2"
							variant="ghost"
						>
							<Cross2Icon />
						</Button>
					</Dialog.Close>
				</Flex>
				{optionsData && optionsData.length > 0 && (
					<Flex align="start" direction="column" gap="2">
						{optionsData.map((option) => (
							<Card
								className="w-full group hover:bg-green-100 cursor-pointer"
								key={option.id}
								onClick={() => onClickOption(option.label)}
							>
								<Flex align="center" justify="between">
									<Text
										as="label"
										className="cursor-pointer hover:text-green-800"
										size="2"
									>
										{option.label}
									</Text>
									<ArrowRightIcon className="invisible group-hover:visible" />
								</Flex>
							</Card>
						))}
					</Flex>
				)}
				<div className="mt-4 flex justify-end">
					<Button color="gray" onClick={onClose} size="3" variant="outline">
						Close
					</Button>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	);
};

export default FeedbackTypeOptionModal;
