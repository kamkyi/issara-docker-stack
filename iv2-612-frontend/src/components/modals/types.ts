export interface CommentType {
	user: {
		username: string;
	};
	body: string;
	date: string;
	child_comments: Comment[];
}
