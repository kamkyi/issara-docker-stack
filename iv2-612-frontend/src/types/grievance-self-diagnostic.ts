import type { AnswerMap } from "$src/data/grievanceDiagnosticSections";

export type Step =
	| "intro"
	| "components"
	| "question"
	| "section_complete"
	| "results";

export type SavedProgressPayload = {
	step?: Step;
	sectionIndex?: number;
	questionIndex?: number;
	answers?: AnswerMap;
};

export type MailAttachment = {
	filename: string;
	data: string;
	contentType?: string;
};

export type MailOptionsPayload = {
	to: string | string[];
	subject: string;
	text?: string;
	html?: string;
	from?: string;
	replyTo?: string;
	attachment?: MailAttachment | MailAttachment[];
	inline?: MailAttachment | MailAttachment[];
};

export type ConfettiSpawn =
	| "top"
	| "center"
	| "left"
	| "right"
	| "bottom"
	| "sides"
	| "corners"
	| "topBottom"
	| "burst";

export type ConfettiShape = "circle" | "rect" | "diamond" | "square" | "star";
