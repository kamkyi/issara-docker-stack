import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import { Button, Flex } from "@radix-ui/themes";
import { memo, useState } from "react";
import vs_supplier_1 from "$src/assets/img/vs_supplier/1.png";
import vs_supplier_2 from "$src/assets/img/vs_supplier/2.png";
import vs_supplier_3 from "$src/assets/img/vs_supplier/3.png";
import vs_supplier_4 from "$src/assets/img/vs_supplier/4.png";
import vs_supplier_5 from "$src/assets/img/vs_supplier/5.png";
import vs_supplier_6 from "$src/assets/img/vs_supplier/6.png";

const ProductCard = () => {
	const [isExpanded, setIsExpanded] = useState(false);
	const params = new URLSearchParams(window.location.search);
	const id = params.get("id");
	const vsSupplierImages = [
		vs_supplier_1,
		vs_supplier_2,
		vs_supplier_3,
		vs_supplier_4,
		vs_supplier_5,
		vs_supplier_6,
	];

	const toggleExpand = () => {
		setIsExpanded(!isExpanded);
	};

	const renderImages = () => {
		if (id === "18136") {
			return (
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
					{vsSupplierImages.map((image, index) => (
						<div className="flex justify-center" key={index}>
							<img
								alt={`vs_supplier_image_${index + 1}`}
								className="h-auto max-w-full rounded-md"
								src={image}
							/>
						</div>
					))}
				</div>
			);
		}

		return (
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				{/* This is just mock data, I'll keep it for now */}
				<div className="grid gap-4">
					<div>
						<img
							alt=""
							className="h-auto max-w-full rounded-md"
							src="https://media.istockphoto.com/id/1363734940/photo/three-cardboard-boxes.jpg?s=612x612&w=0&k=20&c=Qj6K1O9O0C3afPCrCGJzR_8MRlxSgpfSs24hvVjxaq0="
						/>
					</div>
					<div>
						<img
							alt=""
							className="h-auto max-w-full rounded-md"
							src="https://thumbs.dreamstime.com/b/bottle-labeling-machine-sample-products-industrial-machinery-201839501.jpg"
						/>
					</div>
					<div>
						<img
							alt=""
							className="h-auto max-w-full rounded-md"
							src="https://neminc.com/content/uploads/sites/6/2022/10/industry_chemical.jpg"
						/>
					</div>
				</div>
				<div className="grid gap-4">
					<div>
						<img
							alt=""
							className="h-auto max-w-full rounded-md"
							src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZVHxk5Fdgc-Kmj4XHJqdoNlEbKAxj4Rs_O4J_OAK60naSiPY35Xq1tYFMGl0EAh6IWsw&usqp=CAU"
						/>
					</div>
					<div>
						<img
							alt=""
							className="h-auto max-w-full rounded-md"
							src="https://www.hmcpolymers.com/storage/content/technical-information/chemical-resistance/chemical-resistance.png"
						/>
					</div>
					<div>
						<img
							alt=""
							className="h-auto max-w-full rounded-md"
							src="https://cdn.dribbble.com/userupload/9837996/file/original-71f32f3128b917a89992e346837f3b56.jpg?resize=752x&vertical=center"
						/>
					</div>
				</div>
				<div className="grid gap-4">
					<div>
						<img
							alt=""
							className="h-auto max-w-full rounded-md"
							src="https://cdn.dribbble.com/userupload/43297211/file/original-cadc4fc1467c003715be5ddf45363238.jpg?format=webp&resize=400x300&vertical=center"
						/>
					</div>
					<div>
						<img
							alt=""
							className="h-auto max-w-full rounded-md"
							src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQx3mgMJQJ_UpHTHJdKZBer0QbQzZIMEWge6a3F7x9PzztZ0wjrguRxJnS4IUa-d6-rMwE&usqp=CAU"
						/>
					</div>
					<div>
						<img
							alt=""
							className="h-auto max-w-full rounded-md"
							src="https://mir-s3-cdn-cf.behance.net/projects/404/7a8b65223595985.Y3JvcCwzODM1LDMwMDAsODUsMA.jpg"
						/>
					</div>
				</div>
				<div className="grid gap-4">
					<div>
						<img
							alt=""
							className="h-auto max-w-full rounded-md"
							src="https://5.imimg.com/data5/TW/GR/HB/SELLER-100302373/luxury-shirt-box-500x500.jpg"
						/>
					</div>
					<div>
						<img
							alt=""
							className="h-auto max-w-full rounded-md"
							src="https://i0.wp.com/twindly.com/blog/wp-content/uploads/2019/05/problems_with_beauty_samples.jpg?fit=2460%2C1640&ssl=1"
						/>
					</div>
					<div>
						<img
							alt=""
							className="h-auto max-w-full rounded-md"
							src="https://bpilabs.com/wp-content/uploads/2018/05/packets.png"
						/>
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="relative pb-10">
			{" "}
			{/* Padding bottom to avoid content being hidden by the button */}
			<div
				className={`relative transition-all duration-600 ease-in-out ${isExpanded ? "max-h-[1000px]" : "max-h-96"} overflow-hidden`}
			>
				{renderImages()}
				{!isExpanded && (
					<div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
				)}
			</div>
			<Flex
				justify="center"
				mt="-8"
				style={{ position: "relative", zIndex: 1 }}
			>
				<Button
					onClick={toggleExpand}
					style={{
						background: "white",
						border: "1px solid #e5e7eb",
						borderRadius: "9999px",
					}}
					variant="soft"
				>
					<Flex align="center" gap="2">
						{isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
						{isExpanded ? "Show Less" : "Show More"}
					</Flex>
				</Button>
			</Flex>
		</div>
	);
};

export default memo(ProductCard);
