import type { Context, LambdaFunctionURLEvent } from 'aws-lambda';
import { InvalidCursorError } from '../../repositories/cursor';
import { VerificationRepository, type VerificationRecord } from '../../repositories/verificationRepository';
import { documentClient } from '../../shared/dynamo';
import { requireEnv } from '../../shared/env';
import { logger } from '../../shared/logger';
import { badRequest, internalError, json, methodNotAllowed, type HttpResponse } from '../../shared/http';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export interface Dependencies {
  repository: Pick<VerificationRepository, 'listByCreatedAt'>;
}

/** O que vai para a API: sem a chave do arquivo no S3 nem os atributos internos da tabela. */
export function toApiItem(record: VerificationRecord) {
  const { verificationId, fileName, status, reason, checks, createdAt, updatedAt } = record;
  return { verificationId, fileName, status, reason, checks, createdAt, updatedAt };
}

/** `limit` opcional, inteiro de 1 a 50. Devolve `null` se for inválido. */
function parseLimit(value: string | undefined): number | null {
  if (value === undefined) return DEFAULT_LIMIT;
  if (!/^\d+$/.test(value)) return null;
  const limit = Number(value);
  return limit >= 1 && limit <= MAX_LIMIT ? limit : null;
}

/** GET com `?limit=` e `?cursor=` opcionais: uma página de verificações, das mais recentes para as mais antigas. */
export function createHandler({ repository }: Dependencies) {
  return async (event: LambdaFunctionURLEvent): Promise<HttpResponse> => {
    if (event.requestContext.http.method !== 'GET') return methodNotAllowed();

    const limit = parseLimit(event.queryStringParameters?.limit);
    if (limit === null) return badRequest('INVALID_REQUEST');

    try {
      const page = await repository.listByCreatedAt({ limit, cursor: event.queryStringParameters?.cursor });
      return json(200, { items: page.items.map(toApiItem), nextCursor: page.nextCursor });
    } catch (error) {
      if (error instanceof InvalidCursorError) return badRequest('INVALID_REQUEST');
      logger.error('Falha ao listar as verificações', { error });
      return internalError();
    }
  };
}

let handlerWithDefaults: ReturnType<typeof createHandler> | undefined;

/** Ponto de entrada da Lambda. Monta as dependências reais na primeira invocação. */
export const handler = (event: LambdaFunctionURLEvent, context: Context) => {
  logger.addContext(context);
  handlerWithDefaults ??= createHandler({
    repository: new VerificationRepository(documentClient, requireEnv('VERIFICATIONS_TABLE')),
  });
  return handlerWithDefaults(event);
};
