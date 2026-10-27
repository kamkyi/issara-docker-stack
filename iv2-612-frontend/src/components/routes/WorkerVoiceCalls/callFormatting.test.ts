import { describe, expect, it } from "vitest";
import type { RiskLevel } from "$src/services/workerVoiceCaseService";
import { isForcedLaborRisk } from "$src/utils/workerReportedKpiTable";
import {
	EMPTY_VALUE,
	formatCallDate,
	KPI_RISK_COLORS,
	KPI_RISK_LABEL_KEYS,
	kpiRiskLevel,
	orEmpty,
	RISK_COLORS,
	RISK_LABEL_KEYS,
} from "./callFormatting";

describe("formatCallDate", () => {
	it("renders the day the officer recorded, not the UTC one", () => {
		// `new Date("2026-08-28")` is UTC midnight, which is 27 August for
		// anyone west of UTC -- the table must not shift a call by a day.
		expect(formatCallDate("2026-08-28", "en-US")).toBe("Aug 28, 2026");
	});

	it("reads the date out of a full timestamp", () => {
		expect(formatCallDate("2026-08-28T22:30:00Z", "en-US")).toBe(
			"Aug 28, 2026",
		);
	});

	it("shows the placeholder when no date was recorded", () => {
		expect(formatCallDate(null, "en-US")).toBe(EMPTY_VALUE);
		expect(formatCallDate("", "en-US")).toBe(EMPTY_VALUE);
	});

	it("passes through a value it cannot parse rather than blanking it", () => {
		expect(formatCallDate("last Tuesday", "en-US")).toBe("last Tuesday");
	});
});

describe("orEmpty", () => {
	it("keeps a real value", () => {
		expect(orEmpty("Nepali")).toBe("Nepali");
	});

	it("keeps zero, which is a real answer to 'workers affected'", () => {
		expect(orEmpty(0)).toBe("0");
	});

	it("replaces blank, whitespace and missing values", () => {
		expect(orEmpty(null)).toBe(EMPTY_VALUE);
		expect(orEmpty(undefined)).toBe(EMPTY_VALUE);
		expect(orEmpty("")).toBe(EMPTY_VALUE);
		expect(orEmpty("   ")).toBe(EMPTY_VALUE);
	});
});

describe("risk levels", () => {
	// The two forms write into one column: the Worker Voice form saves the two
	// named risks, ILM-fronted's bar saves the Low/Medium/High scale. The table
	// and the detail panel render whichever turns up, so every value needs a
	// colour and a label -- a gap would render an uncoloured, untranslated badge.
	const ALL_RISK_LEVELS: RiskLevel[] = [
		"LOW",
		"MEDIUM",
		"HIGH",
		"EARLY_WARNING",
		"FORCED_LABOR",
	];

	it("colours every value the column can hold", () => {
		for (const level of ALL_RISK_LEVELS) {
			expect(RISK_COLORS[level]).toBeTruthy();
		}
	});

	it("names every value the column can hold", () => {
		for (const level of ALL_RISK_LEVELS) {
			expect(RISK_LABEL_KEYS[level]).toMatch(
				/^workerVoiceForm\.options\.risk\./,
			);
		}
	});

	it("keeps the legacy scale readable after the form stopped offering it", () => {
		expect(RISK_LABEL_KEYS.HIGH).toBe("workerVoiceForm.options.risk.high");
		expect(RISK_COLORS.HIGH).toBe("red");
	});

	it("reads forced labor as the severe risk and early warning as the softer one", () => {
		expect(RISK_COLORS.FORCED_LABOR).toBe("red");
		expect(RISK_COLORS.EARLY_WARNING).toBe("amber");
	});
});

describe("kpiRiskLevel", () => {
	it("reads Levels 3 and 4 as the forced-labor risk", () => {
		// The same split the supplier tables draw (`isForcedLaborRisk`), so the
		// two screens never disagree about what a Level 3 KPI means.
		expect(kpiRiskLevel([3])).toBe("FORCED_LABOR");
		expect(kpiRiskLevel([4])).toBe("FORCED_LABOR");
	});

	it("reads a Level 2 on its own as an early warning", () => {
		expect(kpiRiskLevel([2])).toBe("EARLY_WARNING");
	});

	it("classifies a level the rule does not name as nothing", () => {
		// The rule names Levels 2, 3 and 4. `KPI_LEVEL_CHOICES` also allows 1
		// and 5 and the catalogue holds neither; neither band claims them, so
		// the column stays blank rather than guessing the softer one.
		expect(kpiRiskLevel([1])).toBeNull();
		expect(kpiRiskLevel([5])).toBeNull();
	});

	it("agrees with the supplier tables on every level in the catalogue", () => {
		// The one mapping, read twice. If `isForcedLaborRisk` ever moves, this
		// fails rather than letting the two screens disagree about a KPI.
		for (const level of [1, 2, 3, 4, 5]) {
			expect(kpiRiskLevel([level]) === "FORCED_LABOR").toBe(
				isForcedLaborRisk({ level } as Parameters<typeof isForcedLaborRisk>[0]),
			);
		}
	});

	it("takes the most severe KPI on a call tagged with several", () => {
		// Level 2 alongside a Level 3 is a forced-labor risk: the severer KPI
		// wins, so such a call must never read as an early warning.
		expect(kpiRiskLevel([2, 3])).toBe("FORCED_LABOR");
		expect(kpiRiskLevel([3, 4])).toBe("FORCED_LABOR");
		expect(kpiRiskLevel([2, 4, 1])).toBe("FORCED_LABOR");
		expect(kpiRiskLevel([1, 2])).toBe("EARLY_WARNING");
	});

	it("says nothing about a call with no KPI rather than defaulting it", () => {
		// An untagged call has not been classified; calling it an early warning
		// would be a claim the officer never made.
		expect(kpiRiskLevel([])).toBeNull();
		expect(kpiRiskLevel(undefined)).toBeNull();
		expect(kpiRiskLevel(null)).toBeNull();
	});

	it("is a separate scale from the worker's personal risk level", () => {
		// Different translation keys and a colour of its own, so neither screen
		// can accidentally render one as the other.
		expect(KPI_RISK_LABEL_KEYS.FORCED_LABOR).toBe(
			"workerVoiceForm.options.kpiRisk.forcedLabor",
		);
		expect(KPI_RISK_LABEL_KEYS.EARLY_WARNING).toBe(
			"workerVoiceForm.options.kpiRisk.earlyWarning",
		);
		expect(KPI_RISK_COLORS.FORCED_LABOR).toBe("red");
		expect(KPI_RISK_COLORS.EARLY_WARNING).toBe("amber");
	});
});
