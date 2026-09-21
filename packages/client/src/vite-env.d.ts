/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

interface Window {
	__E2E_USER__?: import("@level-up/shared").AppUser;
}
