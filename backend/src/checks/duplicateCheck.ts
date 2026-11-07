import { createHash } from 'node:crypto';
import type { HashRepository } from '../repositories/hashRepository';
import type { VerificationCheck } from './types';

export function sha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Reprova o mesmo arquivo enviado em outra verificação: reenviar a mesma imagem é um sinal
 * clássico de fraude. Recebe o repositório pronto (injeção de dependência), o que mantém
 * a checagem testável sem DynamoDB.
 */
export function createDuplicateCheck(hashes: Pick<HashRepository, 'claim'>): VerificationCheck {
  return {
    name: 'duplicate',
    async run({ loadFile, verificationId }) {
      const result = await hashes.claim(sha256(await loadFile()), verificationId);
      if (result === 'DUPLICATE') return { outcome: 'REJECT', reason: 'DUPLICATE_DOCUMENT' };
      return { outcome: 'PASS' };
    },
  };
}
