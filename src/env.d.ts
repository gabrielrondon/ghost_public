/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_II_URL: string;
  readonly VITE_MOCK_BACKEND: string;
  readonly VITE_IC_HOST: string;
  readonly VITE_GHOST_CANISTER_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
