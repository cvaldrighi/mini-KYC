import { mockApi } from './mockApi';
import type { VerificationsApi } from './types';

/**
 * Implementação usada pela aplicação. Por enquanto, sempre o mock;
 * na tarefa 2.13, a escolha passa a vir de `VITE_API_MODE`.
 */
export const api: VerificationsApi = mockApi;
