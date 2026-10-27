import { Container } from "@radix-ui/themes";
import { useId, useState } from "react";

export const CONTACT_SECTION_ID = "contact";

type FormState = "idle" | "loading" | "success" | "error";

export function ContactSection() {
	const nameId = useId();
	const emailId = useId();
	const subjectId = useId();
	const messageId = useId();

	const [form, setForm] = useState({
		username: "",
		email: "",
		subject: "",
		message: "",
	});
	const [status, setStatus] = useState<FormState>("idle");
	const [errorMsg, setErrorMsg] = useState("");

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setStatus("loading");
		setErrorMsg("");

		try {
			const apiBase = (import.meta.env as any).VITE_APP_CASCADE_API_URL || "";

			const res = await fetch(`${apiBase}/contact`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(form),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data?.message ?? "Something went wrong");
			}

			setStatus("success");
			setForm({ username: "", email: "", subject: "", message: "" });
		} catch (err) {
			setStatus("error");
			setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
		}
	};

	return (
		<section
			className="w-full py-16 md:py-24 bg-gray-50"
			id={CONTACT_SECTION_ID}
		>
			<Container size="2">
				{/* Heading */}
				<div className="text-center mb-12">
					<h2 className="text-3xl md:text-5xl font-bold text-[#148696] mb-4">
						We'd love to hear from you
					</h2>
					<p className="text-gray-500 text-lg md:text-xl">
						Reach out to learn more about CASCADE or get support.
					</p>
				</div>

				{/* Card */}
				<div className="bg-white rounded-md p-8 md:p-12 shadow-sm">
					{status === "success" ? (
						<div className="text-center py-12">
							<div className="text-5xl mb-4">✅</div>
							<h3 className="text-2xl font-semibold text-[#148696] mb-2">
								Message sent!
							</h3>
							<p className="text-gray-500">
								We'll get back to you as soon as possible.
							</p>
							<button
								className="mt-6 text-[#148696] underline text-sm"
								onClick={() => setStatus("idle")}
								type="button"
							>
								Send another message
							</button>
						</div>
					) : (
						<form
							className="grid grid-cols-1 md:grid-cols-2 gap-6"
							onSubmit={handleSubmit}
						>
							{/* Name */}
							<div className="flex flex-col gap-1">
								<label
									className="text-md font-medium text-gray-700"
									htmlFor={nameId}
								>
									Name <span className="text-red-400">*</span>
								</label>
								<input
									className="rounded-md border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]/40 transition"
									id={nameId}
									name="username"
									onChange={handleChange}
									placeholder="Your full name"
									required
									type="text"
									value={form.username}
								/>
							</div>

							{/* Email */}
							<div className="flex flex-col gap-1">
								<label
									className="text-sm font-medium text-gray-700"
									htmlFor={emailId}
								>
									Email <span className="text-red-400">*</span>
								</label>
								<input
									className="rounded-md border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]/40 transition"
									id={emailId}
									name="email"
									onChange={handleChange}
									placeholder="you@example.com"
									required
									type="email"
									value={form.email}
								/>
							</div>

							{/* Subject — full width */}
							<div className="flex flex-col gap-1 md:col-span-2">
								<label
									className="text-sm font-medium text-gray-700"
									htmlFor={subjectId}
								>
									Subject
								</label>
								<input
									className="rounded-md border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]/40 transition"
									id={subjectId}
									name="subject"
									onChange={handleChange}
									placeholder="What's this about?"
									type="text"
									value={form.subject}
								/>
							</div>

							{/* Message — full width */}
							<div className="flex flex-col gap-1 md:col-span-2">
								<label
									className="text-sm font-medium text-gray-700"
									htmlFor={messageId}
								>
									Message <span className="text-red-400">*</span>
								</label>
								<textarea
									className="rounded-md border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]/40 transition resize-none"
									id={messageId}
									name="message"
									onChange={handleChange}
									placeholder="Tell us how we can help…"
									required
									rows={5}
									value={form.message}
								/>
							</div>

							{/* Error */}
							{status === "error" && (
								<p className="md:col-span-2 text-sm text-red-500">{errorMsg}</p>
							)}

							{/* Submit */}
							<div className="md:col-span-2 flex justify-end">
								<button
									className="bg-[#148696] hover:bg-[#0f6b78] text-white font-semibold px-8 py-3 rounded-md transition disabled:opacity-60 disabled:cursor-not-allowed"
									disabled={status === "loading"}
									type="submit"
								>
									{status === "loading" ? "Sending…" : "Send message"}
								</button>
							</div>
						</form>
					)}
				</div>
			</Container>
		</section>
	);
}

export default ContactSection;
