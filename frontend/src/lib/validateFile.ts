import { ACCEPTED_CONTENT_TYPES, MAX_FILE_SIZE_BYTES, type AcceptedContentType } from '@/domain/verification';
import { formatFileSize } from './formatFileSize';

export type FileValidation =
  | { valid: true; contentType: AcceptedContentType }
  | { valid: false; message: string };

function isAccepted(type: string): type is AcceptedContentType {
  return (ACCEPTED_CONTENT_TYPES as readonly string[]).includes(type);
}

/**
 * Validação feita no navegador antes do envio: tipo e tamanho máximo.
 * O tamanho mínimo fica só no backend, para que essa checagem do pipeline apareça no resultado.
 */
export function validateFile(file: File): FileValidation {
  if (!isAccepted(file.type)) {
    return { valid: false, message: 'Envie um arquivo JPEG, PNG ou PDF.' };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      message: `O arquivo tem ${formatFileSize(file.size)}. O limite é 5 MB.`,
    };
  }
  return { valid: true, contentType: file.type };
}
