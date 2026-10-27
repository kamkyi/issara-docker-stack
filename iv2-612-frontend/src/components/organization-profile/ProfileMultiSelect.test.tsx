import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ComponentProps, useId, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import ProfileMultiSelect from "./ProfileMultiSelect";

const Subject = (
	props: Omit<ComponentProps<typeof ProfileMultiSelect>, "id">,
) => <ProfileMultiSelect id={useId()} {...props} />;

const StatefulSubject = ({
	options,
	initialValues,
}: {
	options: { value: string; label: string }[];
	initialValues: string[];
}) => {
	const [values, setValues] = useState(initialValues);
	return (
		<ProfileMultiSelect
			id={useId()}
			onChange={setValues}
			options={options}
			placeholder="Select"
			values={values}
		/>
	);
};

describe("ProfileMultiSelect", () => {
	it("removes exactly the clicked chip", () => {
		const onChange = vi.fn();
		render(
			<Subject
				onChange={onChange}
				options={[
					{ value: "a", label: "Alpha" },
					{ value: "b", label: "Beta" },
					{ value: "c", label: "Gamma" },
				]}
				placeholder="Select"
				values={["a", "b", "c"]}
			/>,
		);
		fireEvent.click(screen.getAllByLabelText("Remove selection")[1]);
		expect(onChange).toHaveBeenCalledWith(["a", "c"]);
	});

	it("clears all selections in one action", () => {
		const onChange = vi.fn();
		render(
			<Subject
				onChange={onChange}
				options={[
					{ value: "a", label: "Alpha" },
					{ value: "b", label: "Beta" },
				]}
				placeholder="Select"
				values={["a", "b"]}
			/>,
		);
		fireEvent.click(screen.getByLabelText("Clear all selections"));
		expect(onChange).toHaveBeenCalledWith([]);
	});

	it("makes the complete ISO-sized option list browsable", () => {
		const options = Array.from({ length: 184 }, (_, index) => ({
			value: String(index),
			label: `Language ${index}`,
		}));
		render(
			<Subject
				onChange={vi.fn()}
				options={options}
				placeholder="Select"
				values={[]}
			/>,
		);
		fireEvent.click(screen.getAllByRole("button", { name: "Select" })[0]);
		expect(screen.getByLabelText("Language 0")).not.toBeChecked();
		expect(screen.getByLabelText("Language 183")).not.toBeChecked();
	});

	it("deselects checked rows one at a time and then clears all", async () => {
		const user = userEvent.setup();
		render(
			<StatefulSubject
				initialValues={["a", "b", "c"]}
				options={[
					{ value: "a", label: "Alpha" },
					{ value: "b", label: "Beta" },
					{ value: "c", label: "Gamma" },
				]}
			/>,
		);

		await user.click(screen.getAllByRole("button", { name: "Select" })[0]);
		await user.click(screen.getByLabelText("Beta"));
		expect(screen.getByLabelText("Alpha")).toBeChecked();
		expect(screen.getByLabelText("Beta")).not.toBeChecked();
		expect(screen.getByLabelText("Gamma")).toBeChecked();
		expect(screen.getAllByLabelText("Remove selection")).toHaveLength(2);

		await user.click(screen.getByLabelText("Clear all selections"));
		expect(
			screen.queryByLabelText("Clear all selections"),
		).not.toBeInTheDocument();
		expect(screen.getByText("Select")).toBeInTheDocument();
	});

	it("search results contain only options matching the search text", async () => {
		const user = userEvent.setup();
		render(
			<StatefulSubject
				initialValues={["th"]}
				options={[
					{ value: "th", label: "Thailand" },
					{ value: "gb", label: "United Kingdom" },
					{ value: "us", label: "United States" },
				]}
			/>,
		);

		await user.click(screen.getAllByRole("button", { name: "Select" })[0]);
		await user.type(screen.getByPlaceholderText(/Search/), "United");

		expect(screen.getByLabelText("United Kingdom")).toBeVisible();
		expect(screen.getByLabelText("United States")).toBeVisible();
		expect(screen.queryByLabelText("Thailand")).not.toBeInTheDocument();
	});
});
