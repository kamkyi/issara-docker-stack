import { CheckIcon, Cross2Icon, Pencil1Icon } from "@radix-ui/react-icons";

const steps = [
	"Information Collection",
	"Safeguarding Workers",
	"Ethical Investigation",
	"Communicating",
	"Monitoring",
];

const getYesNoAnswer = (value) => {
	if (value === true || value === "true" || value === "yes") {
		return "Yes";
	}

	if (value === false || value === "false" || value === "no") {
		return "No";
	}

	return "-";
};

const Stepper = ({ currentStep }) => (
	<div className="flex items-center justify-center mb-6">
		{steps.map((label, idx) => (
			<div className="flex items-center" key={label}>
				<div
					className={`rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold
            ${idx <= currentStep ? "bg-teal text-white" : "bg-gray-200 text-gray-400"}
          `}
				>
					{idx + 1}
				</div>
				{idx < steps.length - 1 && (
					<div
						className={`h-1 w-8 ${idx < currentStep ? "bg-teal" : "bg-gray-200"}`}
					></div>
				)}
			</div>
		))}
	</div>
);

const PreviewGrievance = ({
	data,
	open,
	handleSubmit,
	handleModalClose,
	isPreview,
	currentStep = 0,
	setStep,
}) => {
	if (!open) return null;

	return (
		<div
			aria-modal="true"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
			onClick={handleModalClose}
			role="dialog"
		>
			<div
				className="relative w-full max-w-4xl mx-auto bg-white rounded-md shadow-lg flex flex-col h-[90vh] border-2 border-[#148696] overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex justify-between items-center px-6 py-4 border-b border-[#148696] bg-[#f7fafc]">
					<h2 className="text-xl md:text-2xl font-bold tracking-tight ">
						Supplier Grievance Preview
					</h2>
					<button
						aria-label="Close preview"
						className=" hover:text-[#0e5e5e] text-2xl font-bold transition-colors"
						onClick={handleModalClose}
					>
						<Cross2Icon className="w-6 h-6" />
					</button>
				</div>
				{/* Stepper */}
				<Stepper currentStep={currentStep} />
				{/* Content */}
				<div className="overflow-y-auto flex-1 px-6 py-4 space-y-8 bg-white">
					{/* Step 1: Information Collection */}
					{currentStep === 0 && (
						<section>
							<h3 className="text-xl font-semibold mb-2 ">
								Information Collection
							</h3>
							<hr className="mb-4 border-[#148696]" />
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="font-medium">
									Please review the information shared in ILM. Do you want to
									talk to Issara to get more context on the worker-reported
									issue?
								</div>
								<div>
									{data.issara_context === "no_need"
										? "No Need"
										: data.issara_context === "wantMoreInfo"
											? "Yes, I want more information from my Issara focal"
											: "Yes, I already reached out to my Issara focal"}
								</div>
								<div className="font-medium">
									Have you checked with the HR team to see if similar
									worker-reported issues have been filed and/or solved recently?
								</div>
								<div>{getYesNoAnswer(data.check_with_hr)}</div>
								<div className="font-medium">
									Is this worker-reported issue a repeat issue, meaning that
									there might be a root cause that needs to be identified and
									addressed?
								</div>
								<div>{getYesNoAnswer(data.repeat_issue)}</div>
								<div className="font-medium">Additional Notes</div>
								<div>{data.information_collection_notes?.value || "-"}</div>
							</div>
						</section>
					)}
					{/* Step 2: Safeguarding Affected Workers */}
					{currentStep === 1 && (
						<section>
							<h3 className="text-xl font-semibold mb-2 ">
								Safeguarding Affected Workers
							</h3>
							<hr className="mb-4 border-[#148696]" />
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="font-medium">
									Is zero tolerance of retaliation being followed by everyone
									involved in this case?
								</div>
								<div>{data.zero_tolerance === true ? "Yes" : "No"}</div>
								<div className="font-medium">
									Have you reviewed all the possible individuals identified in
									the worker-reported issue and conducted a risk assessment to
									ensure that workers remain safe during the duration of the
									grievance investigation and remediation?
								</div>
								<div>{data.reviewed_individual === true ? "Yes" : "No"}</div>
								<div className="font-medium">
									Have you reviewed all the possible individuals that would be
									involved in the grievance investigation and remediation
									process, including interpreters, and ensured that there are no
									conflicts of interest?
								</div>
								<div>{data.involved_in_grievance === true ? "Yes" : "No"}</div>
								<div className="font-medium">
									All individuals have received the training ensuring they
									understand how to prioritize safety, confidentiality, privacy
									and company protocols for efficient response to
									worker-reported issues?
								</div>
								<div>{data.received_the_training === true ? "Yes" : "No"}</div>
								<div className="font-medium">
									Has a trained and impartial individual reached out to the
									worker(s) to introduce themselves as the case focal point,
									inform them that the company is about to launch an
									investigation into their grievance, specify the start date,
									and confirm that there are no conflicts of interest within the
									investigation team?
								</div>
								<div>
									{data.has_trained_impartial?.value === "not_yet"
										? "No, not yet, but I will do so"
										: data.has_trained_impartial?.value === "not_necessary"
											? "No, I do not think that is necessary"
											: "Yes"}
								</div>
								<div className="font-medium">Additional Notes</div>
								<div>{data.safeguarding_notes?.value || "-"}</div>
							</div>
						</section>
					)}
					{/* Step 3: Ensuring an Ethical Investigation */}
					{currentStep === 2 && (
						<section>
							<h3 className="text-xl font-semibold mb-2 ">
								Ensuring an Ethical Investigation
							</h3>
							<hr className="mb-4 border-[#148696]" />
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="font-medium">
									Ethical. Have you reviewed all possible individuals to be
									involved in the investigation, including interpreters, and
									ensured that all are fully committed to 'do no harm' and
									maintaining worker safeguards at all times?
								</div>
								<div>
									{data.ethical_reviewed?.value === "yes"
										? "Yes"
										: data.ethical_reviewed?.value === "not_yet"
											? "No, not yet, but I will do so"
											: data.ethical_reviewed?.value === "not_necessary"
												? "No, I do not think that is necessary"
												: "-"}
								</div>
								<div className="font-medium">
									Professional. Have you ensured that responsible persons in the
									grievance process are knowledgeable, qualified, and trained to
									serve impartially in the grievance process?
								</div>
								<div>
									{data.professional_ensured?.value === "yes"
										? "Yes"
										: data.professional_ensured?.value === "not_yet"
											? "No, not yet, but I will do so"
											: data.professional_ensured?.value === "not_necessary"
												? "No, I do not think that is necessary"
												: "-"}
								</div>
								<div className="font-medium">
									Impartial. Have you ensured that responsible persons in the
									grievance process have no biases and can refrain from making
									snap judgments when hearing the perspectives of workers versus
									other worksite staff?
								</div>
								<div>
									{data.impartial_ensured?.value === "yes"
										? "Yes"
										: data.impartial_ensured?.value === "not_yet"
											? "No, not yet, but I will do so"
											: data.impartial_ensured?.value === "not_necessary"
												? "No, I do not think that is necessary"
												: "-"}
								</div>
								<div className="font-medium">
									Inclusive and Accessible. Have you identified all the
									language, gender, and literacy considerations for effective
									communication with the worker, and have you communicated with
									the worker the range of ways they can get in touch with you?
								</div>
								<div>
									{data.inclusive_and_accessible?.value === "yes"
										? "Yes"
										: data.inclusive_and_accessible?.value === "not_yet"
											? "No, not yet, but I will do so"
											: data.inclusive_and_accessible?.value === "not_necessary"
												? "No, I do not think that is necessary"
												: "-"}
								</div>
								<div className="font-medium">
									Timely and Effective. Have you established responsible
									timelines and goals for investigation and remediation that
									take into account both the interests of the business and the
									worker?
								</div>
								<div>
									{data.timely_and_effective?.value === "yes"
										? "Yes"
										: data.timely_and_effective?.value === "not_yet"
											? "No, not yet, but I will do so"
											: data.timely_and_effective?.value === "not_necessary"
												? "No, I do not think that is necessary"
												: "-"}
								</div>
								<div className="font-medium">Additional Notes</div>
								<div>{data.ethical_investigation_notes?.value || "-"}</div>
							</div>
						</section>
					)}
					{/* Step 4: Communicating with the workers */}
					{currentStep === 3 && (
						<section>
							<h3 className="text-xl font-semibold mb-2 ">
								Communicating with the workers
							</h3>
							<hr className="mb-4 border-[#148696]" />
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="font-medium">
									Throughout the investigation and upon its conclusion, have you
									stayed in touch with the worker to check on their well-being
									and whether the investigation has had any positive or negative
									impacts on them?
								</div>
								<div>
									{data.investigation_their_wellbeing?.value === "yes"
										? "Yes"
										: data.investigation_their_wellbeing?.value === "not_yet"
											? "No, not yet, but I will do so"
											: data.investigation_their_wellbeing?.value ===
													"not_necessary"
												? "No, I do not think that is necessary"
												: "-"}
								</div>
								<div className="font-medium">
									Do you need help with any more complex consequences arising
									from the worker-reported issue, such as psychosocial support
									for the worker, the need to quickly repatriate a worker, etc.?
								</div>
								<div>
									{data.need_help_with_complex_consequences === true
										? "Yes"
										: data.need_help_with_complex_consequences === false
											? "No"
											: "-"}
								</div>
								<div className="font-medium">Additional Notes</div>
								<div>{data.communication_notes?.value || "-"}</div>
							</div>
						</section>
					)}
					{/* Step 5: Monitoring and Communication */}
					{currentStep === 4 && (
						<section>
							<h3 className="text-xl font-semibold mb-2 ">
								Monitoring and Communication
							</h3>
							<hr className="mb-4 border-[#148696]" />
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="font-medium">Remediation</div>
								<div>
									{data.remediation ? data.remediation.description : "-"}
								</div>
								<div className="font-medium">
									Systems Strengthening and Continuous Improvement
								</div>
								<div>
									{data.system_strengthening
										? data.system_strengthening.description
										: "-"}
								</div>
							</div>
							{/* Trainings */}
							{data.list_of_text_fields?.remediations?.length === 0 && (
								<div className="mt-6">
									<h3 className="text-xl font-semibold mb-2 ">Trainings</h3>
									<hr className="mb-4 border-[#148696]" />
									<ul className="list-disc pl-6">
										{data.trainings?.map((training, index) => (
											<li key={index}>{training}</li>
										))}
									</ul>
								</div>
							)}
						</section>
					)}
				</div>
				{/* Footer */}
				<div className="flex justify-between items-center gap-4 px-6 py-4 border-t border-[#148696] bg-[#f7fafc]">
					<div>
						{currentStep > 0 && (
							<button
								className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200  font-medium border border-[#148696] transition"
								onClick={() => setStep(currentStep - 1)}
							>
								Back
							</button>
						)}
					</div>
					<div className="flex gap-2">
						{!isPreview && (
							<button
								className="flex items-center gap-2 px-4 py-2 rounded bg-teal hover:bg-[#0e5e5e] text-white font-medium border border-[#148696] transition"
								onClick={() => handleSubmit(false)}
							>
								<CheckIcon className="w-4 h-4" />
								Submit
							</button>
						)}
						<button
							className="flex items-center gap-2 px-4 py-2 rounded bg-gray-200 hover:bg-gray-300  font-medium border border-[#148696] transition"
							onClick={handleModalClose}
						>
							{isPreview ? (
								<Cross2Icon className="w-4 h-4" />
							) : (
								<Pencil1Icon className="w-4 h-4" />
							)}
							{isPreview ? "Close" : "Go back to edit"}
						</button>
						{currentStep < steps.length - 1 && (
							<button
								className="px-4 py-2 rounded bg-teal hover:bg-[#0e5e5e] text-white font-medium border border-[#148696] transition"
								onClick={() => setStep(currentStep + 1)}
							>
								Next
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default PreviewGrievance;
