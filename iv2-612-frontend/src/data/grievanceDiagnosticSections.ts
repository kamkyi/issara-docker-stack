export interface DiagnosticOption {
	label: string;
	points: number;
}

export interface DiagnosticQuestion {
	id: string;
	text: string;
	intro?: string;
	isChallenge?: boolean;
	options: DiagnosticOption[];
}

export interface SectionGuidance {
	title: string;
	body: string;
	example?: string;
}

export interface DiagnosticSection {
	number: number;
	title: string;
	description?: string;
	estimatedMinutes: number;
	guidance: SectionGuidance;
	maxScore: number;
	questions: DiagnosticQuestion[];
}

const STD_OPTIONS: DiagnosticOption[] = [
	{ label: "Not at all", points: 0 },
	{ label: "Partially, in progress", points: 1 },
	{ label: "Yes, fully", points: 2 },
];

const STD_OPTIONS_NO: DiagnosticOption[] = [
	{ label: "No", points: 0 },
	{ label: "Partially, in progress", points: 1 },
	{ label: "Yes, fully", points: 2 },
];

const STD_OPTIONS_A: DiagnosticOption[] = [
	{ label: "Not at all", points: 0 },
	{ label: "Partially, in progress", points: 1 },
	{ label: "A lot", points: 2 },
];

const CHALLENGE_OPTIONS: DiagnosticOption[] = [
	{ label: "Not at all", points: 0 },
	{ label: "Partially, in progress", points: 2 },
	{ label: "Yes, fully", points: 4 },
];

const YES_NO_CHALLENGE: DiagnosticOption[] = [
	{ label: "Yes", points: 0 },
	{ label: "I'm not sure", points: 0 },
	{ label: "No", points: 4 },
];

