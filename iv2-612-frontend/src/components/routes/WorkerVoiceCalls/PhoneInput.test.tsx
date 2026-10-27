import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { DIAL_CODES, matchDialCodes, PhoneInput } from "./fields";

const PhoneInputHarness = () => {
	const [value, setValue] = useState("");

	return (
		<PhoneInput
			codeLabel="Country code"
			controlId="phone-number"
			noMatchesLabel="No matching country"
			onChange={setValue}
			searchPlaceholder="Search country or code"
			value={value}
		/>
	);
};

const openPicker = async (user: ReturnType<typeof userEvent.setup>) => {
	const trigger = screen.getByRole("button", { name: "Country code" });
	await user.click(trigger);
	return trigger;
};

describe("PhoneInput", () => {
	it("keeps the compact familiar default and offers the worldwide list", async () => {
		const user = userEvent.setup();
		render(<PhoneInputHarness />);

		const trigger = await openPicker(user);
		expect(trigger).toHaveTextContent("🇲🇲 +95");

		expect(screen.getAllByRole("option")).toHaveLength(DIAL_CODES.length);
		expect(screen.getByText("United Kingdom")).toBeInTheDocument();
		expect(screen.getByText("Cameroon")).toBeInTheDocument();
	});

	it("retains the chosen flag when countries share a calling code", async () => {
		const user = userEvent.setup();
		render(<PhoneInputHarness />);

		const trigger = await openPicker(user);
		await user.click(screen.getByText("Canada"));

		expect(trigger).toHaveTextContent("🇨🇦 +1");
	});

	it("narrows the list as the officer types a country name", async () => {
		const user = userEvent.setup();
		render(<PhoneInputHarness />);

		const trigger = await openPicker(user);
		await user.type(screen.getByRole("combobox"), "th");

		expect(screen.getByText("Thailand")).toBeInTheDocument();
		expect(screen.getAllByRole("option").length).toBeLessThan(
			DIAL_CODES.length,
		);

		await user.click(screen.getByText("Thailand"));
		expect(trigger).toHaveTextContent("🇹🇭 +66");
	});

	it("finds a country by its calling code too", async () => {
		const user = userEvent.setup();
		render(<PhoneInputHarness />);

		const trigger = await openPicker(user);
		await user.type(screen.getByRole("combobox"), "+66");

		expect(screen.getByText("Thailand")).toBeInTheDocument();

		await user.keyboard("{Enter}");
		expect(trigger).toHaveTextContent("🇹🇭 +66");
	});

	it("says so when nothing matches", async () => {
		const user = userEvent.setup();
		render(<PhoneInputHarness />);

		await openPicker(user);
		await user.type(screen.getByRole("combobox"), "zzzz");

		expect(screen.queryAllByRole("option")).toHaveLength(0);
		expect(screen.getByText("No matching country")).toBeInTheDocument();
	});
});

describe("matchDialCodes", () => {
	const names = (query: string) =>
		matchDialCodes(query).map((option) => option.label);

	it("returns the whole list for an empty query", () => {
		expect(matchDialCodes("  ")).toHaveLength(DIAL_CODES.length);
	});

	it("matches a country name anywhere in the word", () => {
		expect(names("thai")).toEqual(["Thailand"]);
		expect(names("kingdom")).toContain("United Kingdom");
	});

	it("matches the two-letter code as a prefix", () => {
		expect(names("kh")).toContain("Cambodia");
	});

	it("matches a calling code with or without the plus", () => {
		expect(names("+66")).toEqual(["Thailand"]);
		expect(names("66")).toEqual(names("+66"));
	});

	it("treats a calling code as a prefix, not a substring", () => {
		// "95" is Myanmar. Matching it as a substring would also drag in every
		// +295, +995 and the rest, which is the scrolling the search replaces.
		expect(names("95")).toEqual(["Myanmar (Burma)"]);
	});
});
