import { useViewModeStore } from "$src/store/viewModeStore";

/**
 * Whether the UI on screen is the CSO one, and lookups should therefore be
 * answered with the CSO row set.
 *
 * A real CSO login lands here through `viewModeStore`'s role default, and an
 * Issara Management or Tester account lands here by picking "CSO" in the Tester
 * Floating Button. That button changes view state only -- it never mints a CSO
 * token, and must not -- so the lookup endpoints cannot tell the second case
 * from an ordinary Management session on their own. Passing this flag as
 * `?cso_only=true` is how they are told, and it is why the tester sees the
 * dropdowns a CSO officer will actually see.
 *
 * Only the Worker Voice screens consult this. It is not an app-wide switch: a
 * query without CSO-specific rows gains nothing from it, and the Worker Voice
 * *case* endpoints deliberately ignore it -- those scope by the signed-in
 * user's real organization, which a view mode neither can nor should change.
 */
export const useCsoAudience = (): boolean =>
	useViewModeStore((state) => state.viewMode) === "cso-view";
