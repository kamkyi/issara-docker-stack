import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const CASCADE_API_URL = import.meta.env.VITE_APP_CASCADE_API_URL;

export interface Language {
	id: number;
	name: string;
	code?: string;
}

export const useLanguages = () =>
	useQuery({
		queryKey: ["languages"],
		queryFn: async () => {
			const { data } = await axios.get(`${CASCADE_API_URL}/languages`);
			return data?.data as Language[];
		},
	});
