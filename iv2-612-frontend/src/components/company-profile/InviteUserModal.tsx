import { Cross2Icon } from "@radix-ui/react-icons";
import { useEffect, useId, useState } from "react";
import CascadeButton from "$src/components/button/button";

export interface InviteUserFormValues {
	name: string;
	email: string;
	role: string;
}

interface InviteUserModalProps {
	open: boolean;
	onClose: () => void;
	onInvite: (values: InviteUserFormValues) => void;
}

const roleOptions = ["Company Admin", "Compliance Manager", "Editor", "Viewer"];

const InviteUserModal = ({ open, onClose, onInvite }: InviteUserModalProps) => {
	const nameInputId = useId();
	const emailInputId = useId();
	const roleInputId = useId();

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [role, setRole] = useState(roleOptions[3]);
	const [touched, setTouched] = useState(false);

	useEffect(() => {
		if (!open) {
			setName("");
			setEmail("");
			setRole(roleOptions[3]);
			setTouched(false);
		}
	}, [open]);

	if (!open) return null;

	const trimmedName = name.trim();
	const trimmedEmail = email.trim();
	const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
	const hasError = touched && (!trimmedName || !isValidEmail || !role);

	const handleInvite = () => {
		setTouched(true);
		if (!trimmedName || !isValidEmail || !role) return;

		onInvite({
			name: trimmedName,
			email: trimmedEmail,
			role,
		});
		onClose();
	};

	return (
		<div
			aria-modal="true"
			className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.55)] p-4"
			role="dialog"
		>
			<div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl">
				<div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
					<h3 className="text-lg font-black text-[#004A60]">Invite User</h3>
					<button
						aria-label="Close invite user modal"
						className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
						onClick={onClose}
						type="button"
					>
						<Cross2Icon className="h-4 w-4" />
					</button>
				</div>

				<div className="space-y-4 px-5 py-4">
					<div>
						<label
							className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#148696]"
							htmlFor={nameInputId}
						>
							Full Name
						</label>
						<input
							className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#148696] focus:ring-2 focus:ring-[#148696]/30"
							id={nameInputId}
							onChange={(e) => setName(e.target.value)}
							placeholder="Enter full name"
							type="text"
							value={name}
						/>
					</div>

					<div>
						<label
							className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#148696]"
							htmlFor={emailInputId}
						>
							Email Address
						</label>
						<input
							className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#148696] focus:ring-2 focus:ring-[#148696]/30"
							id={emailInputId}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="name@company.com"
							type="email"
							value={email}
						/>
					</div>

					<div>
						<label
							className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#148696]"
							htmlFor={roleInputId}
						>
							Role
						</label>
						<select
							className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#148696] focus:ring-2 focus:ring-[#148696]/30"
							id={roleInputId}
							onChange={(e) => setRole(e.target.value)}
							value={role}
						>
							{roleOptions.map((option) => (
								<option key={option} value={option}>
									{option}
								</option>
							))}
						</select>
					</div>

					{hasError && (
						<p className="text-xs text-red-600">
							Please provide a valid name, email, and role before inviting.
						</p>
					)}
				</div>

				<div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
					<CascadeButton
						buttonText="Cancel"
						className="rounded-lg"
						color="transparent"
						handleOnClick={onClose}
						size="1"
						variant="outline"
					/>
					<CascadeButton
						buttonText="Send Invite"
						className="rounded-lg"
						handleOnClick={handleInvite}
						size="1"
					/>
				</div>
			</div>
		</div>
	);
};

export default InviteUserModal;
