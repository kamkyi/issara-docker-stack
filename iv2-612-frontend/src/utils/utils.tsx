import Box from "@mui/material/Box";

// Constants
export const emDash = "\u2014";

export const colorScheme = {
	NOT_YET: "#b7b7b7",
	PROGRESS: "#ffe599",
	COMPLETE: "#148696",
};

export const defaultStatusText = Object.freeze({
	not_yet: {
		name: "Not Yet Initiated",
		color: "#b7b7b7",
	},
	partial: {
		name: "Partial Progress",
		color: "#ffe599",
	},
	complete: {
		name: "Completed / Ongoing",
		color: "#148696",
	},
});

export const business_indicator: Record<string, string> = {
	ER_3: "Policy & procedures review: Review of Management Service Agreements (MSAs) between employers and recruitment agencies",
	ER_4: "Communications: Disclosure of recruitment agencies used",
	ER_6: "Recruitment fees surveys",
	ER_7: "Institutional capacity building: Ethical recruitment trainings",
	WV_1: "Worker satisfaction surveys",
	WV_2: "Institutional capacity building: Ethical grievance mechanisms",
	WV_3: "Institutional capacity building: Training of management / leadership",
};

// Utility Functions
export const findObject = (array: any[], key: string, value: any) => {
	return array.find((obj) => obj[key] === value) || {};
};

export const removeDuplicates = (array: any[]) => {
	const seen = new Set();
	return array.filter((item) => {
		const isDuplicate = seen.has(item.str_value);
		seen.add(item.str_value);
		return !isDuplicate;
	});
};

export const flattenSPAcitivitesDataArray = (dataArray: any[]) => {
	return dataArray?.length > 0
		? dataArray.map((data) => {
				const { priority_activity, ...rest } = data;
				const {
					id: priority_activity_id,
					group,
					...activityRest
				} = priority_activity;
				const { name: groupName, description: groupDescription } = group;
				return {
					...rest,
					priority_activity_id,
					...activityRest,
					groupName,
					groupDescription,
				};
			})
		: [];
};
export const textMapping: Record<string, string> = {
	"not yet": "Not yet initiated",
	not_yet: "Not yet initiated",
	"partial progress": "Partial progress",
	partial: "Partial progress",
	completed: "Completed/ongoing",
	not_started: "Not yet initiated",
	in_progress: "Partial progress",
	complete: "Completed/ongoing",
	Yellow: "Partial progress",
	Gray: "Not yet initiated",
	Green: "Completed/ongoing",
	"not-initiated": "Not yet initiated",
};

export const getStatusColor = (
	_context: any,
	status: string,
	showText = true,
	size = 14,
) => {
	const colorMapping: Record<string, string> = {
		"not yet": "#b7b7b7",
		not_yet: "#b7b7b7",
		"partial progress": "#ffe599",
		partial: "#ffe599",
		completed: "#148696",
		not_started: "#b7b7b7",
		in_progress: "#ffe599",
		complete: "#148696",
		Yellow: "#ffe599",
		Gray: "#b7b7b7",
		Green: "#148696",
	};

	return (
		<div style={{ display: "flex", alignItems: "center" }}>
			<Box
				sx={{
					display: "inline-block",
					width: `${size * 1.4}px`,
					border: "1px solid black",
					height: `${size * 1.4}px`,
					bgcolor: colorMapping[status],
					marginRight: 1,
					borderRadius: "50%",
				}}
			/>
			<span style={{ color: "black", fontSize: `${size}px` }}>
				{showText ? textMapping[status] : ""}
			</span>
		</div>
	);
};

export const arrayToObject = (array: any[]) => {
	return array.reduce((obj: any, item: any) => {
		obj[item.id] = item;
		return obj;
	}, {});
};

export const overFlowTextModifier = (text: string) => {
	if (text && text.length > 50) {
		return <div className="overflow-text">{text}</div>;
	} else {
		return text;
	}
};

export const formatNumber = (num: number) => {
	return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
};

