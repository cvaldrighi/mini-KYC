import type { AcceptedContentType, CheckDetails, CheckName, Reason } from '../domain/verification';

/** O que cada checagem devolve. `REJECT` e `REVIEW` sempre vêm com motivo. */
export type CheckVerdict =
  | { outcome: 'PASS'; details?: CheckDetails }
  | { outcome: 'REJECT' | 'REVIEW'; reason: Reason; details?: CheckDetails };

/** Dados que o pipeline entrega para as checagens. */
export interface CheckContext {
  verificationId: string;
  /** Tipo informado pelo cliente ao criar a verificação. */
  declaredContentType: AcceptedContentType;
  /** Tamanho informado pelo evento do S3, disponível sem baixar o arquivo. */
  sizeBytes: number;
  /**
   * Conteúdo do arquivo. Só é baixado do S3 na primeira chamada; as próximas reaproveitam.
   * Assim, a checagem de tamanho (a primeira) roda sem download nenhum.
   */
  loadFile: () => Promise<Buffer>;
}

/** Uma camada de verificação. Para adicionar uma nova (como IA), basta implementar esta interface. */
export interface VerificationCheck {
  name: CheckName;
  run(context: CheckContext): Promise<CheckVerdict>;
}
