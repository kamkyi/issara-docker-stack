import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "$src/api/axios";
import policiesMock from "$src/assets/mock/policies.json";
import type {
	Policy,
	PolicyAudience,
	PolicyCategorySlug,
	PolicyOwner,
	PolicyOwnerKind,
	PolicyType,
	PolicyWritePayload,
} from "$src/types/policies";
import { POLICY_CATEGORY_SLUGS } from "$src/types/policies";
import { useMockData } from "$src/utils/config";
import { resolveAssetUrl } from "$src/utils/memberDirectory";
import { shouldUsePolicyMock } from "$src/utils/policies";

const ILM_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const POLICY_TYPES = new Set<PolicyType>(["text", "link", "file"]);
const POLICY_AUDIENCES = new Set<PolicyAudience>([
	"customers",
	"members",
	"private",
]);
const POLICY_CATEGORY_SLUG_SET = new Set<PolicyCategorySlug>(
	POLICY_CATEGORY_SLUGS,
);

const ownerSegment = (kind: PolicyOwnerKind): string =>
	kind === "strategic-partner" ? "strategic-partners" : "suppliers";

const policiesUrl = (owner: PolicyOwner): string =>
	`${ILM_API_BASE_URL}/cascade/${ownerSegment(owner.kind)}/${owner.id}/policies/`;

const policyDetailUrl = (owner: PolicyOwner, policyId: number): string =>
	`${policiesUrl(owner)}${policyId}/`;

const policyQueryKey = (owner: PolicyOwner, mocked: boolean) => [
	"policies",
	owner.kind,
	owner.id,
	mocked ? "mock" : "live",
];

interface UsePoliciesByOwnerOptions {
	mockMode?: "auto" | "never";
}

export interface StrategicPartnerWorkplanPolicyFile {
	/** WorkplanDocs.id - use this for CRUD if a Work Plan doc is edited directly. */
	id: number;
	/** SharedFile.id - use this as source_shared_file_id when creating a policy. */
	shared_file_id: number;
	category_slugs: PolicyCategorySlug[];
	name: string;
	file_path: string;
	document_type: string;
	document_types: string[];
	document_type_display: string;
	document_name: string;
	description: string;
	audience: PolicyAudience;
}

export interface WorkplanFileCreatePayload {
	document_type: string;
	document_name?: string;
	category_slugs?: PolicyCategorySlug[];
	audience?: PolicyAudience;
	file?: File;
	shared_file_id?: number;
}

export interface WorkplanFileUpdatePayload {
	document_type?: string;
	document_name?: string;
	category_slugs?: PolicyCategorySlug[];
	audience?: PolicyAudience;
	file?: File | null;
	shared_file_id?: number | null;
}

const asRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string =>
	typeof value === "string" ? value : "";

const asNullableString = (value: unknown): string | null =>
	typeof value === "string" && value.trim() !== "" ? value : null;

const asNullableNumber = (value: unknown): number | null => {
	if (value == null || value === "") return null;
	const numberValue = Number(value);
	return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
};

const normalizePolicyType = (value: unknown): PolicyType =>
	typeof value === "string" && POLICY_TYPES.has(value as PolicyType)
		? (value as PolicyType)
		: "text";

const normalizePolicyAudience = (value: unknown): PolicyAudience =>
	typeof value === "string" && POLICY_AUDIENCES.has(value as PolicyAudience)
		? (value as PolicyAudience)
		: "members";

const normalizeCategorySlugs = (value: unknown): PolicyCategorySlug[] => {
	const parsedValue =
		typeof value === "string"
			? (() => {
					try {
						return JSON.parse(value);
					} catch {
						return [];
					}
				})()
			: value;

	if (!Array.isArray(parsedValue)) return [];

	return parsedValue.filter(
		(slug): slug is PolicyCategorySlug =>
			typeof slug === "string" &&
			POLICY_CATEGORY_SLUG_SET.has(slug as PolicyCategorySlug),
	);
};

const normalizePolicy = (value: unknown): Policy => {
	const record = asRecord(value);
	const id = Number(record.id);
	const type = normalizePolicyType(record.type);

	return {
		id: Number.isFinite(id) ? id : 0,
		title: asString(record.title),
		type,
		text_value: type === "text" ? asNullableString(record.text_value) : null,
		link_url: type === "link" ? asNullableString(record.link_url) : null,
		audience: normalizePolicyAudience(record.audience),
		category_slugs: normalizeCategorySlugs(record.category_slugs),
		file_id: type === "file" ? asNullableNumber(record.file_id) : null,
		source_shared_file_id: asNullableNumber(record.source_shared_file_id),
		is_source_hidden: record.is_source_hidden === true,
		file_url: type === "file" ? asNullableString(record.file_url) : null,
		file_name: type === "file" ? asNullableString(record.file_name) : null,
		created_at: asString(record.created_at),
		updated_at: asString(record.updated_at),
	};
};