export const getIndustryName = (industries: any[], id: any) => {
	if (Array.isArray(id) && id.length > 0) {
		const names: string[] = [];
		industries.forEach((ttobject) => {
			if (id.includes(ttobject.id)) {
				names.push(ttobject.name);
			}
		});
		const nameString = names.join(", ");
		return nameString || "-";
	} else {
		const tobject = industries.find((ttobject) => ttobject.id === id);
		return tobject?.name || "-";
	}
};

export const getSubIndustryName = (subindustries: any[], id: any) => {
	if (Array.isArray(id) && id.length > 0) {
		const names: string[] = [];
		subindustries.forEach((ttobject) => {
			if (id.includes(ttobject.id)) {
				names.push(ttobject.name);
			}
		});
		const nameString = names.join(", ");
		return nameString || "-";
	} else {
		const tobject = subindustries.find((ttobject) => ttobject.id === id);
		return tobject?.name || "-";
	}
};

export const getSupplierKpiStatusFromId = (id: number) => {
	let status = "N/A";
	if (id === 1) {
		status = "No Progress";
	} else if (id === 2) {
		status = "Some Progress";
	} else if (id === 3) {
		status = "Closed";
	} else if (id === 4) {
		status = "Old, unresolved case";
	}
	return status;
};

export const shortenString = (
	stringToShorten: string,
	shorterLength: number,
) => {
	if (
		shorterLength < 1 ||
		stringToShorten === undefined ||
		stringToShorten === "" ||
		stringToShorten === null ||
		stringToShorten.length < shorterLength
	) {
		return stringToShorten;
	}
	let returnVal = stringToShorten.substr(0, shorterLength - 1);
	if (stringToShorten.length > shorterLength) {
		returnVal += "...";
	}
	return returnVal;
};

export const removeNulls = (object: any) => {
	const noNullsMe: any = {};
	if (object) {
		Object.keys(object).forEach((key) => {
			if (object[key] !== undefined && object[key] !== null) {
				noNullsMe[key] = object[key];
			}
		});
	}
	return noNullsMe;
};

export const yyyymm = (theDateStr: string) => {
	if (!theDateStr || theDateStr === "") {
		return theDateStr;
	}
	const theDate = new Date(theDateStr);
	const mm = theDate.getMonth() + 1;
	return [theDate.getFullYear(), (mm > 9 ? "" : "0") + mm].join("-");
};

export const yyyymmdd = (theDateStr: string) => {
	if (!theDateStr || theDateStr === "") {
		return theDateStr;
	}
	const theDate = new Date(theDateStr);
	const mm = theDate.getMonth() + 1;
	const dd = theDate.getDate();
	return [
		theDate.getFullYear(),
		(mm > 9 ? "" : "0") + mm,
		(dd > 9 ? "" : "0") + dd,
	].join("-");
};

export const giveMeGuid = () => {
	const lut: string[] = [];
	for (let i = 0; i < 256; i++) {
		lut[i] = (i < 16 ? "0" : "") + i.toString(16);
	}
	const d0 = (Math.random() * 0xffffffff) | 0;
	const d1 = (Math.random() * 0xffffffff) | 0;
	const d2 = (Math.random() * 0xffffffff) | 0;
	const d3 = (Math.random() * 0xffffffff) | 0;
	return (
		lut[d0 & 0xff] +
		lut[(d0 >> 8) & 0xff] +
		lut[(d0 >> 16) & 0xff] +
		lut[(d0 >> 24) & 0xff] +
		"-" +
		lut[d1 & 0xff] +
		lut[(d1 >> 8) & 0xff] +
		"-" +
		lut[((d1 >> 16) & 0x0f) | 0x40] +
		lut[(d1 >> 24) & 0xff] +
		"-" +
		lut[(d2 & 0x3f) | 0x80] +
		lut[(d2 >> 8) & 0xff] +
		"-" +
		lut[(d2 >> 16) & 0xff] +
		lut[(d2 >> 24) & 0xff] +
		lut[d3 & 0xff] +
		lut[(d3 >> 8) & 0xff] +
		lut[(d3 >> 16) & 0xff] +
		lut[(d3 >> 24) & 0xff]
	);
};

