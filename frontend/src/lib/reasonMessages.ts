import type { Reason } from '@/domain/verification';

/**
 * Títulos curtos dos motivos, exibidos na lista. O backend devolve só o código.
 * As explicações com os valores medidos entram na tarefa 2.9.
 */
export const REASON_TITLES: Record<Reason, string> = {
  FILE_TOO_LARGE: 'Arquivo maior que 5 MB',
  FILE_TOO_SMALL: 'Arquivo pequeno demais',
  INVALID_FILE_TYPE: 'Tipo de arquivo inválido',
  LOW_RESOLUTION: 'Resolução abaixo do mínimo',
  DUPLICATE_DOCUMENT: 'Documento duplicado',
  SUSPECTED_EDIT: 'Possível edição na imagem',
  PROCESSING_ERROR: 'Erro ao processar',
};
