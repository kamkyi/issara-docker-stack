export type PollInputType = "single" | "multiple" | "ranking" | "yesno";

export interface PollAnswerOption {
	id: string;
	text: string;
}

export interface PollFormData {
	title: string;
	description: string;
	isScheduled: boolean;
	startDate: string;
	endDate: string;
	targetGroup: string;
	selectedGenders: string[];
	selectedNationalities: string[];
	ageRange: [number, number];
	question: string;
	inputType: PollInputType;
	answerOptions: PollAnswerOption[];
}

export interface StepProps {
	formData: PollFormData;
	updateFormData: (data: Partial<PollFormData>) => void;
	onNext?: () => void;
	onBack?: () => void;
	onCancel?: () => void;
	onSaveDraft?: () => void;
	onSaveAndPublishPost?: () => void;
}

export const POLL_INPUT_TYPE_LABELS: Record<PollInputType, string> = {
	single: "Single Choice",
	multiple: "Multiple Choice",
	ranking: "Ranking",
	yesno: "Yes / No",
};

export const POLL_GENDER_OPTIONS = [
	{ value: "M", label: "Male" },
	{ value: "F", label: "Female" },
	{ value: "N", label: "Prefer not to say" },
	{ value: "X", label: "Non-Binary" },
] as const;

export const POLL_GENDER_LABELS = POLL_GENDER_OPTIONS.reduce<
	Record<string, string>
>((acc, option) => {
	acc[option.value] = option.label;
	return acc;
}, {});

export function getDisplayGenderLabel(gender: string) {
	return POLL_GENDER_LABELS[gender] ?? gender;
}

function createOption(text = ""): PollAnswerOption {
	return {
		id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		text,
	};
}

function cloneOptions(options: PollAnswerOption[]): PollAnswerOption[] {
	return options.map((option) => ({ ...option }));
}

const YES_NO_OPTIONS: PollAnswerOption[] = [
	{ id: "yes", text: "Yes" },
	{ id: "no", text: "No" },
];

export function getDefaultAnswerOptions(inputType: PollInputType) {
	if (inputType === "yesno") {
		return cloneOptions(YES_NO_OPTIONS);
	}
	return [createOption(), createOption()];
}

export function normalizeAnswerOptionsForType(
	inputType: PollInputType,
	answerOptions: PollAnswerOption[],
) {
	if (inputType === "yesno") {
		return cloneOptions(YES_NO_OPTIONS);
	}
	const normalized = answerOptions.map((option) => ({
		id: option.id,
		text: option.text ?? "",
	}));
	while (normalized.length < 2) {
		normalized.push(createOption());
	}
	return normalized;
}

export function getChoiceTextsForPayload(
	inputType: PollInputType,
	answerOptions: PollAnswerOption[],
) {
	if (inputType === "yesno") {
		return YES_NO_OPTIONS.map((option) => option.text);
	}
	return answerOptions
		.map((option) => option.text.trim())
		.filter((text) => text !== "");
}

export function getDisplayAnswerOptions(
	inputType: PollInputType,
	answerOptions: PollAnswerOption[],
) {
	if (inputType === "yesno") {
		return cloneOptions(YES_NO_OPTIONS);
	}
	return answerOptions.filter((option) => option.text.trim() !== "");
}
