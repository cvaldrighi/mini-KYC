/**
 * Único lugar que lê `import.meta.env`. Nos testes, este módulo é trocado
 * por `src/test/configMock.ts` (ver `jest.config.js`), então importe sempre via `@/config`.
 */
export type ApiMode = 'mock' | 'aws';

export const config = {
  apiMode: (import.meta.env.VITE_API_MODE ?? 'mock') as ApiMode,
  createVerificationUrl: import.meta.env.VITE_CREATE_VERIFICATION_URL ?? '',
  listVerificationsUrl: import.meta.env.VITE_LIST_VERIFICATIONS_URL ?? '',
};
