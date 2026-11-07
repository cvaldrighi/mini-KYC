import { ApiError } from '@/api/errors';
import { createAbortError } from './abortError';

interface UploadOptions {
  contentType?: string;
  /** Progresso de 0 a 100. */
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/**
 * Envia um arquivo com PUT (para uma presigned URL do S3) informando o progresso.
 * Usa XMLHttpRequest porque o `fetch` não expõe o progresso do envio do corpo da requisição.
 */
export function uploadWithProgress(url: string, file: File, options: UploadOptions = {}): Promise<void> {
  const { contentType = file.type, onProgress, signal } = options;

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const xhr = new XMLHttpRequest();
    const onAbortSignal = () => xhr.abort();
    const cleanup = () => signal?.removeEventListener('abort', onAbortSignal);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.((event.loaded / event.total) * 100);
    };
    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new ApiError('UPLOAD_FAILED', `O armazenamento respondeu ${xhr.status}`));
      }
    };
    xhr.onerror = () => {
      cleanup();
      reject(new ApiError('NETWORK_ERROR'));
    };
    xhr.onabort = () => {
      cleanup();
      reject(createAbortError());
    };

    signal?.addEventListener('abort', onAbortSignal, { once: true });
    xhr.open('PUT', url);
    // Precisa ser o mesmo Content-Type usado para assinar a URL, senão o S3 recusa.
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(file);
  });
}
