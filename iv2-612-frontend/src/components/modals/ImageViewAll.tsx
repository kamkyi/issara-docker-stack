import { Cross2Icon } from "@radix-ui/react-icons";
import { Button, Dialog, Flex, Grid, ScrollArea, Text } from "@radix-ui/themes";
import type React from "react";

interface Review {
	author: string;
	comment: string;
	rating: number;
}

interface ImageViewAllProps {
	images: string[];
	reviews: Review[];
	companyName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const ImageViewAll: React.FC<ImageViewAllProps> = ({
	images,
	reviews,
	companyName,
	open,
	onOpenChange,
}) => {
	return (
		<Dialog.Root onOpenChange={onOpenChange} open={open}>
			<Dialog.Content
				style={{
					maxWidth: "80vw",
					height: "90vh",
					display: "flex",
					flexDirection: "column",
				}}
			>
				<Flex align="center" justify="between" mb="4">
					<Dialog.Title>{companyName} - Photos and Reviews</Dialog.Title>
					<Dialog.Close>
						<Button color="gray" variant="ghost">
							<Cross2Icon />
						</Button>
					</Dialog.Close>
				</Flex>

				<Grid
					columns={{ initial: "1", md: "3" }}
					gap="4"
					style={{ flex: 1, overflow: "hidden" }}
				>
					{/* Reviews Column */}
					<Flex direction="column" style={{ height: "100%" }}>
						<Text as="p" mb="2" size="4" weight="bold">
							Reviews
						</Text>
						<ScrollArea style={{ flex: 1 }}>
							{reviews.length > 0 ? (
								reviews.map((review, index) => (
									<div className="mb-4 p-2 border-b" key={index}>
										<Text as="p" weight="bold">
											{review.author}
										</Text>
										<Text as="p" color="gray" size="2">
											Rating: {review.rating}/5
										</Text>
										<Text as="p" size="2">
											{review.comment}
										</Text>
									</div>
								))
							) : (
								<Text>No reviews yet.</Text>
							)}
						</ScrollArea>
					</Flex>

					{/* Image Grid */}
					<div className="md:col-span-2" style={{ height: "100%" }}>
						<ScrollArea style={{ height: "100%" }}>
							<Grid columns={{ initial: "2", sm: "3", md: "4" }} gap="2">
								{images.map((image, index) => (
									<img
										alt={`${companyName} - ${index + 1}`}
										className="w-full h-full object-cover rounded-md"
										key={index}
										src={image}
									/>
								))}
							</Grid>
						</ScrollArea>
					</div>
				</Grid>
			</Dialog.Content>
		</Dialog.Root>
	);
};

export default ImageViewAll;
