import {
	type BoardDoc,
	type PostType,
	TYPE_LABEL,
} from "$src/assets/mock/message-board";
import { RichMessageBody } from "$src/components/messageBoard/RichMessageBody";
import { readAdminUser } from "./adminUser";
import { I } from "./icons";

// The live "Partner preview" rendered beside the composer form. Mirrors the
// partner-facing PostCard markup (same .post / .post-* classes) so staff see
// exactly how a post will look before publishing.
export interface PreviewData {
	type: PostType;
	title: string;
	body: string;
	pinned: boolean;
	ackRequired: boolean;
	// Resolved image src (object URL for a freshly picked file, or the existing
	// banner URL when editing). Empty string ⇒ no banner.
	image: string;
	docName: string;
	docKind: "pdf" | "xls" | "other";
	// Attachments already saved on the post, with their stored file URLs. Set when
	// viewing an existing post (Team Console "View post"), so staff can open or
	// download the documents rather than only reading the file name. The composer
	// leaves this undefined — freshly picked files aren't uploaded yet — and falls
	// back to the docName/docKind placeholder row below.
	docs?: BoardDoc[];
	evMonth: string;
	evDay: string;
	evWhen: string;
	evWhere: string;
}

// A saved attachment with working Preview / Download affordances, mirroring the
// partner-facing DocAttach row. Cross-origin (S3) files ignore the `download`
// attribute unless the server sends Content-Disposition, so it opens in a new
// tab in that case — the same behaviour as the partner reader.
function DocRow({ doc }: { doc: BoardDoc }) {
	const ext = doc.kind === "pdf" ? "PDF" : "XLSX";
	return (
		<div className="doc">
			<div className={`ic ${doc.kind}`}>
				<I.doc />
				<span className="ext">{ext}</span>
			</div>
			<div className="dmeta">
				<div className="fn">{doc.name}</div>
				<div className="fs">{doc.size || "Document attached"}</div>
			</div>
			{doc.url ? (
				<div className="dl">
					<a
						className="btn-ghost"
						href={doc.url}
						rel="noopener noreferrer"
						target="_blank"
					>
						<I.eye /> Preview
					</a>
					<a
						className="btn-ghost"
						download={doc.name || ""}
						href={doc.url}
						rel="noopener"
						target="_blank"
					>
						<I.download /> Download
					</a>
				</div>
			) : (
				<div className="dl">
					<span className="fs">No file available</span>
				</div>
			)}
		</div>
	);
}

export function ComposerPreview({ d }: { d: PreviewData }) {
	const a = readAdminUser();
	const ext = d.docKind === "pdf" ? "PDF" : "XLSX";
	return (
		<article className="post" style={{ boxShadow: "var(--mb-shadow-card)" }}>
			{d.pinned && (
				<div className="post-pin">
					<I.pinAlt /> Pinned by CASCADE team
				</div>
			)}
			<div className="post-body">
				<div className="post-top">
					<div className="author">
						<div className="av person" style={{ background: a.color }}>
							CT
						</div>
						<div>
							<div className="nm">
								ILM Cascade Team <I.verified className="verified" />
							</div>
							<div className="meta">just now</div>
						</div>
					</div>
					<div className="post-actions">
						<span className={`tag ${d.type}`}>{TYPE_LABEL[d.type]}</span>
					</div>
				</div>
				<h3>{d.title || "Untitled post"}</h3>
				<RichMessageBody emptyText="…" html={d.body} />

				{d.type === "announcement" && d.image && (
					<div className="imgslot imgslot-has">
						<img alt="Post banner" src={d.image} />
					</div>
				)}
				{d.docs?.length
					? d.docs.map((doc) => <DocRow doc={doc} key={doc.id ?? doc.name} />)
					: d.docName && (
							<div className="doc">
								<div className={`ic ${d.docKind}`}>
									<I.doc />
									<span className="ext">{ext}</span>
								</div>
								<div className="dmeta">
									<div className="fn">{d.docName}</div>
									<div className="fs">Document attached</div>
								</div>
							</div>
						)}
				{d.type === "event" && (
					<div className="event-box">
						<div className="cal">
							<div className="m">{d.evMonth}</div>
							<div className="d">{d.evDay || "—"}</div>
						</div>
						<div className="ev-meta">
							<div className="ev-when">{d.evWhen || "Date TBC"}</div>
							<div className="ev-where">
								<I.mapPin /> {d.evWhere || "Location TBC"}
							</div>
						</div>
					</div>
				)}
			</div>
			<div className="post-foot">
				{d.ackRequired ? (
					<div className="ack">
						<button className="btn-ack" type="button">
							<I.checkCircle /> Acknowledge receipt
						</button>
					</div>
				) : (
					<span className="ack-meta">No acknowledgement required</span>
				)}
			</div>
		</article>
	);
}
