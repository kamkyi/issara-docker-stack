export interface ReactionCount {
	total: number;
	like: number;
	love: number;
	sad: number;
}

export interface ReactionCounts {
	comment_reaction_count: ReactionCount;
	reaction_type: string;
}

export interface PostComment {
	// You can expand this later when comments are defined
	[key: string]: any;
}

export interface ArticlePost {
	id: number;
	user: number;
	username: string;
	avatar: string | null;
	comments: PostComment[];
	reaction_counts: ReactionCounts;
	article: string;
	file: string | null; // depending on how ShuttleImage is defined
	filetype: string;
	caption: string | null;
	posted: string; // ISO timestamp
	comments_count: number;
	language: number | string; // sometimes APIs return language as numeric ID or code
	description: string | null;
}
