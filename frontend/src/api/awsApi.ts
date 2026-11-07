import { isAbortError } from '@/lib/abortError';
import { uploadWithProgress } from '@/lib/uploadWithProgress';
import { ApiError } from './errors';
import type { CreateVerificationOutput, ListVerificationsOutput, VerificationsApi } from './types';

/** O mínimo de `fetch` que usamos; nos testes, é substituído por uma função falsa. */
export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

interface AwsApiOptions {
  /** Function URL da Lambda create-verification. */
  createUrl: string;
  /** Function URL da Lambda list-verifications. */
  listUrl: string;
  fetchImpl?: FetchLike;
}

/** Transforma uma resposta de erro do backend (`{ "error": "..." }`) em `ApiError`. */
async function toApiError(response: Pick<Response, 'status' | 'json'>): Promise<ApiError> {
  let code: unknown;
  try {
    code = ((await response.json()) as { error?: unknown }).error;
  } catch {
    code = undefined; // Corpo vazio ou que não é JSON: trata como erro genérico do servidor.
  }
  if (code === 'INVALID_REQUEST' || code === 'UNSUPPORTED_CONTENT_TYPE') {
    return new ApiError(code);
  }
  return new ApiError('SERVER_ERROR', `O servidor respondeu ${response.status}`);
}

async function requestJson<T>(fetchImpl: FetchLike, url: string, init?: RequestInit): Promise<T> {
  let response: Awaited<ReturnType<FetchLike>>;
  try {
    response = await fetchImpl(url, init);
  } catch (error) {
    if (isAbortError(error)) throw error;
    // O fetch só rejeita quando a requisição nem chega ao servidor (sem rede, DNS, CORS).
    throw new ApiError('NETWORK_ERROR', error instanceof Error ? error.message : undefined);
  }
  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as T;
}

/**
 * Implementação real da `VerificationsApi`: duas Lambda Function URLs para criar e listar,
 * e o upload direto para o S3 pela presigned URL.
 */
export function createAwsApi({
  createUrl,
  listUrl,
  fetchImpl = (input, init) => fetch(input, init),
}: AwsApiOptions): VerificationsApi {
  return {
    createVerification(input) {
      return requestJson<CreateVerificationOutput>(fetchImpl, createUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
    },

    uploadFile(uploadUrl, file, { onProgress, signal } = {}) {
      return uploadWithProgress(uploadUrl, file, { onProgress, signal });
    },

    listVerifications({ limit, cursor } = {}) {
      const url = new URL(listUrl);
      if (limit !== undefined) url.searchParams.set('limit', String(limit));
      if (cursor) url.searchParams.set('cursor', cursor);
      return requestJson<ListVerificationsOutput>(fetchImpl, url.toString());
    },
  };
}
