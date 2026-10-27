import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CascadeFloatingButton from "$src/components/button/testerFloatingButton";

// Mock MUI icons to avoid EMFILE (too many open files) from barrel imports
vi.mock("@mui/icons-material/Settings", () => ({
	default: () => <span data-testid="settings-icon" />,
}));
vi.mock("@mui/icons-material", () => ({
	SupervisorAccount: () => <span data-testid="supervisor-icon" />,
}));
// Mock TanStack Router
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => mockNavigate,
}));

// Mock auth store — useAuthData() is called without a selector, returns full state
const mockUseAuthData = vi.fn();
vi.mock("$src/store/store.auth", () => ({
	default: () => mockUseAuthData(),
}));

// Mock viewModeStore
const mockSetViewMode = vi.fn();
const mockResetToDefault = vi.fn();
vi.mock("../../store/viewModeStore", () => ({
	useViewModeStore: vi.fn(() => ({
		viewMode: "tester-view",
		setViewMode: mockSetViewMode,
		resetToDefault: mockResetToDefault,
	})),
}));

// motion is imported as `import * as motion from "motion/react-client"`
// so named exports (div, span, etc.) must match the namespace shape
vi.mock("motion/react-client", async () => {
	const React = await import("react");
	const make =
		(tag: string) =>
		({
			children,
			animate: _a,
			initial: _i,
			exit: _e,
			transition: _t,
			...rest
		}: Record<string, unknown> & { children?: React.ReactNode }) =>
			React.createElement(tag, rest, children);
	return {
		div: make("div"),
		span: make("span"),
		section: make("section"),
	};
});

const renderWithRole = (role: string | null) => {
	mockUseAuthData.mockReturnValue({ role });
	return render(<CascadeFloatingButton />);
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe("CascadeFloatingButton — visibility", () => {
	it("renders nothing for unprivileged roles", () => {
		const { container } = renderWithRole("org-supplier");
		expect(container.firstChild).toBeNull();
	});

	it("renders nothing when role is null", () => {
		const { container } = renderWithRole(null);
		expect(container.firstChild).toBeNull();
	});

	it("renders the gear icon for org-test-user", () => {
		renderWithRole("org-test-user");
		expect(screen.getByTestId("settings-icon")).toBeInTheDocument();
	});

	it("renders the gear icon for org-issara-management", () => {
		renderWithRole("org-issara-management");
		expect(screen.getByTestId("settings-icon")).toBeInTheDocument();
	});

	it("renders the gear icon for org-issara-staff", () => {
		renderWithRole("org-issara-staff");
		expect(screen.getByTestId("settings-icon")).toBeInTheDocument();
	});
});

describe("CascadeFloatingButton — gear toggle", () => {
	// Clicking the settings icon bubbles to the parent div's onClick handler
	const clickGear = async (user: ReturnType<typeof userEvent.setup>) => {
		await user.click(screen.getByTestId("settings-icon"));
	};

	it("does not show the settings panel initially", () => {
		renderWithRole("org-test-user");
		expect(screen.queryByText("Hello Tester! 👋")).toBeNull();
	});

	it("opens the settings panel when gear is clicked", async () => {
		const user = userEvent.setup();
		renderWithRole("org-test-user");
		await clickGear(user);
		expect(screen.getByText("Hello Tester! 👋")).toBeInTheDocument();
	});

	it("shows three role options (excluding Tester and Issara Management) when in tester-view", async () => {
		const user = userEvent.setup();
		renderWithRole("org-test-user");
		await clickGear(user);

		expect(screen.getByText("Buyer")).toBeInTheDocument();
		expect(screen.getByText("Supplier")).toBeInTheDocument();
		expect(screen.getByText("Recruitment Agency")).toBeInTheDocument();
		expect(screen.queryByText("Tester")).toBeNull();
		expect(screen.queryByText("Issara Management")).toBeNull();
	});

	it("closes the panel when gear is clicked again", async () => {
		const user = userEvent.setup();
		renderWithRole("org-test-user");
		await clickGear(user);
		expect(screen.getByText("Hello Tester! 👋")).toBeInTheDocument();
		await clickGear(user);
		expect(screen.queryByText("Hello Tester! 👋")).toBeNull();
	});
});

describe("CascadeFloatingButton — reset button", () => {
	it("shows a Reset to Default button in the panel", async () => {
		const user = userEvent.setup();
		renderWithRole("org-test-user");
		await user.click(screen.getByTestId("settings-icon"));

		expect(
			screen.getByRole("button", { name: /reset to default/i }),
		).toBeInTheDocument();
	});
});
