import { ApiError } from '@/api/errors';
import { uploadWithProgress } from './uploadWithProgress';

/** XMLHttpRequest falso: o teste dispara os eventos manualmente. */
class FakeXhr {
  static last: FakeXhr;
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  status = 0;
  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: unknown;

  constructor() {
    FakeXhr.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: unknown) {
    this.body = body;
  }
  abort() {
    this.onabort?.();
  }
  progress(loaded: number, total: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total } as ProgressEvent);
  }
  respond(status: number) {
    this.status = status;
    this.onload?.();
  }
}

const originalXhr = globalThis.XMLHttpRequest;
const file = new File(['conteúdo'], 'cnh.jpg', { type: 'image/jpeg' });

beforeEach(() => {
  globalThis.XMLHttpRequest = FakeXhr as unknown as typeof XMLHttpRequest;
});

afterEach(() => {
  globalThis.XMLHttpRequest = originalXhr;
});

describe('uploadWithProgress', () => {
  it('envia com PUT e o Content-Type do arquivo, informando o progresso', async () => {
    const progress: number[] = [];
    const upload = uploadWithProgress('https://s3.test/upload', file, { onProgress: (p) => progress.push(p) });

    const xhr = FakeXhr.last;
    xhr.progress(25, 100);
    xhr.progress(75, 100);
    xhr.respond(200);
    await upload;

    expect(xhr.method).toBe('PUT');
    expect(xhr.url).toBe('https://s3.test/upload');
    expect(xhr.headers['Content-Type']).toBe('image/jpeg');
    expect(xhr.body).toBe(file);
    expect(progress).toEqual([25, 75, 100]);
  });

  it('rejeita com UPLOAD_FAILED quando o armazenamento recusa', async () => {
    const upload = uploadWithProgress('https://s3.test/upload', file);
    FakeXhr.last.respond(403);

    await expect(upload).rejects.toEqual(new ApiError('UPLOAD_FAILED', 'O armazenamento respondeu 403'));
  });

  it('rejeita com NETWORK_ERROR quando a conexão cai', async () => {
    const upload = uploadWithProgress('https://s3.test/upload', file);
    FakeXhr.last.onerror?.();

    await expect(upload).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('cancela o envio quando o signal é abortado', async () => {
    const controller = new AbortController();
    const upload = uploadWithProgress('https://s3.test/upload', file, { signal: controller.signal });

    controller.abort();

    await expect(upload).rejects.toMatchObject({ name: 'AbortError' });
  });
});