const toFormData = (payload: PolicyWritePayload): FormData => {
	const fd = new FormData();
	fd.append("title", payload.title);
	fd.append("type", payload.type);
	fd.append("audience", payload.audience);
	fd.append("category_slugs", JSON.stringify(payload.category_slugs));
	if (payload.text_value != null) fd.append("text_value", payload.text_value);
	if (payload.link_url != null) fd.append("link_url", payload.link_url);
	if (payload.file instanceof File) fd.append("file", payload.file);
	if (payload.shared_file_id != null) {
		fd.append("shared_file_id", String(payload.shared_file_id));
	}
	if (payload.source_shared_file_id != null) {
		fd.append("source_shared_file_id", String(payload.source_shared_file_id));
	}
	if (payload.hide_source != null) {
		fd.append("hide_source", String(payload.hide_source));
	}
	return fd;
};

const nowIso = () => new Date().toISOString();

const mockPayloadToPolicy = (
	id: number,
	payload: PolicyWritePayload,
	prev?: Policy,
): Policy => ({
	id,
	title: payload.title,
	type: payload.type,
	text_value: payload.type === "text" ? (payload.text_value ?? null) : null,
	link_url: payload.type === "link" ? (payload.link_url ?? null) : null,
	audience: payload.audience,
	category_slugs: payload.category_slugs,
	file_id:
		payload.type === "file"
			? payload.file
				? (prev?.file_id ?? null)
				: (payload.shared_file_id ?? prev?.file_id ?? null)
			: null,
	source_shared_file_id:
		payload.source_shared_file_id ??
		payload.shared_file_id ??
		prev?.source_shared_file_id ??
		null,
	is_source_hidden: payload.hide_source ?? prev?.is_source_hidden ?? false,
	file_url:
		payload.type === "file"
			? payload.file
				? URL.createObjectURL(payload.file)
				: (prev?.file_url ?? null)
			: null,
	file_name:
		payload.type === "file"
			? payload.file
				? payload.file.name
				: (prev?.file_name ?? null)
			: null,
	created_at: prev?.created_at ?? nowIso(),
	updated_at: nowIso(),
});

let _mockId = 9000;
const nextMockId = () => {
	_mockId += 1;
	return _mockId;
};

const workplanFilesUrl = (spId: number) =>
	`${ILM_API_BASE_URL}/cascade/strategic-partners/${spId}/workplan-files/`;

const workplanFileDetailUrl = (spId: number, fileId: number) =>
	`${workplanFilesUrl(spId)}${fileId}/`;

const workplanFilesQueryKey = (spId: number | null) => [
	"strategic-partner-workplan-policy-files",
	spId,
];

const workplanFileToFormData = (
	payload: WorkplanFileCreatePayload | WorkplanFileUpdatePayload,
): FormData => {
	const fd = new FormData();
	if (payload.document_type != null)
		fd.append("document_type", payload.document_type);
	if (payload.document_name != null) {
		fd.append("document_name", payload.document_name);
	}
	if (payload.category_slugs != null) {
		fd.append("category_slugs", JSON.stringify(payload.category_slugs));
	}
	if (payload.audience != null) fd.append("audience", payload.audience);
	if (payload.file instanceof File) fd.append("file", payload.file);
	if (payload.shared_file_id != null) {
		fd.append("shared_file_id", String(payload.shared_file_id));
	}
	return fd;
};

const normalizeWorkplanFile = (
	value: unknown,
): StrategicPartnerWorkplanPolicyFile | null => {
	const record = asRecord(value);
	const id = asNullableNumber(record.id);
	if (!id) return null;

	// The cascade endpoint returns shared_file_id explicitly. Older payloads
	// used id as the SharedFile id, so keep that as a defensive fallback.
	const sharedFileId = asNullableNumber(record.shared_file_id) ?? id;

	return {
		id,
		shared_file_id: sharedFileId,
		category_slugs: normalizeCategorySlugs(record.category_slugs),
		name: asString(record.name),
		file_path: resolveAssetUrl(asString(record.file_path)),
		document_type: asString(record.document_type),
		document_types: [asString(record.document_type)].filter(Boolean),
		document_type_display: asString(record.document_type_display),
		document_name: asString(record.document_name),
		description: asString(record.description),
		audience: normalizePolicyAudience(record.audience),
	};
};

export const useStrategicPartnerWorkplanPolicyFiles = (
	strategicPartnerId: number | null,
) => {
	const useMock = useMockData();
	return useQuery<StrategicPartnerWorkplanPolicyFile[]>({
		queryKey: workplanFilesQueryKey(strategicPartnerId),
		queryFn: async () => {
			if (useMock || !strategicPartnerId) return [];
			const response = await api.get(workplanFilesUrl(strategicPartnerId));
			const data = response.data;
			const results = Array.isArray(data) ? data : (data?.results ?? []);
			return (results as unknown[])
				.map(normalizeWorkplanFile)
				.filter((f): f is StrategicPartnerWorkplanPolicyFile => f !== null);
		},
		enabled: !useMock && Boolean(strategicPartnerId),
		staleTime: 30_000, // 30 seconds
	});
};

