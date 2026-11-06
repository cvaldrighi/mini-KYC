/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE?: 'mock' | 'aws';
  readonly VITE_CREATE_VERIFICATION_URL?: string;
  readonly VITE_LIST_VERIFICATIONS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
