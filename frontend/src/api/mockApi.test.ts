import { ApiError } from './errors';
import { createMockApi, decideOutcome } from './mockApi';
import type { VerificationsApi } from './types';

const LATENCY = 0;
const UPLOAD = 100;
const PROCESSING = 1_000;

function makeApi(): VerificationsApi {
  let next = 0;
  return createMockApi({
    latencyMs: LATENCY,
    uploadDurationMs: UPLOAD,
    processingMs: PROCESSING,
    generateId: () => `id-${++next}`,
  });
}

function makeFile(name: string, size = 20_000, type = 'image/jpeg'): File {
  return new File([new Uint8Array(size)], name, { type });
}

/** Avança os timers falsos e devolve o resultado da promise. */
async function settle<T>(promise: Promise<T>, ms = 0): Promise<T> {
  await jest.advanceTimersByTimeAsync(ms);
  return promise;
}

/** Cria a verificação, envia o arquivo e espera o processamento terminar. */
async function sendAndProcess(api: VerificationsApi, file: File) {
  const created = await settle(
    api.createVerification({ fileName: file.name, contentType: 'image/jpeg' }),
  );
  await settle(api.uploadFile(created.uploadUrl, file), UPLOAD);
  await jest.advanceTimersByTimeAsync(PROCESSING);
  const { items } = await settle(api.listVerifications());
  return items.find((item) => item.verificationId === created.verificationId)!;
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('createMockApi', () => {
  it('cria uma verificação pendente com URL de envio', async () => {
    const api = makeApi();
    const created = await settle(
      api.createVerification({ fileName: 'cnh.jpg', contentType: 'image/jpeg' }),
    );

    expect(created).toEqual({ verificationId: 'id-1', uploadUrl: 'mock://upload/id-1', expiresIn: 300 });
    const { items } = await settle(api.listVerifications());
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ fileName: 'cnh.jpg', status: 'PENDING' });
  });

  it('informa o progresso do envio de 10 em 10 até 100', async () => {
    const api = makeApi();
    const created = await settle(
      api.createVerification({ fileName: 'cnh.jpg', contentType: 'image/jpeg' }),
    );
    const progress: number[] = [];

    await settle(
      api.uploadFile(created.uploadUrl, makeFile('cnh.jpg'), { onProgress: (p) => progress.push(p) }),
      UPLOAD,
    );

    expect(progress).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  });

  it('aprova um documento válido depois do processamento', async () => {
    const result = await sendAndProcess(makeApi(), makeFile('cnh-frente.jpg'));

    expect(result.status).toBe('APPROVED');
    expect(result.checks?.map((check) => check.name)).toEqual([
      'size',
      'fileType',
      'resolution',
      'duplicate',
      'editSignals',
    ]);
  });

  it('reprova por resolução e para o pipeline nessa checagem', async () => {
    const result = await sendAndProcess(makeApi(), makeFile('cnh-baixa.jpg'));

    expect(result).toMatchObject({ status: 'REJECTED', reason: 'LOW_RESOLUTION' });
    expect(result.checks?.map((check) => check.name)).toEqual(['size', 'fileType', 'resolution']);
    expect(result.checks?.[2].details).toEqual({ width: 520, height: 340 });
  });

  it('reprova o mesmo arquivo enviado pela segunda vez', async () => {
    const api = makeApi();
    await sendAndProcess(api, makeFile('rg.jpg'));
    const second = await sendAndProcess(api, makeFile('rg.jpg'));

    expect(second).toMatchObject({ status: 'REJECTED', reason: 'DUPLICATE_DOCUMENT' });
  });

  it('manda para revisão quando há sinal de edição', async () => {
    const result = await sendAndProcess(makeApi(), makeFile('foto-editada.jpg'));

    expect(result).toMatchObject({ status: 'MANUAL_REVIEW', reason: 'SUSPECTED_EDIT' });
  });

  it('rejeita o envio cancelado e mantém a verificação pendente', async () => {
    const api = makeApi();
    const created = await settle(
      api.createVerification({ fileName: 'cnh.jpg', contentType: 'image/jpeg' }),
    );
    const controller = new AbortController();

    const upload = api.uploadFile(created.uploadUrl, makeFile('cnh.jpg'), { signal: controller.signal });
    const assertion = expect(upload).rejects.toMatchObject({ name: 'AbortError' });
    await jest.advanceTimersByTimeAsync(UPLOAD / 2);
    controller.abort();
    await assertion;

    await jest.advanceTimersByTimeAsync(PROCESSING);
    const { items } = await settle(api.listVerifications());
    expect(items[0].status).toBe('PENDING');
  });

  it('pagina a listagem da mais recente para a mais antiga', async () => {
    const api = makeApi();
    for (const name of ['a.jpg', 'b.jpg', 'c.jpg']) {
      await settle(api.createVerification({ fileName: name, contentType: 'image/jpeg' }));
      await jest.advanceTimersByTimeAsync(1_000);
    }

    const first = await settle(api.listVerifications({ limit: 2 }));
    expect(first.items.map((item) => item.fileName)).toEqual(['c.jpg', 'b.jpg']);
    expect(first.nextCursor).not.toBeNull();

    const second = await settle(api.listVerifications({ limit: 2, cursor: first.nextCursor }));
    expect(second.items.map((item) => item.fileName)).toEqual(['a.jpg']);
    expect(second.nextCursor).toBeNull();
  });

  it('recusa limite fora de 1 a 50', async () => {
    const api = makeApi();
    const assertion = expect(api.listVerifications({ limit: 51 })).rejects.toEqual(
      new ApiError('INVALID_REQUEST'),
    );
    await jest.advanceTimersByTimeAsync(0);
    await assertion;
  });

  it('começa com exemplos quando seed está ligado', async () => {
    const api = createMockApi({ latencyMs: LATENCY, seed: true });
    const { items } = await settle(api.listVerifications());

    expect(items.map((item) => item.status)).toEqual(
      expect.arrayContaining(['APPROVED', 'REJECTED', 'MANUAL_REVIEW']),
    );
  });
});

describe('decideOutcome', () => {
  it('reprova arquivo pequeno demais antes das outras checagens', () => {
    const outcome = decideOutcome('cnh.jpg', 5_000, 'image/jpeg', false);

    expect(outcome).toMatchObject({ status: 'REJECTED', reason: 'FILE_TOO_SMALL' });
    expect(outcome.checks).toHaveLength(1);
  });

  it('pula a checagem de resolução para PDF', () => {
    const outcome = decideOutcome('baixa.pdf', 20_000, 'application/pdf', false);

    expect(outcome.status).toBe('APPROVED');
    expect(outcome.checks[2]).toEqual({ name: 'resolution', outcome: 'PASS', durationMs: 12, details: undefined });
  });

  it('marca erro de processamento como revisão manual', () => {
    const outcome = decideOutcome('erro.jpg', 20_000, 'image/jpeg', false);

    expect(outcome).toMatchObject({ status: 'MANUAL_REVIEW', reason: 'PROCESSING_ERROR' });
  });
});
