import {
  MAX_FILE_SIZE_BYTES,
  MIN_FILE_SIZE_BYTES,
  MIN_IMAGE_LONG_SIDE_PX,
  MIN_IMAGE_SHORT_SIDE_PX,
  type CheckDetails,
  type CheckResult,
  type Reason,
} from '@/domain/verification';
import { formatFileSize } from './formatFileSize';

/**
 * Textos dos motivos. O backend devolve só o código do motivo e os valores medidos
 * (`details`); a interface monta a frase. Assim, mudar um texto não exige deploy do backend.
 */

/** Títulos curtos, exibidos na lista. */
export const REASON_TITLES: Record<Reason, string> = {
  FILE_TOO_LARGE: 'Arquivo maior que 5 MB',
  FILE_TOO_SMALL: 'Arquivo pequeno demais',
  INVALID_FILE_TYPE: 'Tipo de arquivo inválido',
  LOW_RESOLUTION: 'Resolução abaixo do mínimo',
  DUPLICATE_DOCUMENT: 'Documento duplicado',
  SUSPECTED_EDIT: 'Possível edição na imagem',
  PROCESSING_ERROR: 'Erro ao processar',
};

const MIN_RESOLUTION = `${MIN_IMAGE_LONG_SIDE_PX} × ${MIN_IMAGE_SHORT_SIDE_PX}`;

/** Explicação do que aconteceu e do que fazer, usando os valores medidos quando existem. */
const EXPLANATIONS: Record<Reason, (details: CheckDetails) => string> = {
  FILE_TOO_LARGE: ({ sizeBytes }) =>
    sizeBytes
      ? `O arquivo tem ${formatFileSize(sizeBytes)}. O limite é ${formatFileSize(MAX_FILE_SIZE_BYTES)}. Envie uma foto com menos resolução ou um PDF menor.`
      : `O arquivo passa do limite de ${formatFileSize(MAX_FILE_SIZE_BYTES)}. Envie uma foto com menos resolução ou um PDF menor.`,
  FILE_TOO_SMALL: ({ sizeBytes }) =>
    sizeBytes
      ? `O arquivo tem ${formatFileSize(sizeBytes)}, abaixo do mínimo de ${formatFileSize(MIN_FILE_SIZE_BYTES)}. Arquivos tão pequenos costumam ficar ilegíveis. Envie uma foto com mais qualidade.`
      : `O arquivo está abaixo do mínimo de ${formatFileSize(MIN_FILE_SIZE_BYTES)}. Envie uma foto com mais qualidade.`,
  INVALID_FILE_TYPE: () =>
    'O conteúdo do arquivo não é JPEG, PNG nem PDF, mesmo que o nome diga o contrário. Envie a foto ou o PDF original do documento.',
  LOW_RESOLUTION: ({ width, height }) =>
    width && height
      ? `A imagem tem ${width} × ${height} pixels. O mínimo é ${MIN_RESOLUTION}. Envie uma foto mais nítida, com o documento ocupando a maior parte da imagem.`
      : `A imagem tem menos de ${MIN_RESOLUTION} pixels. Envie uma foto mais nítida, com o documento ocupando a maior parte da imagem.`,
  DUPLICATE_DOCUMENT: () =>
    'Este mesmo arquivo já foi enviado em outra verificação. Tire uma foto nova do documento e envie de novo.',
  SUSPECTED_EDIT: ({ software }) =>
    software
      ? `A imagem tem marcas de edição (${software}). Ela vai passar por uma revisão manual.`
      : 'A imagem tem marcas de edição. Ela vai passar por uma revisão manual.',
  PROCESSING_ERROR: () =>
    'Não foi possível concluir as checagens automáticas. A verificação vai passar por uma revisão manual.',
};

export interface ReasonMessage {
  title: string;
  explanation: string;
}

/** Título e explicação de um motivo, buscando os valores medidos na checagem que o gerou. */
export function getReasonMessage(reason: Reason, checks: CheckResult[] = []): ReasonMessage {
  const details = checks.find((check) => check.reason === reason)?.details ?? {};
  return { title: REASON_TITLES[reason], explanation: EXPLANATIONS[reason](details) };
}
