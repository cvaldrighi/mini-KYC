import type { AcceptedContentType, Verification } from '@/domain/verification';

/**
 * Contrato entre a interface e o backend. Há duas implementações:
 * `mockApi` (em memória, para desenvolver sem AWS) e `awsApi` (Function URLs).
 * Os componentes e hooks dependem só desta interface.
 */

export interface CreateVerificationInput {
  fileName: string;
  contentType: AcceptedContentType;
}

export interface CreateVerificationOutput {
  verificationId: string;
  uploadUrl: string;
  /** Validade da `uploadUrl`, em segundos. */
  expiresIn: number;
}

export interface ListVerificationsInput {
  limit?: number;
  cursor?: string | null;
}

export interface ListVerificationsOutput {
  items: Verification[];
  nextCursor: string | null;
}

/** Recebe o progresso do upload de 0 a 100. */
export type UploadProgressHandler = (percent: number) => void;

export interface VerificationsApi {
  createVerification(input: CreateVerificationInput): Promise<CreateVerificationOutput>;
  uploadFile(
    uploadUrl: string,
    file: File,
    options?: { onProgress?: UploadProgressHandler; signal?: AbortSignal },
  ): Promise<void>;
  listVerifications(input?: ListVerificationsInput): Promise<ListVerificationsOutput>;
}
