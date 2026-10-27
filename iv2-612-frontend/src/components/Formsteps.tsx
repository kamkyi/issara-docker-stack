import type React from "react";
import { useState } from "react";

const Formsteps: React.FC = () => {
	const [step, setStep] = useState(1);

	const handleNextStep = () => {
		setStep((prevStep) => prevStep + 1);
	};

	const handlePreviousStep = () => {
		setStep((prevStep) => prevStep - 1);
	};

	return (
		<div>
			<h1>Form Steps</h1>
			<div>
				{step === 1 && <div>Step 1 Content</div>}
				{step === 2 && <div>Step 2 Content</div>}
				{step === 3 && <div>Step 3 Content</div>}
				{step === 4 && <div>Step 4 Content</div>}
				{step === 5 && <div>Step 5 Content</div>}
			</div>
			<div>
				{step > 1 && <button onClick={handlePreviousStep}>Previous</button>}
				{step < 5 && <button onClick={handleNextStep}>Next</button>}
			</div>
		</div>
	);
};

export default Formsteps;
