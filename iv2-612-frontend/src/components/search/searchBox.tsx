import { useEffect, useState } from "react";
import type { SearchBoxProps } from "$src/types/components";

const SearchBox = (props: SearchBoxProps) => {
	const {
		onSearch,
		placeholder = "Search...",
		debounceMs = 1000,
		value = "",
	} = props;

	const [searchQuery, setSearchQuery] = useState(value);

	// Debounce search
	useEffect(() => {
		const timer = setTimeout(() => {
			if (onSearch) {
				onSearch(searchQuery);
			}
		}, debounceMs);

		return () => clearTimeout(timer);
	}, [searchQuery, debounceMs, onSearch]);

	// Update local state when external value changes
	useEffect(() => {
		setSearchQuery(value);
	}, [value]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (onSearch) {
			onSearch(searchQuery);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(e.target.value);
	};

	return (
		<form onSubmit={handleSubmit}>
			<label className="mb-2 text-sm font-medium sr-only" htmlFor="search">
				Search
			</label>
			<div className="relative">
				<div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
					<svg
						aria-hidden="true"
						className="w-4 h-4 text-gray-500 dark:text-gray-400"
						fill="none"
						viewBox="0 0 20 20"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
						/>
					</svg>
				</div>
				<input
					className="block w-full p-2 ps-10 text-sm border-1 border-[#1FA3B8] focus:outline-none rounded-md h-[40px]"
					id={"search"}
					onChange={handleInputChange}
					placeholder={placeholder}
					type="search"
					value={searchQuery}
				/>
				{/* <button 
                    type="submit"
                    className="absolute end-[6px] bottom-[6px] font-medium rounded-xs text-sm px-4 py-1 bg-[#148696] text-white cursor-pointer hover:bg-[#0f6b78] transition-colors"
                >
                    Search
                </button> */}
			</div>
		</form>
	);
};

export default SearchBox;
