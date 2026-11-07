import { createChecks } from '../../checks';
import type { VerificationCheck } from '../../checks/types';
import type { VerificationRecord } from '../../repositories/verificationRepository';
import { s3Event } from '../../test/events';
import { readFixture } from '../../test/fixtures';
import { createHandler, type Dependencies } from './handler';
import { logger } from '../../shared/logger';

function pending(overrides: Partial<VerificationRecord> = {}): VerificationRecord {
  return {
    verificationId: 'v1',
    entityType: 'VERIFICATION',
    fileName: 'cnh.jpg',
    contentType: 'image/jpeg',
    fileKey: 'uploads/v1.jpg',
    status: 'PENDING',
    createdAt: '2026-11-07T12:00:00.000Z',
    updatedAt: '2026-11-07T12:00:00.000Z',
    expiresAt: 1_794_571_200,
    ...overrides,
  };
}

/** Relógio falso que avança 100 ms a cada leitura. */
function fakeClock() {
  let time = 0;
  return () => (time += 100);
}

/** Pipeline real (todas as checagens), com o repositório de hashes e o download falsos. */
function setupWithRealChecks(fixture: string, record = pending()) {
  const file = readFixture(fixture);
  const deps = {
    repository: {
      get: jest.fn().mockResolvedValue(record),
      updateIfPending: jest.fn().mockResolvedValue('UPDATED'),
    },
    checks: createChecks({ hashes: { claim: jest.fn().mockResolvedValue('CLAIMED') } }),
    download: jest.fn().mockResolvedValue(file),
    recordCompleted: jest.fn(),
    now: fakeClock(),
  };
  return { deps, file, handler: createHandler(deps) };
}

