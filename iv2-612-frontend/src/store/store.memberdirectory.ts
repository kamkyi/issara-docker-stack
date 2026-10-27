import { create } from "zustand";

type State = {
	bannerImg: string;
};

type Action = {
	updateBannerImg: (url: string) => void;
};

const useMemberdirectory = create<State & Action>((set) => ({
	bannerImg: "",
	updateBannerImg: (url) => set({ bannerImg: url }),
}));

export default useMemberdirectory;
