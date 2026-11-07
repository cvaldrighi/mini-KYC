/**
 * Tipos e regras de domínio do backend. Os tipos que vão para a API (status, motivos,
 * checagens) espelham `frontend/src/domain/verification.ts`: mantenha os dois em sincronia.
 */

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';

export type Reason =
  | 'FILE_TOO_LARGE'
  | 'FILE_TOO_SMALL'
  | 'INVALID_FILE_TYPE'
  | 'LOW_RESOLUTION'
  | 'DUPLICATE_DOCUMENT'
  | 'SUSPECTED_EDIT'
  | 'PROCESSING_ERROR';

export type CheckName = 'size' | 'fileType' | 'resolution' | 'duplicate' | 'editSignals';

export type CheckOutcome = 'PASS' | 'REJECT' | 'REVIEW';

/** Valores medidos por cada checagem; a interface usa para explicar o resultado. */
export interface CheckDetails {
  sizeBytes?: number;
  detectedType?: string;
  width?: number;
  height?: number;
  software?: string;
}

/** Resultado de uma checagem, como fica gravado na verificação. */
export interface CheckResult {
  name: CheckName;
  outcome: CheckOutcome;
  reason?: Reason;
  durationMs: number;
  details?: CheckDetails;
}

export const ACCEPTED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;
export type AcceptedContentType = (typeof ACCEPTED_CONTENT_TYPES)[number];

export function isAcceptedContentType(value: string): value is AcceptedContentType {
  return (ACCEPTED_CONTENT_TYPES as readonly string[]).includes(value);
}

export const MIN_FILE_SIZE_BYTES = 10 * 1024;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MIN_IMAGE_LONG_SIDE_PX = 600;
export const MIN_IMAGE_SHORT_SIDE_PX = 400;

/** Status final a partir do resultado da checagem que interrompeu o pipeline (ou de nenhuma). */
export function statusFromOutcome(outcome: CheckOutcome): Exclude<VerificationStatus, 'PENDING'> {
  switch (outcome) {
    case 'PASS':
      return 'APPROVED';
    case 'REJECT':
      return 'REJECTED';
    case 'REVIEW':
      return 'MANUAL_REVIEW';
  }
}
