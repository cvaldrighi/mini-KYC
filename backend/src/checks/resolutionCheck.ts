import { MIN_IMAGE_LONG_SIDE_PX, MIN_IMAGE_SHORT_SIDE_PX } from '../domain/verification';
import { readImageDimensions } from './readImageDimensions';
import type { VerificationCheck } from './types';

/**
 * Exige lado maior >= 600 px e lado menor >= 400 px. Comparar os lados (e não largura e
 * altura) faz a regra valer para fotos em retrato e paisagem, inclusive as giradas pelo
 * celular via EXIF, em que o cabeçalho traz as dimensões trocadas.
 * PDFs não têm resolução em pixels e passam direto, sem baixar o arquivo.
 */
export const resolutionCheck: VerificationCheck = {
  name: 'resolution',
  async run({ loadFile, declaredContentType }) {
    if (declaredContentType === 'application/pdf') return { outcome: 'PASS' };

    const dimensions = readImageDimensions(await loadFile(), declaredContentType);
    if (!dimensions) {
      // O tipo já foi confirmado pela checagem anterior; se o cabeçalho não pode ser lido,
      // o arquivo está corrompido. O pipeline transforma o erro em revisão manual.
      throw new Error(`Não foi possível ler as dimensões do arquivo (${declaredContentType})`);
    }

    const { width, height } = dimensions;
    const longSide = Math.max(width, height);
    const shortSide = Math.min(width, height);
    const details = { width, height };

    if (longSide < MIN_IMAGE_LONG_SIDE_PX || shortSide < MIN_IMAGE_SHORT_SIDE_PX) {
      return { outcome: 'REJECT', reason: 'LOW_RESOLUTION', details };
    }
    return { outcome: 'PASS', details };
  },
};
