import type { HashRepository } from '../repositories/hashRepository';
import { createDuplicateCheck } from './duplicate/duplicateCheck';
import { editSignalsCheck } from './edit-signals/editSignalsCheck';
import { fileTypeCheck } from './file-type/fileTypeCheck';
import { resolutionCheck } from './resolution/resolutionCheck';
import { sizeCheck } from './size/sizeCheck';
import type { VerificationCheck } from './core/types';

/**
 * API pública do módulo de checagens. Quem está fora de `checks/` importa só daqui;
 * a organização interna (core/ e uma pasta por checagem) pode mudar sem afetar quem consome.
 */
export { FileDownloadError, lazyFile, runPipeline, type PipelineResult } from './core/pipeline';
export type { CheckContext, CheckVerdict, VerificationCheck } from './core/types';

/**
 * Ordem do pipeline: das checagens mais baratas para as mais caras. Tamanho não baixa nada;
 * tipo, resolução e edição só leem o arquivo; duplicidade escreve no banco. A duplicidade vem
 * antes da edição para que um arquivo repetido seja reprovado mesmo que também esteja editado.
 * Uma nova camada (como IA) entra no fim desta lista.
 */
export function createChecks({ hashes }: { hashes: Pick<HashRepository, 'claim'> }): VerificationCheck[] {
  return [sizeCheck, fileTypeCheck, resolutionCheck, createDuplicateCheck(hashes), editSignalsCheck];
}