export const useCreateWorkplanFile = (spId: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (payload: WorkplanFileCreatePayload) => {
			const response = await api.post(
				workplanFilesUrl(spId),
				workplanFileToFormData(payload),
				{
					headers: { "Content-Type": "multipart/form-data" },
				},
			);
			return normalizeWorkplanFile(response.data);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: workplanFilesQueryKey(spId),
			});
		},
	});
};

export const useUpdateWorkplanFile = (spId: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			fileId,
			payload,
		}: {
			fileId: number;
			payload: WorkplanFileUpdatePayload;
		}) => {
			const response = await api.patch(
				workplanFileDetailUrl(spId, fileId),
				workplanFileToFormData(payload),
				{
					headers: { "Content-Type": "multipart/form-data" },
				},
			);
			return normalizeWorkplanFile(response.data);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: workplanFilesQueryKey(spId),
			});
		},
	});
};

export const useDeleteWorkplanFile = (spId: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (fileId: number) => {
			await api.delete(workplanFileDetailUrl(spId, fileId));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: workplanFilesQueryKey(spId),
			});
		},
	});
};

export const usePoliciesByOwner = (
	owner: PolicyOwner,
	options?: UsePoliciesByOwnerOptions,
) => {
	const autoMocked = useMockData();
	const mocked = shouldUsePolicyMock(owner, autoMocked, options);
	return useQuery<Policy[]>({
		queryKey: policyQueryKey(owner, mocked),
		queryFn: async () => {
			if (mocked) return (policiesMock as unknown[]).map(normalizePolicy);
			const response = await api.get(policiesUrl(owner));
			const data = response.data;
			const results = Array.isArray(data) ? data : (data?.results ?? []);
			return Array.isArray(results) ? results.map(normalizePolicy) : [];
		},
		enabled: mocked || (owner.id != null && owner.id > 0),
		staleTime: 30_000, // 30 seconds
	});
};

export const useCreatePolicy = (owner: PolicyOwner) => {
	const mocked = shouldUsePolicyMock(owner, useMockData());
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (payload: PolicyWritePayload) => {
			if (mocked) {
				const created = mockPayloadToPolicy(nextMockId(), payload);
				const key = policyQueryKey(owner, true);
				queryClient.setQueryData<Policy[]>(key, (prev) =>
					prev ? [...prev, created] : [created],
				);
				return created;
			}
			const response = await api.post(policiesUrl(owner), toFormData(payload), {
				headers: { "Content-Type": "multipart/form-data" },
			});
			return normalizePolicy(response.data);
		},
		onSuccess: (policy) => {
			if (!mocked) {
				queryClient.setQueryData<Policy[]>(
					policyQueryKey(owner, false),
					(list) => {
						const existing = list ?? [];
						if (policy.is_source_hidden) return existing;
						if (existing.some((item) => item.id === policy.id)) return existing;
						return [policy, ...existing];
					},
				);
				queryClient.invalidateQueries({
					queryKey: policyQueryKey(owner, false),
				});
			}
		},
	});
};

export const useUpdatePolicy = (owner: PolicyOwner) => {
	const mocked = shouldUsePolicyMock(owner, useMockData());
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			policyId,
			payload,
		}: {
			policyId: number;
			payload: PolicyWritePayload;
		}) => {
			if (mocked) {
				const key = policyQueryKey(owner, true);
				const prev = (queryClient.getQueryData<Policy[]>(key) ?? []).find(
					(p) => p.id === policyId,
				);
				const updated = mockPayloadToPolicy(policyId, payload, prev);
				queryClient.setQueryData<Policy[]>(key, (list) =>
					(list ?? []).map((p) => (p.id === policyId ? updated : p)),
				);
				return updated;
			}
			const response = await api.patch(
				policyDetailUrl(owner, policyId),
				toFormData(payload),
				{ headers: { "Content-Type": "multipart/form-data" } },
			);
			return normalizePolicy(response.data);
		},
		onSuccess: (policy) => {
			if (!mocked) {
				queryClient.setQueryData<Policy[]>(
					policyQueryKey(owner, false),
					(list) =>
						(list ?? []).map((item) => (item.id === policy.id ? policy : item)),
				);
				queryClient.invalidateQueries({
					queryKey: policyQueryKey(owner, false),
				});
			}
		},
	});
};

export const useDeletePolicy = (owner: PolicyOwner) => {
	const mocked = shouldUsePolicyMock(owner, useMockData());
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (policyId: number) => {
			if (mocked) {
				const key = policyQueryKey(owner, true);
				queryClient.setQueryData<Policy[]>(key, (list) =>
					(list ?? []).filter((p) => p.id !== policyId),
				);
				return;
			}
			await api.delete(policyDetailUrl(owner, policyId));
		},
		onSuccess: () => {
			if (!mocked) {
				queryClient.invalidateQueries({
					queryKey: policyQueryKey(owner, false),
				});
			}
		},
	});
};