export const findStringInObjectFields = (
	list: any[],
	search: string,
	keys: string[],
) => {
	if (!list) return [];
	const lowerCaseSearch = search.toLowerCase();
	return list.filter((item) =>
		keys.some((key) => {
			const value = item[key];
			if (value) {
				const valueStr = Array.isArray(value)
					? value.toString()
					: String(value);
				return valueStr.toLowerCase().includes(lowerCaseSearch);
			}
			return false;
		}),
	);
};

export const composeSlackBugMessage = (err: any, payload?: any) => {
	const details =
		err.response.status === 500
			? "Please see the details above from Python Logger"
			: JSON.stringify(err.response.data);
	const slackMessage = {
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: "-----------------------------------------------------------\nYou have a new bug :beers:",
				},
			},
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: `*Status Code:*\n${err.response.status}\n\n*Message:*\n${err.message}\n\n*Details:*\n${details}\n\n*Payload:*\n${payload ? JSON.stringify(payload) : "-"}`,
				},
			},
		],
	};
	return JSON.stringify(slackMessage);
};

export const arrayIdsToSqlParamString = (ids: any[]) => {
	if (!ids || !ids.length || ids.length < 1) {
		return "";
	}
	return "(" + ("" + ids) + ")";
};

export const isEmpty = (value: any) => {
	return (
		value === undefined ||
		value === null ||
		(value.length !== undefined && value.length < 1) ||
		(value.length === undefined && Object.keys(value).length < 1)
	);
};

export const isEmptyField = (value: any) => {
	return (
		value === undefined ||
		value === null ||
		(value.length !== undefined && value.length < 1)
	);
};

export const stringOrEmpty = (value: any) => {
	return isEmpty(value) === true ? "" : value;
};

export const isNumeric = (input: any) => {
	const RE = /^-{0,1}\d*\.{0,1}\d+$/;
	return RE.test(input);
};

export const findPartnerAndSupplyChain = (
	user: any,
	tsupplyChains: any[],
	tstrategicPartners: any[],
) => {
	if (
		tsupplyChains &&
		tsupplyChains.forEach !== undefined &&
		tsupplyChains.length > 0
	) {
		const partnerFound = tstrategicPartners.find(
			(partner) => partner.id === user.partner,
		);
		const foundSupplyChain = !partnerFound
			? null
			: tsupplyChains.find(
					(supplyChain) => supplyChain.strategic_partner === partnerFound.id,
				);
		return {
			foundSupplyChain,
			partnerFound,
		};
	}
	return undefined;
};

export const turnDateIntoString = (date: any) => {
	if (Object.prototype.toString.call(date) === "[object String]") {
		return date;
	}
	if (
		Object.prototype.toString.call(date) === "[object Date]" &&
		date.toLocaleDateString !== undefined
	) {
		return date.toLocaleDateString();
	}
	return "" + date;
};

