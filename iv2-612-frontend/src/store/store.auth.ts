import { create } from "zustand";
import { persist } from "zustand/middleware";

type State = {
	role: string | null;
	session: string | null;
};

type Action = {
	setRole: (role: string | null) => void;
	setSession: (session: string | null) => void;
	clearAuth: () => void;
};

const useAuthData = create<State & Action>()(
	persist(
		(set) => ({
			role: null,
			session: null,
			setRole: (role) => set({ role }),
			setSession: (session) => set({ session }),
			clearAuth: () => set({ role: null, session: null }),
		}),
		{
			name: "auth-storage",
		},
	),
);

export default useAuthData;
