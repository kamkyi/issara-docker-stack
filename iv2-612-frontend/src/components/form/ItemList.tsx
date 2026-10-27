import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { Button, Card, Dialog, Flex, Text } from "@radix-ui/themes";
import type React from "react";

interface ListItemProps {
	id?: string;
	index: number;
	onDelete: (index: number) => void;
	children: React.ReactNode;
	hoverEffect?: boolean;
}

/**
 * Reusable list item component for displaying items with delete functionality
 * Used for contacts, addresses, and other list items
 */
export function ListItem({
	id,
	index,
	onDelete,
	children,
	hoverEffect = true,
}: ListItemProps) {
	return (
		<Card
			className={`p-4 border border-gray-100 ${hoverEffect ? "hover:bg-white transition-colors duration-200" : ""}`}
			key={id}
		>
			<Flex align="start" justify="between">
				<div className="flex-1">{children}</div>
				<Button
					color="red"
					onClick={() => onDelete(index)}
					size="1"
					variant="soft"
				>
					<TrashIcon />
				</Button>
			</Flex>
		</Card>
	);
}

interface ItemListProps {
	title: string;
	items: any[];
	onAdd: () => void;
	onDelete: (index: number) => void;
	renderItem: (item: any, index: number) => React.ReactNode;
	emptyMessage?: string;
	addButtonLabel?: string;
	addButtonColor?: "blue" | "green" | "amber" | "red" | "gray";
	className?: string;
}

/**
 * Reusable component for displaying a list of items with add and delete functionality
 * Abstraction for contact list, address list, and similar patterns
 */
export function ItemList({
	title,
	items,
	onAdd,
	onDelete,
	renderItem,
	emptyMessage = "No items added yet",
	addButtonLabel = "Add Item",
	addButtonColor = "green",
	className = "",
}: ItemListProps) {
	return (
		<Card
			className={`p-5 rounded-md shadow-sm hover:shadow-md transition-all duration-300 ${className}`}
		>
			<Flex align="center" justify="between" mb="5">
				<h3 className="text-lg font-semibold">{title}</h3>
				<Button
					className="rounded-full px-4 py-0"
					color={addButtonColor}
					onClick={onAdd}
					variant="soft"
				>
					<PlusIcon /> {addButtonLabel}
				</Button>
			</Flex>

			{items.length === 0 ? (
				<div className="rounded-md p-8 text-center border border-gray-100">
					<Text align="center" className="p-4" color="gray">
						{emptyMessage}
					</Text>
				</div>
			) : (
				<div className="space-y-4">
					{items.map((item, index) => (
						<ListItem index={index} key={item.id || index} onDelete={onDelete}>
							{renderItem(item, index)}
						</ListItem>
					))}
				</div>
			)}
		</Card>
	);
}

interface AddItemDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	children: React.ReactNode;
	onSubmit: () => void;
	submitLabel?: string;
	isLoading?: boolean;
	descriptionId?: string;
}

/**
 * Reusable dialog component for adding new items
 * Standardizes the look and feel of add item dialogs throughout the app
 */
export function AddItemDialog({
	open,
	onOpenChange,
	title,
	description,
	children,
	onSubmit,
	submitLabel = "Add Item",
	isLoading = false,
	descriptionId = "dialog-description",
}: AddItemDialogProps) {
	return (
		<Dialog.Root onOpenChange={onOpenChange} open={open}>
			<Dialog.Content aria-describedby={descriptionId}>
				<Dialog.Title>{title}</Dialog.Title>
				<Dialog.Description id={descriptionId} mb="4" size="2">
					{description}
				</Dialog.Description>

				<Flex direction="column" gap="3">
					{children}
				</Flex>

				<Flex gap="3" justify="end" mt="4">
					<Dialog.Close>
						<Button color="gray" variant="soft">
							Cancel
						</Button>
					</Dialog.Close>
					<Button disabled={isLoading} onClick={onSubmit}>
						{isLoading ? "Adding..." : submitLabel}
					</Button>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
}
