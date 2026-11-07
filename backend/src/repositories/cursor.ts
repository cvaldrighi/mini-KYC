/**
 * Cursor de paginação: a `LastEvaluatedKey` do DynamoDB serializada em JSON e codificada
 * em base64url. Para o cliente é um valor opaco: ele só devolve o que recebeu.
 */

/** Atributos que podem aparecer na chave de uma página do GSI `byCreatedAt`. */
const KEY_ATTRIBUTES = new Set(['verificationId', 'entityType', 'createdAt']);

export class InvalidCursorError extends Error {
  constructor() {
    super('Cursor de paginação inválido');
    this.name = 'InvalidCursorError';
  }
}

export function encodeCursor(key: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(key)).toString('base64url');
}

/**
 * Decodifica e valida o cursor. Como ele vem do cliente, não confiamos no conteúdo:
 * aceitamos só um objeto com os atributos da chave, todos texto. Qualquer outra coisa
 * vira `InvalidCursorError`, que o handler transforma em 400.
 */
export function decodeCursor(cursor: string): Record<string, string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new InvalidCursorError();
  }

  const isValidKey =
    typeof parsed === 'object' &&
    parsed !== null &&
    !Array.isArray(parsed) &&
    Object.keys(parsed).length > 0 &&
    Object.entries(parsed).every(([name, value]) => KEY_ATTRIBUTES.has(name) && typeof value === 'string');

  if (!isValidKey) throw new InvalidCursorError();
  return parsed as Record<string, string>;
}
