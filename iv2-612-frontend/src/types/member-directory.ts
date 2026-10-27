// Member Directory Component Types

export interface MemberDirectoryListCardProps {
	member: {
		id: number;
		name: string;
		type: string;
		country: string;
		industry: string;
		logo?: string;
		rating?: number;
	};
	onClick?: () => void;
}

export interface MemberDirectoryCardProps {
	member: {
		id: number;
		name: string;
		description?: string;
		logo?: string;
		coverImage?: string;
		rating?: number;
		verified?: boolean;
	};
	onViewDetails?: () => void;
}

export interface ServiceInformationProps {
	services: Array<{
		id: number;
		name: string;
		description: string;
		price?: string;
	}>;
}

export interface CompanyDescriptionProps {
	description: string;
	shortDescription?: string;
}

export interface VerificationProps {
	verified: boolean;
	verificationDate?: string;
	verifiedBy?: string;
}

export interface OverallRatingsProps {
	rating: number;
	totalReviews: number;
	breakdown?: {
		5: number;
		4: number;
		3: number;
		2: number;
		1: number;
	};
}

export interface ContactInformationProps {
	email?: string;
	phone?: string;
	website?: string;
	address?: string;
}

export interface GeneralInformationProps {
	companyName: string;
	industry: string;
	country: string;
	establishedYear?: number;
	employeeCount?: string;
}

export interface ProductCardProps {
	product: {
		id: number;
		name: string;
		description?: string;
		image?: string;
		category?: string;
	};
	onClick?: () => void;
}

export interface CertificateCardProps {
	certificate: {
		id: number;
		name: string;
		issuer: string;
		issueDate: string;
		expiryDate?: string;
		image?: string;
	};
	onClick?: () => void;
}
