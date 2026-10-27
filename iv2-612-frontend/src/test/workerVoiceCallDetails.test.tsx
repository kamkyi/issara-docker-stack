import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkerVoiceCallDetails from "$src/components/routes/WorkerVoiceCalls/WorkerVoiceCallDetails";
import type { WorkerVoiceCaseRecord } from "$src/services/workerVoiceCaseService";

const caseResult = {
	data: undefined as WorkerVoiceCaseRecord | undefined,
	isLoading: false,
	isError: false,
};

vi.mock("$src/queries/workerVoiceCalls", () => ({
	useWorkerVoiceCase: () => caseResult,
}));

/** Only the fields the panel reads; the rest of the record is left blank. */
const record = (
	overrides: Partial<WorkerVoiceCaseRecord> = {},
): WorkerVoiceCaseRecord =>
	({
		id: 14,
		created: "2026-09-01",
		interacted: "2026-09-01",
		client_share_info_consent: "Yes",
		consent_to_discuss_with_employer_anonymously: null,
		worker_identification_risk_level: null,
		case_status_name: "Open",
		referral_action_name: null,
		refer_to_org_name: null,
		organization_name: "Partner CSO",
		shared_with_my_organization: false,
		attachments: [],
		kpi_details: [],
		kpis: [],
		...overrides,
	}) as unknown as WorkerVoiceCaseRecord;

const open = () => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
		<QueryClientProvider client={queryClient}>
			<Theme>{children}</Theme>
		</QueryClientProvider>
	);
	return render(<WorkerVoiceCallDetails callId={14} onClose={vi.fn()} />, {
		wrapper: Wrapper,
	});
};

describe("WorkerVoiceCallDetails", () => {
	beforeEach(() => {
		caseResult.data = record();
	});

	it("reads back the two risks the form now collects", () => {
		caseResult.data = record({
			worker_identification_risk_level: "FORCED_LABOR",
		});
		open();

		// Once under its own label in Support & Actions, once as a header badge.
		expect(screen.getAllByText("Forced labor risk").length).toBeGreaterThan(0);
		expect(screen.getByText("Worker identification risk")).toBeInTheDocument();
	});

	it("names an early warning risk rather than showing the stored code", () => {
		caseResult.data = record({
			worker_identification_risk_level: "EARLY_WARNING",
		});
		open();

		expect(screen.getAllByText("Early warning risk").length).toBeGreaterThan(0);
		expect(screen.queryByText("EARLY_WARNING")).not.toBeInTheDocument();
	});

	it("still reads back a call saved on the old scale", () => {
		// ILM-fronted writes these, and referred-in calls carry them, so the
		// panel cannot render only what step 5 offers.
		caseResult.data = record({ worker_identification_risk_level: "HIGH" });
		open();

		expect(screen.getAllByText("High risk").length).toBeGreaterThan(0);
	});

	it("leaves the row out when no risk was recorded", () => {
		open();

		expect(
			screen.queryByText("Worker identification risk"),
		).not.toBeInTheDocument();
	});
});
