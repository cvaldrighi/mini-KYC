import { randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Context, LambdaFunctionURLEvent } from 'aws-lambda';
import { isAcceptedContentType, type AcceptedContentType } from '../../domain/verification';
import { VerificationRepository } from '../../repositories/verificationRepository';
import { documentClient } from '../../shared/dynamo';
import { requireEnv } from '../../shared/env';
import { logger } from '../../shared/logger';
import { readBody } from '../../shared/functionUrlEvent';
import { badRequest, internalError, json, methodNotAllowed, type HttpResponse } from '../../shared/http';
import { s3Client } from '../../shared/s3';

export const UPLOAD_URL_EXPIRES_IN_SECONDS = 300;
const MAX_FILE_NAME_LENGTH = 200;

const EXTENSIONS: Record<AcceptedContentType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
};

export interface Dependencies {
  repository: Pick<VerificationRepository, 'create'>;
  /** Gera a presigned URL de PUT para a chave, vinculada ao Content-Type. */
  presignUpload: (fileKey: string, contentType: AcceptedContentType) => Promise<string>;
  generateId: () => string;
}

type ParsedRequest =
  | { ok: true; fileName: string; contentType: AcceptedContentType }
  | { ok: false; response: HttpResponse };

function parseRequest(event: LambdaFunctionURLEvent): ParsedRequest {
  let body: unknown;
  try {
    body = JSON.parse(readBody(event));
  } catch {
    return { ok: false, response: badRequest('INVALID_REQUEST') }; // corpo vazio ou que não é JSON
  }
  if (typeof body !== 'object' || body === null) return { ok: false, response: badRequest('INVALID_REQUEST') };

  const { fileName, contentType } = body as Record<string, unknown>;
  if (typeof fileName !== 'string' || !fileName.trim() || fileName.length > MAX_FILE_NAME_LENGTH) {
    return { ok: false, response: badRequest('INVALID_REQUEST') };
  }
  if (typeof contentType !== 'string') return { ok: false, response: badRequest('INVALID_REQUEST') };
  if (!isAcceptedContentType(contentType)) return { ok: false, response: badRequest('UNSUPPORTED_CONTENT_TYPE') };

  return { ok: true, fileName: fileName.trim(), contentType };
}

/**
 * POST com `{ fileName, contentType }`: cria a verificação `PENDING` e devolve a presigned URL
 * para o navegador enviar o arquivo direto ao S3. As dependências entram por parâmetro para
 * os testes não precisarem da AWS.
 */
export function createHandler({ repository, presignUpload, generateId }: Dependencies) {
  return async (event: LambdaFunctionURLEvent): Promise<HttpResponse> => {
    if (event.requestContext.http.method !== 'POST') return methodNotAllowed();

    const request = parseRequest(event);
    if (!request.ok) return request.response;

    const verificationId = generateId();
    const fileKey = `uploads/${verificationId}.${EXTENSIONS[request.contentType]}`;
    try {
      // Assina antes de gravar: se a assinatura falhar, não fica uma verificação órfã na tabela.
      const uploadUrl = await presignUpload(fileKey, request.contentType);
      await repository.create({
        verificationId,
        fileName: request.fileName,
        contentType: request.contentType,
        fileKey,
      });
      logger.info('Verificação criada', { verificationId, contentType: request.contentType });
      return json(201, { verificationId, uploadUrl, expiresIn: UPLOAD_URL_EXPIRES_IN_SECONDS });
    } catch (error) {
      logger.error('Falha ao criar a verificação', { verificationId, error });
      return internalError();
    }
  };
}

function defaultDependencies(): Dependencies {
  const bucket = requireEnv('DOCUMENTS_BUCKET');
  return {
    repository: new VerificationRepository(documentClient, requireEnv('VERIFICATIONS_TABLE')),
    presignUpload: (fileKey, contentType) =>
      getSignedUrl(s3Client, new PutObjectCommand({ Bucket: bucket, Key: fileKey, ContentType: contentType }), {
        expiresIn: UPLOAD_URL_EXPIRES_IN_SECONDS,
      }),
    generateId: randomUUID,
  };
}

let handlerWithDefaults: ReturnType<typeof createHandler> | undefined;

/** Ponto de entrada da Lambda. Monta as dependências reais na primeira invocação. */
export const handler = (event: LambdaFunctionURLEvent, context: Context) => {
  logger.addContext(context);
  handlerWithDefaults ??= createHandler(defaultDependencies());
  return handlerWithDefaults(event);
};
