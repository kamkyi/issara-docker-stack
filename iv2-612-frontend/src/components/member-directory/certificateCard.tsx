import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { StarFilledIcon } from "@radix-ui/react-icons";
import { Card, Flex } from "@radix-ui/themes";
import "./certificate.css";

const CertificateCard = () => {
	return (
		<Card>
			<div className="text-xs">
				<Flex align={"center"} gap={"2"}>
					<span className="relative">
						<EmojiEventsIcon />
						<div className="absolute top-0 right-0 rotate-scale-box">
							<StarFilledIcon color="#dd9933" />
						</div>
					</span>
					<p className="text-sm">ESG Certificate</p>
				</Flex>

				<hr className="opacity-10 my-1" />
				<p className="flex justify-between">
					<b>Provider :</b>
					Unicef
				</p>
				<p className="flex justify-between">
					<b>Completed at :</b>
					<span>12-Aug-2025</span>
				</p>
			</div>
		</Card>
	);
};

export default CertificateCard;
