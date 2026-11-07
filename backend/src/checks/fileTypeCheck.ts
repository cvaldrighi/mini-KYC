import { isAcceptedContentType } from '../domain/verification';
import { detectFileType } from './detectFileType';
import type { VerificationCheck } from './types';

/**
 * Confere o tipo real do arquivo: precisa ser JPEG, PNG ou PDF e bater com o tipo
 * declarado na criação. Um PNG enviado como JPEG também é recusado, porque a presigned
 * URL foi assinada para o tipo declarado.
 */
export const fileTypeCheck: VerificationCheck = {
  name: 'fileType',
  async run({ loadFile, declaredContentType }) {
    const detectedType = detectFileType(await loadFile());
    const details = { detectedType };
    if (!isAcceptedContentType(detectedType) || detectedType !== declaredContentType) {
      return { outcome: 'REJECT', reason: 'INVALID_FILE_TYPE', details };
    }
    return { outcome: 'PASS', details };
  },
};