beforeEach(() => {
  jest.spyOn(logger, 'info').mockImplementation(() => {});
  jest.spyOn(logger, 'warn').mockImplementation(() => {});
  jest.spyOn(logger, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('process-document', () => {
  it('aprova um documento válido e grava as cinco checagens', async () => {
    const { deps, file, handler } = setupWithRealChecks('valid.jpg');

    await handler(s3Event('uploads/v1.jpg', file.length));

    const [id, outcome] = deps.repository.updateIfPending.mock.calls[0];
    expect(id).toBe('v1');
    expect(outcome.status).toBe('APPROVED');
    expect(outcome.checks.map((c: { name: string }) => c.name)).toEqual([
      'size',
      'fileType',
      'resolution',
      'duplicate',
      'editSignals',
    ]);
    expect(deps.download).toHaveBeenCalledTimes(1);
    expect(deps.download).toHaveBeenCalledWith('mini-kyc-documents-123456789012', 'uploads/v1.jpg');
  });

  it('reprova por resolução e grava as medidas', async () => {
    const { deps, file, handler } = setupWithRealChecks('low-resolution.jpg');

    await handler(s3Event('uploads/v1.jpg', file.length));

    expect(deps.repository.updateIfPending).toHaveBeenCalledWith('v1', {
      status: 'REJECTED',
      reason: 'LOW_RESOLUTION',
      checks: expect.arrayContaining([expect.objectContaining({ name: 'resolution', details: { width: 520, height: 340 } })]),
    });
  });

  it('manda para revisão uma imagem editada', async () => {
    const { deps, file, handler } = setupWithRealChecks('edited.jpg');

    await handler(s3Event('uploads/v1.jpg', file.length));

    expect(deps.repository.updateIfPending.mock.calls[0][1]).toMatchObject({ status: 'MANUAL_REVIEW', reason: 'SUSPECTED_EDIT' });
  });

  it('reprova arquivo pequeno demais sem baixar nada', async () => {
    const { deps, handler } = setupWithRealChecks('tiny.jpg');

    await handler(s3Event('uploads/v1.jpg', 2_000));

    expect(deps.repository.updateIfPending.mock.calls[0][1]).toMatchObject({ status: 'REJECTED', reason: 'FILE_TOO_SMALL' });
    expect(deps.download).not.toHaveBeenCalled();
  });

  it('registra a métrica de conclusão com o status e a duração do pipeline', async () => {
    const { deps, file, handler } = setupWithRealChecks('low-resolution.jpg');

    await handler(s3Event('uploads/v1.jpg', file.length));

    expect(deps.recordCompleted).toHaveBeenCalledWith('REJECTED', expect.any(Number));
    expect(deps.recordCompleted).toHaveBeenCalledTimes(1);
  });

  it('não registra métrica quando outro processamento já gravou o resultado', async () => {
    const { deps, file, handler } = setupWithRealChecks('valid.jpg');
    deps.repository.updateIfPending.mockResolvedValue('ALREADY_PROCESSED');

    await handler(s3Event('uploads/v1.jpg', file.length));

    expect(deps.recordCompleted).not.toHaveBeenCalled();
  });

  it('ignora sem erro quando a verificação não existe', async () => {
    const { deps, handler } = setupWithRealChecks('valid.jpg');
    deps.repository.get.mockResolvedValue(null);

    await handler(s3Event('uploads/nao-existe.jpg', 200_000));

    expect(deps.repository.updateIfPending).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith('Verificação não encontrada para o arquivo enviado', expect.any(Object));
  });

  it('não roda o pipeline de novo para uma verificação já concluída', async () => {
    const { deps, handler } = setupWithRealChecks('valid.jpg', pending({ status: 'APPROVED' }));

    await handler(s3Event('uploads/v1.jpg', 200_000));

    expect(deps.download).not.toHaveBeenCalled();
    expect(deps.repository.updateIfPending).not.toHaveBeenCalled();
  });

  it('não falha quando outro processamento gravou antes (escrita condicional)', async () => {
    const { deps, file, handler } = setupWithRealChecks('valid.jpg');
    deps.repository.updateIfPending.mockResolvedValue('ALREADY_PROCESSED');

    await expect(handler(s3Event('uploads/v1.jpg', file.length))).resolves.toBeUndefined();
    expect(logger.info).toHaveBeenCalledWith('Outro processamento gravou o resultado antes; nada alterado', { verificationId: 'v1' });
  });

  it('ignora objetos fora do padrão uploads/<id>.<extensão>', async () => {
    const { deps, handler } = setupWithRealChecks('valid.jpg');

    await handler(s3Event('outra-pasta/arquivo.jpg', 200_000));

    expect(deps.repository.get).not.toHaveBeenCalled();
  });

  it('registra o erro de uma checagem e grava revisão manual', async () => {
    const broken: VerificationCheck = { name: 'resolution', run: jest.fn().mockRejectedValue(new Error('arquivo corrompido')) };
    const deps: Dependencies = {
      repository: { get: jest.fn().mockResolvedValue(pending()), updateIfPending: jest.fn().mockResolvedValue('UPDATED') },
      checks: [broken],
      download: jest.fn(),
      recordCompleted: jest.fn(),
    };

    await createHandler(deps)(s3Event('uploads/v1.jpg', 200_000));

    expect(deps.repository.updateIfPending).toHaveBeenCalledWith('v1', { status: 'MANUAL_REVIEW', reason: 'PROCESSING_ERROR', checks: [] });
    expect(logger.error).toHaveBeenCalledWith(
      'Erro inesperado numa checagem; verificação enviada para revisão manual',
      expect.objectContaining({ verificationId: 'v1', check: 'resolution' }),
    );
  });

  it('deixa a invocação falhar em erro de infraestrutura, para a Lambda tentar de novo', async () => {
    const { deps, handler } = setupWithRealChecks('valid.jpg');
    deps.repository.get.mockRejectedValue(new Error('DynamoDB indisponível'));

    await expect(handler(s3Event('uploads/v1.jpg', 200_000))).rejects.toThrow('DynamoDB indisponível');
  });
});
