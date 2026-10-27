import { describe, expect, it } from "vitest";
import { Route } from "$src/routes/worker-voice-calls_.cases_.bulk-update";

/**
 * The router serialises search to the URL and re-validates what comes back. A
 * key present in the object but absent from the URL never compares equal, so
 * the router navigates again, and again -- a loop that crashes the tab rather
 * than throwing. `org` must therefore be omitted, never set to `undefined`.
 */
describe("bulk update search validation", () => {
	const validate = Route.options.validateSearch as (
		search: Record<string, unknown>,
	) => Record<string, unknown>;

	it("omits org entirely when it is absent", () => {
		const result = validate({ ids: "51,52" });
		expect(result).toEqual({ ids: "51,52" });
		expect("org" in result).toBe(false);
	});

	it("keeps org when one is supplied", () => {
		expect(validate({ ids: "51", org: "7" })).toEqual({ ids: "51", org: 7 });
	});

	it("round-trips to an identical object, so a navigation settles", () => {
		const once = validate({ ids: "51", org: "7" });
		expect(validate(once)).toEqual(once);
		const empty = validate({});
		expect(validate(empty)).toEqual(empty);
	});

	it("falls back to an empty selection rather than a bad type", () => {
		expect(validate({ ids: 51 })).toEqual({ ids: "" });
	});
});
