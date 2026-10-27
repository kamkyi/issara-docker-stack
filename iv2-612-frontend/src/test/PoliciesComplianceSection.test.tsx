import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PoliciesComplianceSection from "$src/components/company-profile/policies/PoliciesComplianceSection";
import type { Policy } from "$src/types/policies";

const policyHooks = vi.hoisted(() => ({
	policies: [] as Policy[],
	workplanFiles: [] as Array<{
		id: number;
		shared_file_id: number;
		category_slugs: string[];
		name: string;
		file_path: string;
		document_type: string;
		document_types: string[];
		document_type_display: string;
		document_name: string;
		description: string;
	}>,
	createPolicy: vi.fn(),
	updatePolicy: vi.fn(),
	deletePolicy: vi.fn(),
	createWorkplanFile: vi.fn(),
	updateWorkplanFile: vi.fn(),
	deleteWorkplanFile: vi.fn(),
}));

vi.mock("$src/hooks/useTranslation", () => ({
	useTranslation: () => ({
		t: (key: string) =>
			(
				({
					"common.cancel": "Cancel",
					"common.download": "Download",
					"common.edit": "Edit",
					"common.open": "Open",
					"common.save": "Save",
					"companyProfilePage.policies.addFirst": "Add the first policy",
					"companyProfilePage.policies.addFirstSwitchToEdit":
						"Switch to edit mode to add one",
					"companyProfilePage.policies.addPolicy": "Add policy",
					"companyProfilePage.policies.coverageHelp": "Coverage help",
					"companyProfilePage.policies.howAdding": "How are you adding this?",
					"companyProfilePage.policies.noPolicies": "No policies",
					"companyProfilePage.policies.noPoliciesShared": "No shared policies",
					"companyProfilePage.policies.policy": "Policy",
					"companyProfilePage.policies.policyName": "Policy name",
					"companyProfilePage.policies.policyText": "Policy text",
					"companyProfilePage.policies.savedPlural": "Saved",
					"companyProfilePage.policies.textStatement": "Text statement",
					"companyProfilePage.policies.tickAll": "Tick all that apply",
					"companyProfilePage.policies.type_file": "File",
					"companyProfilePage.policies.type_link": "Link",
					"companyProfilePage.policies.type_text": "Text",
					"companyProfilePage.policies.viewHelp": "View help",
					"companyProfilePage.policies.visibilityCustomers": "Customers",
					"companyProfilePage.policies.visibilityMembers": "Members",
					"companyProfilePage.policies.visibilityPrivate": "Private",
					"companyProfilePage.policies.whichCategories": "Which categories?",
					"companyProfilePage.tabs.policiesCompliance": "Policies & Compliance",
				}) as Record<string, string>
			)[key] ?? key,
	}),
}));

vi.mock("$src/hooks/usePolicies", () => ({
	usePoliciesByOwner: () => ({
		data: policyHooks.policies,
		isLoading: false,
	}),
	useStrategicPartnerWorkplanPolicyFiles: () => ({
		data: policyHooks.workplanFiles,
		isLoading: false,
	}),
	useCreatePolicy: () => ({
		isPending: false,
		mutateAsync: policyHooks.createPolicy,
	}),
	useUpdatePolicy: () => ({
		isPending: false,
		mutateAsync: policyHooks.updatePolicy,
	}),
	useDeletePolicy: () => ({
		isPending: false,
		mutateAsync: policyHooks.deletePolicy,
	}),
	useCreateWorkplanFile: () => ({
		isPending: false,
		mutateAsync: policyHooks.createWorkplanFile,
	}),
	useUpdateWorkplanFile: () => ({
		isPending: false,
		mutateAsync: policyHooks.updateWorkplanFile,
	}),
	useDeleteWorkplanFile: () => ({
		isPending: false,
		mutateAsync: policyHooks.deleteWorkplanFile,
	}),
}));

vi.mock("$src/queries/useLksgRiskSettings", () => ({
	useLksgRiskSettings: () => ({
		updateSettings: vi.fn(),
	}),
}));

const owner = { kind: "strategic-partner" as const, id: 7 };

const workplanFile = {
	id: 31,
	shared_file_id: 88,
	category_slugs: [],
	name: "supply-chain.pdf",
	file_path: "/media/other/shared/supply-chain.pdf",
	document_type: "human_rights",
	document_types: ["human_rights"],
	document_type_display: "Human Rights",
	document_name: "Supply Chain File",
	description: "",
};

