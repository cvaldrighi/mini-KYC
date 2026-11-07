import type { Context, S3Event, S3EventRecord } from 'aws-lambda';
import { createChecks } from '../../checks';
import { lazyFile, runPipeline } from '../../checks/pipeline';
import type { VerificationCheck } from '../../checks/types';
import type { VerificationStatus } from '../../domain/verification';
import { HashRepository } from '../../repositories/hashRepository';
import { VerificationRepository } from '../../repositories/verificationRepository';
import { downloadObject } from '../../shared/downloadObject';
import { documentClient } from '../../shared/dynamo';
import { requireEnv } from '../../shared/env';
import { logger } from '../../shared/logger';
import { metrics, recordVerificationCompleted } from '../../shared/metrics';
import { s3Client } from '../../shared/s3';

/** Chaves criadas pela create-verification: uploads/<verificationId>.<extensão>. */
const UPLOAD_KEY = /^uploads\/([A-Za-z0-9-]+)\.(jpg|png|pdf)$/;

export interface Dependencies {
  repository: Pick<VerificationRepository, 'get' | 'updateIfPending'>;
  checks: readonly VerificationCheck[];
  download: (bucket: string, key: string) => Promise<Buffer>;
  /** Registra as métricas de uma verificação concluída (status e duração do pipeline). */
  recordCompleted: (status: Exclude<VerificationStatus, 'PENDING'>, durationMs: number) => void;
  now?: () => number;
}

/** As chaves chegam no evento codificadas como URL (espaço vira "+"). */
function decodeKey(rawKey: string): string {
  return decodeURIComponent(rawKey.replace(/\+/g, ' '));
}

async function processRecord(
  record: S3EventRecord,
  { repository, checks, download, recordCompleted, now = () => performance.now() }: Dependencies,
): Promise<void> {
  const bucket = record.s3.bucket.name;
  const key = decodeKey(record.s3.object.key);
  const verificationId = UPLOAD_KEY.exec(key)?.[1];
  if (!verificationId) {
    logger.warn('Objeto fora do padrão de upload; ignorado', { key });
    return;
  }

  const verification = await repository.get(verificationId);
  if (!verification) {
    logger.warn('Verificação não encontrada para o arquivo enviado', { verificationId, key });
    return;
  }
  if (verification.status !== 'PENDING') {
    // Evento repetido para uma verificação já concluída: nem roda o pipeline de novo.
    logger.info('Verificação já processada; evento ignorado', { verificationId, status: verification.status });
    return;
  }

  const startedAt = now();
  const result = await runPipeline(checks, {
    verificationId,
    declaredContentType: verification.contentType,
    sizeBytes: record.s3.object.size,
    loadFile: lazyFile(() => download(bucket, key)),
  });
  const durationMs = Math.round(now() - startedAt);

  if (result.failure) {
    logger.error('Erro inesperado numa checagem; verificação enviada para revisão manual', {
      verificationId,
      check: result.failure.check,
      error: result.failure.error,
    });
  }

  const update = await repository.updateIfPending(verificationId, {
    status: result.status,
    reason: result.reason,
    checks: result.checks,
  });
  if (update === 'ALREADY_PROCESSED') {
    // Dois eventos iguais processados ao mesmo tempo: o outro gravou primeiro. Resultado preservado.
    logger.info('Outro processamento gravou o resultado antes; nada alterado', { verificationId });
    return;
  }

  recordCompleted(result.status, durationMs);
  logger.info('Verificação concluída', {
    verificationId,
    status: result.status,
    reason: result.reason,
    durationMs,
    checks: result.checks.map(({ name, outcome, durationMs }) => ({ name, outcome, durationMs })),
  });
}

/**
 * Disparada pelo S3 quando um arquivo chega em `uploads/`. Para cada arquivo: localiza a
 * verificação, roda o pipeline (baixando o arquivo só quando uma checagem precisa) e grava
 * o resultado com escrita condicional.
 *
 * Erros de infraestrutura (DynamoDB, S3) não são capturados: a invocação falha, a Lambda tenta
 * de novo (invocação assíncrona, até 2 vezes) e o alarme de erros conta a falha. Como a gravação
 * é idempotente, reprocessar é seguro.
 */
export function createHandler(dependencies: Dependencies) {
  return async (event: S3Event): Promise<void> => {
    for (const record of event.Records) {
      await processRecord(record, dependencies);
    }
  };
}

function defaultDependencies(): Dependencies {
  return {
    repository: new VerificationRepository(documentClient, requireEnv('VERIFICATIONS_TABLE')),
    checks: createChecks({ hashes: new HashRepository(documentClient, requireEnv('DOCUMENT_HASHES_TABLE')) }),
    download: (bucket, key) => downloadObject(s3Client, bucket, key),
    recordCompleted: recordVerificationCompleted,
  };
}

let handlerWithDefaults: ReturnType<typeof createHandler> | undefined;

/** Ponto de entrada da Lambda. Monta as dependências reais na primeira invocação. */
export const handler = async (event: S3Event, context: Context) => {
  logger.addContext(context);
  handlerWithDefaults ??= createHandler(defaultDependencies());
  try {
    await handlerWithDefaults(event);
  } finally {
    // Publica as métricas guardadas mesmo se a invocação falhar.
    metrics.publishStoredMetrics();
  }
};
