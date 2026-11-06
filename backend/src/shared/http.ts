import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export type ErrorCode = 'INVALID_REQUEST' | 'UNSUPPORTED_CONTENT_TYPE';

/**
 * Resposta HTTP de uma Lambda Function URL.
 * Usamos o formato estruturado (sempre objeto), e não `LambdaFunctionURLResult`,
 * que também aceita `string` e obrigaria a checar o tipo antes de ler `statusCode`.
 */
export type HttpResponse = APIGatewayProxyStructuredResultV2;

export function json(statusCode: number, body: unknown): HttpResponse {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function badRequest(error: ErrorCode): HttpResponse {
  return json(400, { error });
}
