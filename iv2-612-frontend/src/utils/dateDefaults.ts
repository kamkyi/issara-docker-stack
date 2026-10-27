/**
 * Shared default date range for the dashboards: January 2018 (the start of
 * Issara's data, matching the landing page stats) through today.
 *
 * Before this existed each dashboard picked its own default — the internal
 * dashboard used a rolling last-12-months, the social responsibility overview
 * used 2020-01-01, and the Worker Voice tab fell back to calendar 2024 — so the
 * same filter bar showed a different range depending on where you landed.
 */
export const DEFAULT_FROM_DATE = "2018-01-01";

/** Today as `YYYY-MM-DD`, i.e. the "YTD" end of the default range. */
export const getDefaultToDate = () => new Date().toISOString().slice(0, 10);
