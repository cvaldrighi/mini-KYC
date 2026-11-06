/**
 * Tipos de domínio compartilhados pela interface. Espelham o que o backend devolve
 * na listagem (ver openspec/changes/add-mini-kyc-mvp/specs/verification-query).
 */

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';

/** Motivo de um resultado diferente de aprovado. O texto exibido fica no frontend. */
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

/** Valores medidos por cada checagem, usados para explicar o resultado. */
export interface CheckDetails {
  sizeBytes?: number;
  detectedType?: string;
  width?: number;
  height?: number;
  software?: string;
}

export interface CheckResult {
  name: CheckName;
  outcome: CheckOutcome;
  reason?: Reason;
  durationMs: number;
  details?: CheckDetails;
}

export interface Verification {
  verificationId: string;
  fileName: string;
  status: VerificationStatus;
  /** Datas em ISO 8601. */
  createdAt: string;
  updatedAt: string;
  reason?: Reason;
  /** Checagens executadas, na ordem. Ausente enquanto `PENDING`. */
  checks?: CheckResult[];
}

/** Ordem em que o pipeline executa as checagens. */
export const CHECK_ORDER: readonly CheckName[] = [
  'size',
  'fileType',
  'resolution',
  'duplicate',
  'editSignals',
];

export const ACCEPTED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;
export type AcceptedContentType = (typeof ACCEPTED_CONTENT_TYPES)[number];

export const MIN_FILE_SIZE_BYTES = 10 * 1024;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
