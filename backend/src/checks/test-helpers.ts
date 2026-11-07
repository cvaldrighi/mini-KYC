import type { AcceptedContentType } from '../domain/verification';
import type { CheckContext } from './types';

/** Contexto de checagem para testes, com o arquivo já em memória. */
export function makeContext(file: Buffer, overrides: Partial<CheckContext> = {}): CheckContext {
  return {
    verificationId: 'v1',
    declaredContentType: 'image/jpeg' satisfies AcceptedContentType,
    sizeBytes: file.length,
    loadFile: jest.fn().mockResolvedValue(file),
    ...overrides,
  };
}