export const generateCrCAveragesMap = (crcData: any[], chart = true): any => {
	const supplierCRCAveragesMap = new Map();
	if (crcData && crcData.length !== undefined && crcData.length > 0) {
		if (crcData.length > 1) {
			crcData = crcData.sort(
				(a, b) =>
					new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
			);
		}
		crcData.forEach((supplierCRCScore) => {
			if (supplierCRCAveragesMap.has(supplierCRCScore.supplier_id) === false) {
				supplierCRCAveragesMap.set(supplierCRCScore.supplier_id, {
					quality_avg: 0,
					timeliness_avg: 0,
					openness_avg: 0,
					supplier_crc_scores: [],
				});
			}
			const supplierCRCAverages = supplierCRCAveragesMap.get(
				supplierCRCScore.supplier_id,
			);

			// Quality
			let quality_avg_val = supplierCRCScore.avg_worker_response_feedback || 0;
			let quality_avg_divide = supplierCRCScore.avg_worker_response_feedback
				? 1
				: 0;
			quality_avg_val +=
				supplierCRCScore.avg_worker_recruitment_mngmt_feedback || 0;
			quality_avg_divide +=
				supplierCRCScore.avg_worker_recruitment_mngmt_feedback ? 1 : 0;
			quality_avg_val +=
				supplierCRCScore.issara_tech_assessment_response_quality_hr || 0;
			quality_avg_divide +=
				supplierCRCScore.issara_tech_assessment_response_quality_hr ? 1 : 0;
			quality_avg_val +=
				supplierCRCScore.issara_tech_assessment_response_quality_production ||
				0;
			quality_avg_divide +=
				supplierCRCScore.issara_tech_assessment_response_quality_production
					? 1
					: 0;
			quality_avg_val +=
				supplierCRCScore.issara_tech_assessment_response_quality_sr_mngmt || 0;
			quality_avg_divide +=
				supplierCRCScore.issara_tech_assessment_response_quality_sr_mngmt
					? 1
					: 0;

			supplierCRCScore.quality_avg =
				quality_avg_divide > 0 ? quality_avg_val / quality_avg_divide : 0;

			// Timeliness
			let timeliness_avg_val =
				supplierCRCScore.duration_of_time_taken_to_respond || 0;
			let timeliness_avg_divide =
				supplierCRCScore.duration_of_time_taken_to_respond ? 1 : 0;
			timeliness_avg_val +=
				supplierCRCScore.duration_of_time_taken_to_revert_on_action_plan || 0;
			timeliness_avg_divide +=
				supplierCRCScore.duration_of_time_taken_to_revert_on_action_plan
					? 1
					: 0;
			timeliness_avg_val +=
				supplierCRCScore.duration_of_time_taken_to_resolve_issues || 0;
			timeliness_avg_divide +=
				supplierCRCScore.duration_of_time_taken_to_resolve_issues ? 1 : 0;

			supplierCRCScore.timeliness_avg =
				timeliness_avg_divide > 0
					? timeliness_avg_val / timeliness_avg_divide
					: 0;

			// Openness
			let openness_avg_val =
				supplierCRCScore.site_cooperation_with_ethicall_distribution || 0;
			let openness_avg_divide =
				supplierCRCScore.site_cooperation_with_ethicall_distribution ? 1 : 0;
			openness_avg_val +=
				supplierCRCScore.business_attitude_toward_suggested_remedies || 0;
			openness_avg_divide +=
				supplierCRCScore.business_attitude_toward_suggested_remedies ? 1 : 0;
			openness_avg_val +=
				supplierCRCScore.business_attitude_toward_capacity_and_risks || 0;
			openness_avg_divide +=
				supplierCRCScore.business_attitude_toward_capacity_and_risks ? 1 : 0;
			openness_avg_val +=
				supplierCRCScore.business_attitude_toward_promoting_worker_voice || 0;
			openness_avg_divide +=
				supplierCRCScore.business_attitude_toward_promoting_worker_voice
					? 1
					: 0;
			openness_avg_val +=
				supplierCRCScore.business_attitude_toward_worker_treatment || 0;
			openness_avg_divide +=
				supplierCRCScore.business_attitude_toward_worker_treatment ? 1 : 0;
			openness_avg_val += supplierCRCScore.business_attitude_toward_issara || 0;
			openness_avg_divide += supplierCRCScore.business_attitude_toward_issara
				? 1
				: 0;

			supplierCRCScore.openness_avg =
				openness_avg_divide > 0 ? openness_avg_val / openness_avg_divide : 0;

			supplierCRCAverages.quality_avg += supplierCRCScore.quality_avg;
			supplierCRCAverages.timeliness_avg += supplierCRCScore.timeliness_avg;
			supplierCRCAverages.openness_avg += supplierCRCScore.openness_avg;
			supplierCRCAverages.supplier_crc_scores.push(supplierCRCScore);
		});

		if (!chart) {
			return supplierCRCAveragesMap;
		}

		const qualityCRC = crcData.map((item) =>
			parseFloat(item.quality_avg).toFixed(2),
		);
		const timelinessCRC = crcData.map((item) =>
			parseFloat(item.timeliness_avg).toFixed(2),
		);
		const opennessCRC = crcData.map((item) =>
			parseFloat(item.openness_avg).toFixed(2),
		);
		const list_of_dates = crcData.map((item) => item.created_at);
		const chartData = getChartData(
			list_of_dates,
			qualityCRC,
			timelinessCRC,
			opennessCRC,
			false,
		);
		return chartData;
	}
	return chart ? getChartData() : supplierCRCAveragesMap;
};

