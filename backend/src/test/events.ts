import type { LambdaFunctionURLEvent, S3Event } from 'aws-lambda';

/** Evento de Lambda Function URL para testes, só com o que os handlers usam. */
export function functionUrlEvent({
  method = 'GET',
  body,
  query,
}: {
  method?: string;
  body?: string;
  query?: Record<string, string>;
} = {}): LambdaFunctionURLEvent {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: '/',
    rawQueryString: new URLSearchParams(query).toString(),
    queryStringParameters: query,
    headers: { 'content-type': 'application/json' },
    body,
    isBase64Encoded: false,
    requestContext: {
      accountId: '123456789012',
      apiId: 'url-id',
      domainName: 'url-id.lambda-url.sa-east-1.on.aws',
      domainPrefix: 'url-id',
      http: { method, path: '/', protocol: 'HTTP/1.1', sourceIp: '127.0.0.1', userAgent: 'jest' },
      requestId: 'request-id',
      routeKey: '$default',
      stage: '$default',
      time: '07/Nov/2026:12:00:00 +0000',
      timeEpoch: 1_793_966_400_000,
    },
  } as LambdaFunctionURLEvent;
}

/** Evento do S3 (objeto criado) para testes. */
export function s3Event(key: string, size: number, bucket = 'mini-kyc-documents-123456789012'): S3Event {
  return {
    Records: [
      {
        eventVersion: '2.1',
        eventSource: 'aws:s3',
        awsRegion: 'sa-east-1',
        eventTime: '2026-11-07T12:00:00.000Z',
        eventName: 'ObjectCreated:Put',
        s3: { bucket: { name: bucket }, object: { key, size } },
      },
    ],
  } as unknown as S3Event;
}
