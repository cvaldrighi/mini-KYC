/** Erro padrão de operação cancelada, igual ao que `fetch` lança com um `AbortSignal`. */
export function createAbortError(): DOMException {
  return new DOMException('Envio cancelado', 'AbortError');
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
