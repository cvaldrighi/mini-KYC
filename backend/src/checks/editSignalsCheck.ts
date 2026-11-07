import exifr from 'exifr';
import type { VerificationCheck } from './types';

/**
 * Programas de edição de imagem. O celular também grava o campo `Software` (por exemplo
 * "iOS 17.1" ou "Android 14"), então não basta o campo existir: o valor precisa indicar um editor.
 */
const EDITING_SOFTWARE = /photoshop|lightroom|gimp|canva|affinity|pixelmator|photopea|picsart|snapseed|paint\.net/i;

export function isEditingSoftware(software: string): boolean {
  return EDITING_SOFTWARE.test(software);
}

/**
 * Lê o campo `Software` do EXIF de imagens JPEG. Se ele indicar um editor de imagem, manda
 * para revisão manual em vez de reprovar: editar não prova fraude (pode ser só um recorte),
 * mas merece um olhar humano. Sem EXIF, ou fora do JPEG, passa.
 */
export const editSignalsCheck: VerificationCheck = {
  name: 'editSignals',
  async run({ loadFile, declaredContentType }) {
    if (declaredContentType !== 'image/jpeg') return { outcome: 'PASS' };

    const metadata: { Software?: unknown } | undefined = await exifr.parse(await loadFile(), { pick: ['Software'] });
    const software = typeof metadata?.Software === 'string' ? metadata.Software.trim() : '';

    if (software && isEditingSoftware(software)) {
      return { outcome: 'REVIEW', reason: 'SUSPECTED_EDIT', details: { software } };
    }
    return { outcome: 'PASS' };
  },
};