export const diagnosticSections: DiagnosticSection[] = [
	{
		number: 1,
		title: "Credible & Effective Safeguards",
		estimatedMinutes: 3,
		guidance: {
			title: "Why Safeguards Matter",
			body: "Strong safeguards build trust. Workers are more likely to report issues when they know their privacy and safety are protected throughout the process.",
			example:
				"A documented confidentiality policy signed by all grievance handlers",
		},
		maxScore: 10,
		questions: [
			{
				id: "1.1",
				text: "Ethical priorities and commitments, in policy.",
				intro:
					"How much does the company policy prioritize and commit to 'do no harm,' confidentiality, privacy, seeking informed consent from workers before actioning grievances, treating workers with respect, and maintaining safeguards and efficient responses to worker-reported issues?",
				options: STD_OPTIONS,
			},
			{
				id: "1.2",
				text: "Ethical priorities and commitments, in operational practice.",
				intro:
					"Have all possible individuals involved in grievance management, including interpreters, been reviewed to ensure that all are fully willing and able to 'do no harm,' maintain worker safeguards at all times, uphold worker privacy and confidentiality, and treat workers with respect?",
				options: STD_OPTIONS,
			},
			{
				id: "1.3",
				text: "Systems and documentation.",
				intro:
					"How well-documented are the company's grievance policies and procedures?",
				options: STD_OPTIONS,
			},
			{
				id: "1.4",
				text: "Company capacity.",
				intro:
					"Are responsible persons trained and provided with clear protocols and procedures for managing urgent jobseeker- and worker-reported issues?",
				options: STD_OPTIONS_NO,
			},
			{
				id: "1.5",
				text: "Risk assessment.",
				intro:
					"Are risk assessments consistently conducted to review and identify all the possible individuals involved in worker grievances, to ensure that impacted workers remain safe during the duration of the grievance investigation and remediation?",
				options: STD_OPTIONS_NO,
			},
		],
	},
	{
		number: 2,
		title:
			"Culturally & Linguistically Appropriate Communications Channels & Tech That Meet Workers Where They Are At",
		estimatedMinutes: 3,
		guidance: {
			title: "Meeting Workers Where They Are",
			body: "Workers are far more likely to use grievance channels when communications are in their native language and delivered through technologies they already use every day.",
			example:
				"A grievance hotline available in 5 languages with native-speaking operators",
		},
		maxScore: 10,
		questions: [
			{
				id: "2.1",
				text: "Language.",
				intro:
					"Do all workers have easy, private access to a range of grievance channels in their native language, including both in-house and independent grievance channels?",
				options: STD_OPTIONS,
			},
			{
				id: "2.2",
				text: "Inclusiveness and accessibility.",
				intro:
					"Have language, gender, nationality, and the literacy of workers been considered when setting up grievance channels to serve all workers, as well as the use of channels and technologies that are already commonly used and understood by workers?",
				options: STD_OPTIONS,
			},
			{
				id: "2.3",
				text: "Appropriate tech.",
				intro:
					"Are the channels and technologies being used for grievance mechanisms the same communications channels and technologies that are already commonly used and understood by workers?",
				options: STD_OPTIONS,
			},
			{
				id: "2.4",
				text: "First mile coverage.",
				intro:
					"How much are worker engagement and grievance mechanisms available down to the first mile for all worker nationality groups, meaning from the beginning of the recruitment process and not just in the workplace?",
				isChallenge: true,
				options: CHALLENGE_OPTIONS,
			},
		],
	},
	{
		number: 3,
		title: "Private, Unmonitored & Free Access",
		estimatedMinutes: 2,
		guidance: {
			title: "Privacy Enables Honest Reporting",
			body: "Workers will not report concerns if they fear surveillance. Truly private, unmonitored, and free-to-use channels are essential for capturing honest, unfiltered feedback.",
			example:
				"Free password-protected Wi-Fi terminals in private rooms away from supervisor areas",
		},
		maxScore: 8,
		questions: [
			{
				id: "3.1",
				text: "Accessibility.",
				intro:
					"Do all workers have easy access to grievance channels that are well-advertised, appropriately advertised, and responsive?",
				options: STD_OPTIONS,
			},
			{
				id: "3.2",
				text: "Privacy.",
				intro:
					"Do all workers have easy access to grievance channels that are private and unmonitored?",
				options: STD_OPTIONS,
			},
			{
				id: "3.3",
				text: "Free Access.",
				intro:
					"Do all workers have easy access to grievance channels that are free-of-charge, for example through unmonitored, free wi-fi in the workplace and related private locations such as dormitories and rest areas?",
				isChallenge: true,
				options: CHALLENGE_OPTIONS,
			},
		],
	},
	{
		number: 4,
		title: "Remediation Responsiveness & Results, in a Fair & Timely Manner",
		estimatedMinutes: 4,
		guidance: {
			title: "Timely Remediation Builds Trust",
			body: "Workers need to see that raising issues actually leads to fair and timely outcomes. Slow or ineffective remediation actively discourages future reporting and erodes trust.",
			example:
				"A case tracking system with committed response timelines and worker updates at each stage",
		},
		maxScore: 14,
		questions: [
			{
				id: "4.1",
				text: "Professionalism.",
				intro:
					"Are all the possible individuals that would be involved in grievance investigation and remediation processes, including interpreters, reviewed and trained to ensure that they are knowledgeable and qualified to serve in the grievance mechanism, with proficiency in (a) ensuring safety, confidentiality, and privacy, and (b) have an advanced understanding about the workplace rules, worker rights and benefits, labor recruitment processes, company protocols, and workplace operations that workers may raise questions and grievances about?",
				options: STD_OPTIONS,
			},
			{
				id: "4.2",
				text: "Timely action.",
				intro:
					"Are all remediation-related investigations, processes, and resolutions of worker-reported issues carried out in a timely manner?",
				options: STD_OPTIONS,
			},
			{
				id: "4.3",
				text: "Predictability.",
				intro:
					"Are worker grievances and feedback responded to in a meaningful, safe, and timely manner, by a trained and impartial case focal point who keeps workers regularly updated on remedy plans and actions?",
				options: STD_OPTIONS,
			},
			{
				id: "4.4",
				text: "Effective action.",
				intro:
					"Are remediation-related investigations, processes, and resolutions of worker-reported issues ultimately effective in providing appropriate remediation that affected workers are satisfied with?",
				options: STD_OPTIONS,
			},
			{
				id: "4.5",
				text: "Preventing future harms.",
				intro:
					"Are efforts made to analyze and eliminate the root causes to worker-reported issues and grievances?",
				isChallenge: true,
				options: CHALLENGE_OPTIONS,
			},
			{
				id: "4.6",
				text: "Extractiveness.",
				intro:
					"Is feedback ever collected from workers for due diligence or compliance purposes without having a remediation mechanism in place and clearly communicated?",
				options: [
					{ label: "Not at all", points: 2 },
					{ label: "Sometimes", points: 1 },
					{ label: "Yes, regularly", points: 0 },
				],
			},
		],
	},
	{
		number: 5,
		title: "Zero Tolerance Policies Against Retaliation",
		estimatedMinutes: 3,
		guidance: {
			title: "Creating a Safe Environment",
			body: "Fear of retaliation is the #1 reason workers stay silent. Clear, consistently enforced zero-tolerance policies are foundational to any effective grievance mechanism.",
			example:
				"Anti-retaliation clauses featured prominently in all supervisor training and worker handbooks",
		},
		maxScore: 10,
		questions: [
			{
				id: "5.1",
				text: "Policies and procedures.",
				intro:
					"Does the company have a zero tolerance policy against retaliation against workers lodging grievances that includes practical operational processes and designated enforcement authorities?",
				options: STD_OPTIONS_A,
			},
			{
				id: "5.2",
				text: "Communications.",
				intro:
					"Does the company effectively communicate its zero tolerance policy against retaliation to all employees - including management, supervisors, interpreters, and other employees - in appropriate languages and through appropriate, accessible channels?",
				options: STD_OPTIONS_A,
			},
			{
				id: "5.3",
				text: "Zero tolerance in practice.",
				intro:
					"Has zero tolerance of retaliation been followed by everyone involved in all worker grievance cases over the past year?",
				options: STD_OPTIONS_A,
			},
			{
				id: "5.4",
				text: "Addressing power asymmetries.",
				intro:
					"Have all workplace interpreters, line supervisors, and the equivalent been trained on anti-retaliation within the past 12 months?",
				isChallenge: true,
				options: CHALLENGE_OPTIONS,
			},
		],
	},
	{
		number: 6,
		title: "No Conflicts of Interest, Including Corruption",
		estimatedMinutes: 4,
		guidance: {
			title: "Impartial Processes Protect Integrity",
			body: "Conflicts of interest — whether perceived or real — undermine worker trust in the entire grievance process. Impartiality must be actively verified, not assumed.",
			example:
				"An independent review panel for cases involving senior management or supervisors",
		},
		maxScore: 14,
		questions: [
			{
				id: "6.1",
				text: "Conflicts of interest - individual.",
				intro:
					"Are all the possible individuals involved in grievance investigation and remediation processes, including interpreters, reviewed to ensure that there are no conflicts of interest between grievance response personnel and the person/people who are the subject of the complaint?",
				options: STD_OPTIONS_A,
			},
			{
				id: "6.2",
				text: "Conflicts of interest - third party.",
				intro:
					"Is the third party entity managing grievance cases or mechanisms free of conflict of interest and able to operate independently, with no vested interest in the outcome of the grievances?",
				options: STD_OPTIONS_A,
			},
			{
				id: "6.3",
				text: "Third party conflicts due to payment.",
				intro:
					"Is the third party entity managing the grievance mechanism paid by the employer to provide them with grievances?",
				options: [
					{ label: "Yes", points: 0 },
					{ label: "No", points: 2 },
				],
			},
			{
				id: "6.4",
				text: "Third party conflicts perceived by workers.",
				intro:
					"Is the third party entity managing the grievance mechanism perceived by workers as working for management rather than working for workers?",
				isChallenge: true,
				options: YES_NO_CHALLENGE,
			},
			{
				id: "6.5",
				text: "Impartiality.",
				intro:
					"Are all the responsible persons in the grievance mechanism unbiased, uncompromised, and able to refrain from snap judgment when hearing the perspectives of workers versus other staff and management?",
				options: STD_OPTIONS_A,
			},
			{
				id: "6.6",
				text: "Corruption and kickbacks.",
				intro:
					"Are all the responsible persons and processes in the grievance mechanism vetted for corruption and kickbacks?",
				options: STD_OPTIONS,
			},
		],
	},
	{
		number: 7,
		title:
			"Detailed Empowerment & Education to Workers About Their Rights, Terms & Conditions of Employment, Contracts & Pay",
		estimatedMinutes: 3,
		guidance: {
			title: "Informed Workers Are Empowered Workers",
			body: "Workers can only effectively use grievance mechanisms when they understand their rights, how pay is calculated, and the step-by-step process for raising issues safely.",
			example:
				"Monthly pay clinics where workers learn to verify their own payslips and identify errors",
		},
		maxScore: 10,
		questions: [
			{
				id: "7.1",
				text: "Contract transparency and informed consent.",
				intro:
					"During recruitment and onboarding, are workers provided with a copy of their employment contract in their native language, and is a detailed explanation provided regarding their specific role, salary, working hours, and permissible deductions before they begin work?",
				options: STD_OPTIONS,
			},
			{
				id: "7.2",
				text: "Pay literacy and wage transparency.",
				intro:
					'Are workers provided with monthly payslips in their native language that clearly itemize gross wages, overtime hours/rates, and all deductions? Does the company provide regular training or "pay clinics" to ensure workers can calculate their own pay and identify errors?',
				options: STD_OPTIONS,
			},
			{
				id: "7.3",
				text: "Rights and grievance mechanism education.",
				intro:
					"Does the company conduct regular, interactive training at least annually for all workers—including migrants and sub-contracted staff—on their fundamental labor rights and the specific, step-by-step process for using both internal (company) and independent grievance channels?",
				options: STD_OPTIONS,
			},
			{
				id: "7.4",
				text: "Freedom of association literacy and safety.",
				intro:
					"Does the company's labor rights training explicitly include the right to freedom of association and collective bargaining, and does the company use anonymous surveys or interviews to verify that workers feel safe to exercise these rights without fear of reprisal?",
				isChallenge: true,
				options: CHALLENGE_OPTIONS,
			},
		],
	},
	{
		number: 8,
		title:
			"Independent Channels for Worker Access to & Validation of Remediation, Without Retaliation",
		estimatedMinutes: 4,
		guidance: {
			title: "Access to External Support",
			body: "Internal mechanisms alone are not sufficient. Workers must know they can freely seek support from trade unions, NGOs, or other independent parties without any risk of retaliation.",
			example:
				"A partnership agreement with a local NGO for independent case validation and worker support",
		},
		maxScore: 14,
		questions: [
			{
				id: "8.1",
				text: "Right to remedy, in policy.",
				intro:
					"Do the company's policies respect that if workers do not see satisfactory progress or results within a reasonable timeframe, they have the right to seek other channels for remedy and justice?",
				options: STD_OPTIONS,
			},
			{
				id: "8.2",
				text: "Right to remedy, in practice.",
				intro:
					"Do the company's operational practices respect that if workers do not see satisfactory progress or results within a reasonable timeframe, they have the right to seek other channels for remedy and justice?",
				options: STD_OPTIONS,
			},
			{
				id: "8.3",
				text: "Freedom of association.",
				intro:
					"Do the company's policies and practices respect freedom of association for independent trade unions, with no retaliation against worker organizers or members?",
				options: STD_OPTIONS,
			},
			{
				id: "8.4",
				text: "Collaboration with independent non-profit service providers, in policy.",
				intro:
					"Do the company's policies encourage productive collaboration with the non-profit service providers (NGOs, trade unions, etc.) that workers have engaged for support on remediation?",
				options: STD_OPTIONS,
			},
			{
				id: "8.5",
				text: "Collaboration with independent non-profit service providers, in practice.",
				intro:
					"Do the company's operational practices encourage productive collaboration with the non-profit service providers (NGOs, trade unions, etc.) that workers have engaged for support on remediation?",
				options: STD_OPTIONS,
			},
			{
				id: "8.6",
				text: "Worker validation of remediation.",
				intro:
					"When does the company's grievance management system recognize that grievance cases are 'case closed' and remediation processes are complete?",
				isChallenge: true,
				options: [
					{
						label:
							"When HR or management determines the remediation to be complete",
						points: 0,
					},
					{
						label:
							"When impacted workers confirm the remediation is complete, and their level of satisfaction",
						points: 4,
					},
				],
			},
		],
	},
	{
		number: 9,
		title:
			"Genuine Service Mindset, with Attention to What Matters to Workers & Not Just to Business",
		estimatedMinutes: 3,
		guidance: {
			title: "Listening Beyond Compliance",
			body: "A genuine service mindset means valuing worker voices year-round — not just during audits. Workers should feel genuinely heard, not just processed through a compliance checklist.",
			example:
				"Quarterly worker-led forums where discussion topics are set entirely by workers, not management",
		},
		maxScore: 10,
		questions: [
			{
				id: "9.1",
				text: "Ongoing and worker-led.",
				intro:
					"Does the company have ongoing communications exchange with workers, on topics that workers choose to raise?",
				options: STD_OPTIONS_A,
			},
			{
				id: "9.2",
				text: "Counterbalancing extractive data collection.",
				intro:
					"Does the company counterbalance one-off and/or intermittent collection of worker data on topics selected by business or auditors, with open channels for workers to raise topics of their own interest?",
				options: STD_OPTIONS_A,
			},
			{
				id: "9.3",
				text: "Longer-term impact.",
				intro:
					"Through grievance case management and upon case conclusion, do case focal points stay in touch with workers reporting grievances to see how they are doing, and whether there have been any positive or negative impacts from the grievance management and investigation on their well-being?",
				options: STD_OPTIONS,
			},
			{
				id: "9.4",
				text: "Facilitation of collective voice.",
				intro:
					"Does the company provide designated time and a private space for worker-led committees or unions to meet and discuss workplace issues, including grievances, independently of management oversight?",
				isChallenge: true,
				options: CHALLENGE_OPTIONS,
			},
		],
	},
];

