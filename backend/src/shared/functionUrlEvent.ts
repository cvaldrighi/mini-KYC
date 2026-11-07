import type { LambdaFunctionURLEvent } from 'aws-lambda';

/** Corpo da requisição como texto. A Function URL manda em base64 quando o conteúdo não é texto. */
export function readBody(event: LambdaFunctionURLEvent): string {
  if (!event.body) return '';
  return event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
}
