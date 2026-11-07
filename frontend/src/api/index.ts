import { config } from '@/config';
import { createAwsApi } from './awsApi';
import { mockApi } from './mockApi';
import type { VerificationsApi } from './types';

/**
 * Escolhe a implementação pela variável `VITE_API_MODE`:
 * `aws` usa as Function URLs; qualquer outro valor (ou nenhum) usa o mock em memória.
 */
export function selectApi(settings: typeof config): VerificationsApi {
  if (settings.apiMode !== 'aws') return mockApi;

  if (!settings.createVerificationUrl || !settings.listVerificationsUrl) {
    throw new Error(
      'VITE_API_MODE=aws exige VITE_CREATE_VERIFICATION_URL e VITE_LIST_VERIFICATIONS_URL no .env',
    );
  }
  return createAwsApi({
    createUrl: settings.createVerificationUrl,
    listUrl: settings.listVerificationsUrl,
  });
}

/** Implementação usada pela aplicação. */
export const api: VerificationsApi = selectApi(config);
