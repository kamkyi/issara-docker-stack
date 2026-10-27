/**
 * Mock backing store for the supplier-KPI grievance form.
 *
 * Used whenever useMockData() is true — the Flagsmith `use_mock_data` flag
 * (set per Flagsmith environment) and internal
 * roles (test user / Issara staff / management) on production, including a
 * management user who switches to the Supplier view. In those cases the KPI
 * rows themselves come from the JSON fixtures and have no server-side
 * grievance, so hitting the API only ever produced "Unable to load the
 * grievance record".
 *
 * Everything the form does — load, edit, Save Draft, Submit, attachments —
 * round-trips through localStorage instead. The envelope shape mirrors what
 * Django's grievance serializer returns (including `list_of_text_fields` with
 * per-note authors, newest-first) so the form, the notes history and the
 * latest-note prefill behave exactly as they do against the live API.
 */

// v2: the seeded note authors changed (Issara addresses -> the supplier-side
// hr@ / john@seafood.co placeholders), and the seed is only applied to KPI ids
// the store has never seen. Bumping the key retires records written under the
// old placeholders instead of leaving them on screen.
const STORAGE_KEY = "cascade.mock.supplierKpiGrievances.v2";

export interface MockGrievanceNote {
	id: number;
	value: string;
	created_at: string;
	updated_at: string;
	author: number | null;
	author_email: string | null;
	is_submitted: boolean;
}

export interface MockGrievanceEnvelope {
	id: number;
	supplier_kpi: number;
	is_draft: boolean;
	[key: string]: unknown;
	information_collection_attachments: Array<{
		id: number;
		name: string;
		type: string;
		file_path: string;
		permission: string;
		size: string;
	}>;
	list_of_text_fields: {
		remediations: Array<{
			id: number;
			description: string;
			created_at: string;
			updated_at: string;
			author_email: string | null;
			is_submitted: boolean;
		}>;
		system_strengthenings: Array<{
			id: number;
			description: string;
			created_at: string;
			updated_at: string;
			author_email: string | null;
		}>;
		information_collection_notes: MockGrievanceNote[];
		safeguarding_notes: MockGrievanceNote[];
		ethical_investigation_notes: MockGrievanceNote[];
		communication_notes: MockGrievanceNote[];
	};
}

type Store = Record<string, MockGrievanceEnvelope>;

const NOTE_FIELDS = [
	"safeguarding_notes",
	"information_collection_notes",
	"ethical_investigation_notes",
	"communication_notes",
] as const;

type NoteField = (typeof NOTE_FIELDS)[number];

const readStore = (): Store => {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as unknown;
		return parsed && typeof parsed === "object" && !Array.isArray(parsed)
			? (parsed as Store)
			: {};
	} catch {
		return {};
	}
};

const writeStore = (store: Store) => {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
	} catch {
		// Quota / private-mode failures are non-fatal: the form keeps the record
		// in React state for the rest of the session.
	}
};

/** Email of the signed-in user, so notes they add are attributed to them. */
const currentUserEmail = (): string => {
	try {
		const raw = localStorage.getItem("auth_user");
		const authUser = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
		const email = authUser.email ?? authUser.username;
		return typeof email === "string" && email.trim()
			? email
			: "you@cascade.demo";
	} catch {
		return "you@cascade.demo";
	}
};

const daysAgo = (days: number): string => {
	const date = new Date();
	date.setDate(date.getDate() - days);
	return date.toISOString();
};

const makeNote = (
	id: number,
	value: string,
	author_email: string,
	days: number,
): MockGrievanceNote => ({
	id,
	value,
	created_at: daysAgo(days),
	updated_at: daysAgo(days),
	author: null,
	author_email,
	is_submitted: true,
});

/**
 * Starter record for a KPI the demo user has not touched yet. Seeded with two
 * safeguarding notes and one communication note from different authors so the
 * "Note 1 / Note 2 + who wrote it" list and the latest-note prefill have
 * something to show on a fresh browser.
 */
const seedEnvelope = (supplierKpiId: number): MockGrievanceEnvelope => ({
	id: supplierKpiId,
	supplier_kpi: supplierKpiId,
	is_draft: true,
	issara_context: "",
	checked_with_hr: "",
	repeat_issue: "",
	zero_tolerance: "",
	reviewed_individual: "",
	involved_in_grievance: "",
	received_the_training: "",
	has_trained_impartial: { value: "", description: "" },
	ethical_reviewed: { value: "", description: "" },
	professional_ensured: { value: "", description: "" },
	impartial_ensured: { value: "", description: "" },
	inclusive_and_accessible: { value: "", description: "" },
	timely_and_effective: { value: "", description: "" },
	investigation_their_wellbeing: { value: "", description: "" },
	need_help_with_complex_consequences: null,
	trainings: [],
	information_collection_attachments: [],
	list_of_text_fields: {
		remediations: [],
		system_strengthenings: [],
		information_collection_notes: [],
		ethical_investigation_notes: [],
		communication_notes: [
			makeNote(
				3001,
				"Called the two workers to confirm they feel safe raising further issues. No retaliation reported.",
				"john@seafood.co",
				4,
			),
		],
		safeguarding_notes: [
			makeNote(
				2002,
				"HR agreed to reissue PPE and retrain the line supervisors this week.",
				"hr@seafood.co",
				3,
			),
			makeNote(
				2001,
				"First pass: PPE gaps confirmed on the packing line, workers moved off the affected station.",
				"john@seafood.co",
				11,
			),
		],
	},
});

