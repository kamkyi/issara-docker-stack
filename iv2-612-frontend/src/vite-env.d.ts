/// <reference types="vite/client" />

declare module "*.pdf" {
	const src: string;
	export default src;
}

interface ImportMetaEnv {
	readonly VITE_APP_ENVIRONMENT: "local" | "staging" | "production";
	readonly VITE_CLIENT_VERSION: string;
	readonly VITE_API_BASE_URL: string;
	readonly VITE_APP_API_URL: string;
	readonly VITE_APP_API_ADMIN_URL: string;
	readonly VITE_CASCADE_API_URL: string;
	readonly VITE_FLAGSMITH_ENVIRONMENT: string;
	readonly VITE_APP_GOOGLE_GEOCODE_API_KEY: string;
	readonly VITE_APP_GD_API_URL: string;
	readonly VITE_APP_GD_API_V1_URL: string;
	readonly VITE_APP_GD_LITE_DEEP_LINK_PREFIX?: string;
	readonly VITE_APP_CASCADE_API_URL: string;
	readonly VITE_CASCADE_MESSAGE_BOARD_POSTS_PATH?: string;
	readonly VITE_CASCADE_MEDIA_BASE_URL: string;
	readonly VITE_APP_AUTHKIT_CLIENT_ID: string;
	readonly VITE_APP_AUTHKIT_REDIRECT_URI: string;
	readonly VITE_APP_AUTHKIT_URL: string;
	readonly VITE_CLAUDE_API_KEY: string;
	readonly VITE_APP_AUTHKIT_API_KEY: string;
	readonly VITE_APP_AUTHKIT_ORG_ID: string;
	readonly VITE_APP_AUTHKIT_API_MEMBERSHIPS_ENDPOINT: string;
	readonly VITE_APP_API_GATEWAY_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
