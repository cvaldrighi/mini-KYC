import { MAX_FILE_SIZE_BYTES, MIN_FILE_SIZE_BYTES } from '../domain/verification';
import type { VerificationCheck } from './types';

/** Primeira checagem: usa o tamanho do evento do S3, sem baixar o arquivo. */
export const sizeCheck: VerificationCheck = {
  name: 'size',
  async run({ sizeBytes }) {
    const details = { sizeBytes };
    if (sizeBytes > MAX_FILE_SIZE_BYTES) return { outcome: 'REJECT', reason: 'FILE_TOO_LARGE', details };
    if (sizeBytes < MIN_FILE_SIZE_BYTES) return { outcome: 'REJECT', reason: 'FILE_TOO_SMALL', details };
    return { outcome: 'PASS', details };
  },
};
