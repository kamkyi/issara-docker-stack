interface User {
	object: "user";
	id: string;
	email: string;
	emailVerified: boolean;
	profilePictureUrl: string | null;
	firstName: string | null;
	lastName: string | null;
	lastSignInAt: string | null;
	externalId: string | undefined;
	createdAt: string;
	updatedAt: string;
}
export interface ILMUser extends User {
	groups?: string[];
	username?: string;
	organization?: string;
	partner?: string;
	supplier?: string;
}

export type RoleMapping = {
	group: string;
	slug: string;
};