export interface StarThreshold {
	min: number;
	stars: number;
}

export const starThresholds: StarThreshold[] = [
	{ min: 90, stars: 5 },
	{ min: 80, stars: 4 },
	{ min: 70, stars: 3 },
	{ min: 60, stars: 2 },
	{ min: 0, stars: 1 },
];

export type AnswerMap = Record<string, number>;

export function computeSectionPoints(
	section: DiagnosticSection,
	answers: AnswerMap,
): number {
	return section.questions.reduce((sum, q) => {
		const idx = answers[q.id];
		if (typeof idx !== "number") return sum;
		return sum + (q.options[idx]?.points ?? 0);
	}, 0);
}

export function computeSectionPercent(
	section: DiagnosticSection,
	answers: AnswerMap,
): number {
	if (section.maxScore === 0) return 0;
	return (computeSectionPoints(section, answers) / section.maxScore) * 100;
}

export function computeOverallPercent(
	sections: DiagnosticSection[],
	answers: AnswerMap,
): number {
	if (sections.length === 0) return 0;
	const sum = sections.reduce(
		(acc, s) => acc + computeSectionPercent(s, answers),
		0,
	);
	return sum / sections.length;
}

export function getStars(overallPercent: number): number {
	for (const threshold of starThresholds) {
		if (overallPercent >= threshold.min) return threshold.stars;
	}
	return 1;
}

export function isSectionComplete(
	section: DiagnosticSection,
	answers: AnswerMap,
): boolean {
	return section.questions.every((q) => typeof answers[q.id] === "number");
}
