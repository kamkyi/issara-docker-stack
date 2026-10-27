import { ChevronDownIcon } from "@radix-ui/react-icons";
import moment from "moment";

const SummaryComponent = ({ data, context, title, header }) => {
	if (!data || data.length === 0) return null;
	return (
		<div className="prev_data">
			<h4>{title}</h4>
			{data.map((notes, index) => (
				<details className="mb-2 border rounded bg-slate-50" key={notes.id}>
					<summary className="flex items-center cursor-pointer p-2">
						<ChevronDownIcon className="mr-2" />
						<span className="old-notes-text">
							{context.t("Note")} {index + 1} -{" "}
							{moment(notes.updated_at).fromNow()}
						</span>
					</summary>
					<div className="p-4">
						<div style={{ fontStyle: "italic", marginBottom: 4 }}>
							{context.t("Updated At ")}
							{moment(notes.updated_at).format("DD MMM, YYYY HH:mm")}
						</div>
						<div>
							<span className="text_headers">{header}</span>
							{notes.description}
						</div>
					</div>
				</details>
			))}
		</div>
	);
};

export default SummaryComponent;