export const getMockGrievance = (
	supplierKpiId: number,
): MockGrievanceEnvelope => {
	const store = readStore();
	const existing = store[String(supplierKpiId)];
	if (existing) return existing;

	const seeded = seedEnvelope(supplierKpiId);
	store[String(supplierKpiId)] = seeded;
	writeStore(store);
	return seeded;
};

const noteValueFromPayload = (
	payload: Record<string, unknown>,
	field: string,
) => {
	const raw = payload[field];
	if (typeof raw === "string") return raw.trim();
	if (raw && typeof raw === "object" && "value" in raw) {
		const value = (raw as { value?: unknown }).value;
		return typeof value === "string" ? value.trim() : "";
	}
	return "";
};

const nextNoteId = (notes: MockGrievanceNote[]) =>
	notes.reduce((max, note) => Math.max(max, note.id), 0) + 1;

/**
 * Merge a save into the stored record: scalar answers overwrite, notes append a
 * new authored entry (newest-first), remediation updates append or update by id.
 * Mirrors what the Django endpoint does with the same payload.
 */
export const saveMockGrievance = ({
	supplierKpiId,
	payload,
	isDraft,
}: {
	supplierKpiId: number;
	payload: Record<string, unknown>;
	isDraft: boolean;
}): MockGrievanceEnvelope => {
	const store = readStore();
	const current = store[String(supplierKpiId)] ?? seedEnvelope(supplierKpiId);
	const author = currentUserEmail();
	const now = new Date().toISOString();

	const { list_of_text_fields: _ignored, remediations, ...scalars } = payload;
	const next: MockGrievanceEnvelope = {
		...current,
		...scalars,
		id: current.id,
		supplier_kpi: supplierKpiId,
		is_draft: isDraft,
		information_collection_attachments:
			current.information_collection_attachments,
		list_of_text_fields: { ...current.list_of_text_fields },
	};

	for (const field of NOTE_FIELDS) {
		const value = noteValueFromPayload(payload, field);
		// An empty note means "unchanged" — SupplierKpiGrievanceForm blanks a
		// note out of the payload when it still equals the seeded prefill.
		if (!value) {
			// Keep the field itself out of the envelope so the prefill continues to
			// come from the note list rather than a stale scalar.
			delete (next as Record<string, unknown>)[field];
			continue;
		}
		const existing = next.list_of_text_fields[field as NoteField];
		next.list_of_text_fields[field as NoteField] = [
			{
				id: nextNoteId(existing),
				value,
				created_at: now,
				updated_at: now,
				author: null,
				author_email: author,
				is_submitted: !isDraft,
			},
			...existing,
		];
		delete (next as Record<string, unknown>)[field];
	}

	if (Array.isArray(remediations)) {
		const entries = remediations as Array<{
			id?: number;
			description?: string;
			is_submitted?: boolean;
		}>;
		next.list_of_text_fields.remediations = entries
			.filter((entry) => entry.description?.trim())
			.map((entry, index) => ({
				id: entry.id ?? 5000 + index,
				description: entry.description ?? "",
				created_at: now,
				updated_at: now,
				author_email: author,
				is_submitted: entry.is_submitted ?? !isDraft,
			}));
	}

	store[String(supplierKpiId)] = next;
	writeStore(store);
	return next;
};

/** Attachment add / remove / visibility change, without uploading anything. */
export const updateMockGrievanceAttachments = ({
	supplierKpiId,
	newFiles = [],
	removedIds = [],
	visibilityUpdates = {},
}: {
	supplierKpiId: number;
	newFiles?: Array<{ file: File; permission: string }>;
	removedIds?: number[];
	visibilityUpdates?: Record<number, string>;
}): MockGrievanceEnvelope => {
	const store = readStore();
	const current = store[String(supplierKpiId)] ?? seedEnvelope(supplierKpiId);

	const kept = current.information_collection_attachments
		.filter((attachment) => !removedIds.includes(attachment.id))
		.map((attachment) =>
			visibilityUpdates[attachment.id]
				? { ...attachment, permission: visibilityUpdates[attachment.id] }
				: attachment,
		);

	const added = newFiles.map((attachment, index) => ({
		id: Date.now() + index,
		name: attachment.file.name,
		type: attachment.file.type || "application/octet-stream",
		// Object URLs stay valid for this page only, which is all a demo needs.
		file_path: URL.createObjectURL(attachment.file),
		permission: attachment.permission,
		size: `${Math.max(Math.round(attachment.file.size / 1024), 1)} KB`,
	}));

	const next: MockGrievanceEnvelope = {
		...current,
		information_collection_attachments: [...kept, ...added],
	};
	store[String(supplierKpiId)] = next;
	writeStore(store);
	return next;
};