export const getChartData = (
	list_of_dates: string[] | null = null,
	qualityCRC: string[] | null = null,
	timelinessCRC: string[] | null = null,
	opennessCRC: string[] | null = null,
	empty = true,
) => {
	const chart_axis: any = {
		x: {
			type: "timeseries",
			tick: {
				rotate: -45,
				format: "%d-%m-%Y",
				culling: false,
			},
			height: 60,
		},
		y: {
			max: 4.9,
		},
		rotated: list_of_dates !== null && list_of_dates.length === 1,
	};

	if (empty) {
		return {
			data: {
				x: "x",
				columns: [
					["x", null],
					["Quality of Response", null],
					["Timeliness of Response", null],
					["Openness to Reform", null],
				],
			},
			axis: chart_axis,
		};
	}

	return {
		data: {
			x: "x",
			columns: [
				["x", ...(list_of_dates || [])],
				["Quality of Response", ...(qualityCRC || [])],
				["Timeliness of Response", ...(timelinessCRC || [])],
				["Openness to Reform", ...(opennessCRC || [])],
			],
			type: list_of_dates && list_of_dates.length === 1 ? "bar" : "line",
		},
		axis: chart_axis,
		bar:
			list_of_dates && list_of_dates.length === 1
				? {
						width: {
							ratio: 0.4,
						},
					}
				: {},
	};
};

export const getCaseStatuses = (context: any) => {
	return [
		{ id: 1, name: context.t("open") },
		{ id: 2, name: context.t("close") },
		{ id: 3, name: context.t("some progress") },
	];
};

export const getGenderTypes = (context: any) => {
	return [
		{ value: "", name: context.t("Select Gender") },
		{ value: 1, name: context.t("Male") },
		{ value: 2, name: context.t("Female") },
		{ value: 3, name: context.t("Other") },
		{ value: 4, name: context.t("Non-Binary") },
	];
};

export const sortActivitiesByLogicalOrder = (a: any, b: any) => {
	const aDesc = a.description?.toLowerCase() || "";
	const bDesc = b.description?.toLowerCase() || "";

	const sortingRules = [
		{
			pattern: /^establish/,
			priority: 1,
			name: "establish",
		},
		{
			pattern: /^if (policy|policies) (is )?already in place|^if a policy/,
			priority: 2,
			name: "review_existing",
		},
		{
			pattern: /^prepare and roll out/,
			priority: 3,
			name: "implement",
		},
		{
			pattern: /^communicate|^support/,
			priority: 4,
			name: "communicate",
		},
		{
			pattern: /^encourage and support/,
			priority: 5,
			name: "encourage",
		},
		{
			pattern: /^carry out|^conduct/,
			priority: 6,
			name: "execute",
		},
	];

	const getPriority = (description: string) => {
		for (const rule of sortingRules) {
			if (rule.pattern.test(description)) {
				return rule.priority;
			}
		}
		return 999;
	};

	const aPriority = getPriority(aDesc);
	const bPriority = getPriority(bDesc);

	if (aPriority !== bPriority) {
		return aPriority - bPriority;
	}

	return (a.id || 0) - (b.id || 0);
};

// Default export for backward compatibility
const utils = {
	emDash,
	findObject,
	colorScheme,
	removeDuplicates,
	flattenSPAcitivitesDataArray,
	business_indicator,
	defaultStatusText,
	getStatusColor,
	arrayToObject,
	overFlowTextModifier,
	formatNumber,
	getIndustryName,
	getSubIndustryName,
	getSupplierKpiStatusFromId,
	shortenString,
	removeNulls,
	yyyymm,
	yyyymmdd,
	giveMeGuid,
	findStringInObjectFields,
	composeSlackBugMessage,
	arrayIdsToSqlParamString,
	isEmpty,
	isEmptyField,
	stringOrEmpty,
	isNumeric,
	findPartnerAndSupplyChain,
	turnDateIntoString,
	generateCrCAveragesMap,
	getChartData,
	getCaseStatuses,
	getGenderTypes,
	sortActivitiesByLogicalOrder,
	textMapping,
};

export default utils;