describe("PoliciesComplianceSection", () => {
	beforeEach(() => {
		policyHooks.policies = [];
		policyHooks.workplanFiles = [];
		policyHooks.createPolicy.mockReset();
		policyHooks.updatePolicy.mockReset();
		policyHooks.deletePolicy.mockReset();
		policyHooks.createWorkplanFile.mockReset();
		policyHooks.updateWorkplanFile.mockReset();
		policyHooks.deleteWorkplanFile.mockReset();
	});

	it("does not render a Work Plan file preview when a saved policy points at the same file name", () => {
		policyHooks.policies = [
			{
				id: 12,
				title: "Supply Chain File",
				type: "file",
				text_value: null,
				link_url: null,
				audience: "members",
				category_slugs: ["human-rights"],
				file_id: null,
				source_shared_file_id: null,
				is_source_hidden: false,
				file_url: null,
				file_name: "supply-chain.pdf",
				created_at: "",
				updated_at: "",
			},
		];
		policyHooks.workplanFiles = [workplanFile];

		render(<PoliciesComplianceSection owner={owner} />);

		expect(screen.getAllByText("Supply Chain File")).toHaveLength(1);
	});

	it("does not render a Work Plan preview when a saved policy points at the same shared file id", () => {
		policyHooks.policies = [
			{
				id: 12,
				title: "Supply Chain File",
				type: "file",
				text_value: null,
				link_url: null,
				audience: "members",
				category_slugs: ["human-rights"],
				file_id: null,
				source_shared_file_id: 88,
				is_source_hidden: false,
				file_url: null,
				file_name: null,
				created_at: "",
				updated_at: "",
			},
		];
		policyHooks.workplanFiles = [workplanFile];

		render(<PoliciesComplianceSection owner={owner} />);

		expect(screen.getAllByText("Supply Chain File")).toHaveLength(1);
	});

	it("renders Work Plan files in the edit form with editable source types", async () => {
		const user = userEvent.setup();
		policyHooks.workplanFiles = [workplanFile];

		render(<PoliciesComplianceSection owner={owner} />);

		expect(screen.getByText("Supply Chain File")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /edit/i }));

		expect(screen.getByDisplayValue("Supply Chain File")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "File" })).toBeEnabled();
		expect(screen.getByRole("button", { name: "Link" })).toBeEnabled();
		expect(screen.getByRole("button", { name: "Text" })).toBeEnabled();
		expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
		expect(policyHooks.createPolicy).not.toHaveBeenCalled();
		expect(policyHooks.updatePolicy).not.toHaveBeenCalled();
		expect(policyHooks.deletePolicy).not.toHaveBeenCalled();
	});

	it("updates Work Plan file categories through the Work Plan API only", async () => {
		const user = userEvent.setup();
		policyHooks.workplanFiles = [workplanFile];
		policyHooks.updateWorkplanFile.mockResolvedValue(workplanFile);

		render(<PoliciesComplianceSection owner={owner} />);

		await user.click(screen.getByRole("button", { name: /edit/i }));
		await user.click(screen.getByRole("button", { name: /forced labor/i }));
		await user.click(screen.getByRole("button", { name: /save/i }));

		await waitFor(() => {
			expect(policyHooks.updateWorkplanFile).toHaveBeenCalledWith(
				expect.objectContaining({
					fileId: 31,
					payload: expect.objectContaining({
						document_name: "Supply Chain File",
						category_slugs: ["forced-labor"],
					}),
				}),
			);
		});
		expect(policyHooks.createPolicy).not.toHaveBeenCalled();
		expect(policyHooks.updatePolicy).not.toHaveBeenCalled();
	});

	it("allows all Work Plan file categories to be cleared and saved", async () => {
		const user = userEvent.setup();
		policyHooks.workplanFiles = [
			{
				...workplanFile,
				category_slugs: ["human-rights"],
			},
		];
		policyHooks.updateWorkplanFile.mockResolvedValue({
			...workplanFile,
			category_slugs: [],
		});

		render(<PoliciesComplianceSection owner={owner} />);

		await user.click(screen.getByRole("button", { name: /edit/i }));
		await user.click(screen.getByRole("button", { name: /human rights/i }));
		expect(screen.getByText("Categories optional")).toHaveClass(
			"text-gray-500",
		);
		await user.click(screen.getByRole("button", { name: /save/i }));

		await waitFor(() => {
			expect(policyHooks.updateWorkplanFile).toHaveBeenCalledWith(
				expect.objectContaining({
					fileId: 31,
					payload: expect.objectContaining({
						category_slugs: [],
					}),
				}),
			);
		});
		expect(policyHooks.createPolicy).not.toHaveBeenCalled();
		expect(policyHooks.deleteWorkplanFile).not.toHaveBeenCalled();
	});

	it("saves a Work Plan file switched to Link as a Policy without deleting the Work Plan file", async () => {
		const user = userEvent.setup();
		policyHooks.workplanFiles = [workplanFile];
		policyHooks.createPolicy.mockResolvedValue({
			id: 72,
			title: "Supply Chain File",
			type: "link",
			text_value: null,
			link_url: "https://example.com/policy",
			audience: "members",
			category_slugs: ["human-rights"],
			file_id: null,
			source_shared_file_id: 88,
			is_source_hidden: false,
			file_url: null,
			file_name: null,
			created_at: "",
			updated_at: "",
		});

		render(<PoliciesComplianceSection owner={owner} />);

		await user.click(screen.getByRole("button", { name: /edit/i }));
		await user.click(screen.getByRole("button", { name: "Link" }));
		await user.type(
			screen.getByPlaceholderText("https://…"),
			"https://example.com/policy",
		);
		await user.click(screen.getByRole("button", { name: /save/i }));

		await waitFor(() => {
			expect(policyHooks.createPolicy).toHaveBeenCalledWith(
				expect.objectContaining({
					title: "Supply Chain File",
					type: "link",
					link_url: "https://example.com/policy",
					category_slugs: [],
					source_shared_file_id: 88,
				}),
			);
		});
		expect(policyHooks.updateWorkplanFile).not.toHaveBeenCalled();
		expect(policyHooks.deleteWorkplanFile).not.toHaveBeenCalled();
		expect(policyHooks.deletePolicy).not.toHaveBeenCalled();
	});

	it("saves a Work Plan file switched to Text as a Policy without requiring categories", async () => {
		const user = userEvent.setup();
		policyHooks.workplanFiles = [workplanFile];
		policyHooks.createPolicy.mockResolvedValue({
			id: 73,
			title: "Supply Chain File",
			type: "text",
			text_value: "Policy body",
			link_url: null,
			audience: "members",
			category_slugs: [],
			file_id: null,
			source_shared_file_id: 88,
			is_source_hidden: false,
			file_url: null,
			file_name: null,
			created_at: "",
			updated_at: "",
		});

		render(<PoliciesComplianceSection owner={owner} />);

		await user.click(screen.getByRole("button", { name: /edit/i }));
		await user.click(screen.getByRole("button", { name: "Text" }));
		await user.type(
			screen.getByPlaceholderText(/paste or summarise/i),
			"Policy body",
		);
		expect(screen.getByText("Categories optional")).toHaveClass(
			"text-gray-500",
		);
		expect(screen.getByRole("button", { name: /save/i })).toBeEnabled();
		await user.click(screen.getByRole("button", { name: /save/i }));

		await waitFor(() => {
			expect(policyHooks.createPolicy).toHaveBeenCalledWith(
				expect.objectContaining({
					title: "Supply Chain File",
					type: "text",
					text_value: "Policy body",
					category_slugs: [],
					source_shared_file_id: 88,
				}),
			);
		});
		expect(policyHooks.updateWorkplanFile).not.toHaveBeenCalled();
		expect(policyHooks.deleteWorkplanFile).not.toHaveBeenCalled();
	});

	it("does not block saving for existing saved Policy rows with missing categories", async () => {
		const user = userEvent.setup();
		policyHooks.policies = [
			{
				id: 81,
				title: "Policy without category",
				type: "text",
				text_value: "Policy body",
				link_url: null,
				audience: "members",
				category_slugs: [],
				file_id: null,
				source_shared_file_id: null,
				is_source_hidden: false,
				file_url: null,
				file_name: null,
				created_at: "",
				updated_at: "",
			},
		];

		render(<PoliciesComplianceSection owner={owner} />);

		await user.click(screen.getByRole("button", { name: /edit/i }));

		const titleInput = screen.getByDisplayValue("Policy without category");
		await user.type(titleInput, " modified");

		expect(screen.getByText("Categories optional")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /save/i })).not.toBeDisabled();
	});

	it("creates a new Policy independently when a Work Plan row is visible", async () => {
		const user = userEvent.setup();
		policyHooks.workplanFiles = [workplanFile];
		policyHooks.createPolicy.mockResolvedValue({
			id: 46,
			title: "New text policy",
			type: "text",
			text_value: "Policy body",
			link_url: null,
			audience: "members",
			category_slugs: ["human-rights"],
			file_id: null,
			source_shared_file_id: null,
			is_source_hidden: false,
			file_url: null,
			file_name: null,
			created_at: "",
			updated_at: "",
		});

		render(<PoliciesComplianceSection owner={owner} />);

		await user.click(screen.getByRole("button", { name: /edit/i }));
		await user.click(screen.getByRole("button", { name: /add policy/i }));
		const policyNameInputs = screen.getAllByPlaceholderText(
			/global code of conduct/i,
		);
		await user.type(
			policyNameInputs[policyNameInputs.length - 1],
			"New text policy",
		);
		await user.type(
			screen.getByPlaceholderText(/paste or summarise/i),
			"Policy body",
		);
		const humanRightsButtons = screen.getAllByRole("button", {
			name: /human rights/i,
		});
		await user.click(humanRightsButtons[humanRightsButtons.length - 1]);
		await user.click(screen.getByRole("button", { name: /save/i }));

		await waitFor(() => {
			expect(policyHooks.createPolicy).toHaveBeenCalledWith(
				expect.objectContaining({
					title: "New text policy",
					type: "text",
					text_value: "Policy body",
					category_slugs: ["human-rights"],
				}),
			);
		});
		const payload = policyHooks.createPolicy.mock.calls[0][0];
		expect(payload.shared_file_id).toBeUndefined();
		expect(payload.source_shared_file_id).toBeUndefined();
		expect(payload.hide_source).toBeUndefined();
		expect(policyHooks.updateWorkplanFile).not.toHaveBeenCalled();
	});

	it("replaces a file on an existing Policy without writing Work Plan fields", async () => {
		const user = userEvent.setup();
		policyHooks.policies = [
			{
				id: 51,
				title: "Existing file policy",
				type: "file",
				text_value: null,
				link_url: null,
				audience: "members",
				category_slugs: ["human-rights"],
				file_id: 100,
				source_shared_file_id: null,
				is_source_hidden: false,
				file_url: "/media/other/shared/old-file.pdf",
				file_name: "old-file.pdf",
				created_at: "",
				updated_at: "",
			},
		];
		policyHooks.updatePolicy.mockResolvedValue(policyHooks.policies[0]);

		const { container } = render(<PoliciesComplianceSection owner={owner} />);

		await user.click(screen.getByRole("button", { name: /edit/i }));
		await user.click(screen.getByRole("button", { name: /remove file/i }));
		const fileInput =
			container.querySelector<HTMLInputElement>('input[type="file"]');
		expect(fileInput).toBeInTheDocument();

		const replacement = new File(["replacement"], "replacement.docx", {
			type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		});
		await user.upload(fileInput as HTMLInputElement, replacement);
		await user.click(screen.getByRole("button", { name: /save/i }));

		await waitFor(() => {
			expect(policyHooks.updatePolicy).toHaveBeenCalledWith(
				expect.objectContaining({ policyId: 51 }),
			);
		});
		const payload = policyHooks.updatePolicy.mock.calls[0][0].payload;
		expect(payload.file).toBe(replacement);
		expect(payload.shared_file_id).toBeUndefined();
		expect(payload.source_shared_file_id).toBeUndefined();
	});

	it("deletes Work Plan files through the Work Plan API", async () => {
		const user = userEvent.setup();
		policyHooks.workplanFiles = [workplanFile];

		render(<PoliciesComplianceSection owner={owner} />);

		await user.click(screen.getByRole("button", { name: /edit/i }));
		await user.click(screen.getByRole("button", { name: /^remove$/i }));
		await user.click(screen.getByRole("button", { name: /save/i }));

		await waitFor(() => {
			expect(policyHooks.deleteWorkplanFile).toHaveBeenCalledWith(31);
		});
		expect(policyHooks.createPolicy).not.toHaveBeenCalled();
		expect(policyHooks.updatePolicy).not.toHaveBeenCalled();
		expect(policyHooks.deletePolicy).not.toHaveBeenCalled();
	});
});
