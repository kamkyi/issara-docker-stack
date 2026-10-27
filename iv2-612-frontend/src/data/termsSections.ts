export interface TermsSubsection {
	title: string;
	items: string[];
}

export interface TermsSection {
	number: string;
	title: string;
	content: string;
	list?: string[];
	subsections?: TermsSubsection[];
	contact?: string;
}

export const termsLastUpdated = "May 8, 2026";
export const termsEffectiveDate = "May 8, 2026";

export const termsSections: TermsSection[] = [
	{
		number: "01",
		title: "Introduction & Legal Impressum",
		content:
			"CASCADE is a data ecosystem platform for inclusive labor monitoring operated by Issara Institute Inc., a U.S. 501(c)(3) non-profit and Thai non-profit foundation.",
		subsections: [
			{
				title: "Legal Identity (Impressum)",
				items: [
					"Organization: Issara Institute Inc.",
					"Registered Office: 1207 Delaware Ave. #530, Wilmington, DC 19806",
					"Representative Office (SE Asia): 50 Soi Passana, Ekkamai Soi 4, Sukhumvit 63 Road, Phra Khanong-nua, Wattana, Bangkok 10110 Thailand",
					"Contact: cascade@issarainstitute.org",
				],
			},
		],
	},
	{
		number: "02",
		title: "Global Compliance Framework",
		content: "We process personal data in accordance with:",
		list: [
			"EU & Germany: GDPR and the Federal Data Protection Act (BDSG 2026).",
			"Canada: PIPEDA and provincial laws (Quebec Law 25, BC PIPA, Alberta PIPA).",
			"USA: CCPA/CPRA (California), FDBR (Florida), MHMDA (Washington).",
			"Asia-Pacific: Thailand PDPA, Australia Privacy Act, Japan APPI.",
		],
	},
	{
		number: "03",
		title: "Data We Collect & Purpose",
		content:
			"We collect data solely for the purpose of labor monitoring and remediation of worker-reported issues.",
		list: [
			"Worker Data: Contact info, workplace location, and details of worker-reported issues.",
			"Business Data: User credentials and professional contact details.",
			"Sensitive Data: We may process sensitive data (e.g., union membership or health data) only when strictly necessary for grievance resolution and with explicit opt-in consent.",
		],
	},
	{
		number: "04",
		title: "Legal Basis for Processing",
		content: "Our lawful bases for processing personal data are:",
		list: [
			"Contractual & Legitimate Interests: For business user accounts and platform security.",
			'Consent: For all worker-sourced data. In Germany (BDSG §26) and Canada, we ensure that consent is "free and voluntary." Workers are informed that there is no negative consequence for refusing to participate in CASCADE data collection.',
			"Necessity: Data processing is limited to what is strictly necessary to improve labor conditions.",
		],
	},
	{
		number: "05",
		title: 'Algorithmic Transparency (The "Human-in-the-Loop")',
		content:
			"In compliance with the EU AI Act and Germany's scoring regulations (§37a BDSG):",
		list: [
			"Transparency: We disclose the logic behind our CASCADE Index (CI) scores.",
			"No Automated Decisions: No legal or significant effects (like termination of a supplier contract) are based solely on automated processing.",
			"Right to Appeal: Users in all jurisdictions have the right to a human review of any CI score within 48 hours.",
		],
	},
	{
		number: "06",
		title: "Security & Data Residency",
		content: "We protect your data through the following measures:",
		list: [
			"Encryption: All data is encrypted at rest (AES-256) and in transit (TLS 1.3).",
			"Data Residency: Data is primarily hosted on AWS servers in the U.S. and EU.",
			'Note for German/Canadian Buyers: We conduct Privacy Impact Assessments (PIAs) for all cross-border transfers to ensure a "comparable level of protection" as required by Quebec\'s Law 25 and the GDPR.',
		],
	},
	{
		number: "07",
		title: "Regional Rights",
		content:
			"Specific rights apply to users based on their region of residence:",
		subsections: [
			{
				title: "Canada (Quebec, BC, Alberta)",
				items: [
					"Privacy Officer: We have appointed a Data Privacy Officer (DPO) to oversee Canadian compliance.",
					"Transfer Disclosure: We notify users that data may be processed outside of their home province (including outside of Canada).",
					"Withdrawal of Consent: You may withdraw consent at any time, subject to legal or contractual restrictions.",
				],
			},
			{
				title: "Germany & EU",
				items: [
					'Right to Erasure: In addition to the "Right to be Forgotten," German users have specific rights under the BDSG to restrict processing if data accuracy is contested.',
					"DPO: Our DPO is reachable at cascade@issarainstitute.org.",
				],
			},
			{
				title: "United States (California, Washington, Florida)",
				items: [
					"California: We do not sell your data.",
					"Washington/Florida: We provide heightened protections for any health-related data shared in worker grievances.",
				],
			},
		],
	},
	{
		number: "08",
		title: "Data Retention",
		content:
			"We retain data only as long as necessary for robust trend analysis and evidence of continuous improvement:",
		list: [
			"Business Records: 7 years.",
			"Worker Grievances: Duration of case + 5 years.",
			"Anonymization: Once the retention period expires, data is either deleted or fully anonymized to the point of non-identifiability.",
		],
	},
	{
		number: "09",
		title: "Contact Our Data Privacy Officer (DPO)",
		content:
			"For all inquiries, access requests, or to exercise your right to object, contact: Attn: Data Privacy Officer, Issara Institute / CASCADE.",
		contact: "cascade@issarainstitute.org",
	},
];
