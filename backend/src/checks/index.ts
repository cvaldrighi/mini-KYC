import type { HashRepository } from '../repositories/hashRepository';
import { createDuplicateCheck } from './duplicateCheck';
import { editSignalsCheck } from './editSignalsCheck';
import { fileTypeCheck } from './fileTypeCheck';
import { resolutionCheck } from './resolutionCheck';
import { sizeCheck } from './sizeCheck';
import type { VerificationCheck } from './types';

/**
 * Ordem do pipeline: das checagens mais baratas para as mais caras. Tamanho não baixa nada;
 * tipo, resolução e edição só leem o arquivo; duplicidade escreve no banco. A duplicidade vem
 * antes da edição para que um arquivo repetido seja reprovado mesmo que também esteja editado.
 * Uma nova camada (como IA) entra no fim desta lista.
 */
export function createChecks({ hashes }: { hashes: Pick<HashRepository, 'claim'> }): VerificationCheck[] {
  return [sizeCheck, fileTypeCheck, resolutionCheck, createDuplicateCheck(hashes), editSignalsCheck];
}
