export type ApiErrorCode =
  | 'INVALID_REQUEST'
  | 'UNSUPPORTED_CONTENT_TYPE'
  | 'UPLOAD_FAILED'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR';

/** Erro de API com um código estável, para a interface decidir a mensagem. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ApiError';
    this.code = code;
  }
}
