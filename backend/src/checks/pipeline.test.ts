import type { CheckName } from '../domain/verification';
import { lazyFile, runPipeline } from './pipeline';
import type { CheckContext, CheckVerdict, VerificationCheck } from './types';

const context: CheckContext = {
  verificationId: 'v1',
  declaredContentType: 'image/jpeg',
  sizeBytes: 200_000,
  loadFile: async () => Buffer.from('arquivo'),
};

function check(name: CheckName, verdict: CheckVerdict | Error): VerificationCheck & { run: jest.Mock } {
  return {
    name,
    run: jest.fn(async () => {
      if (verdict instanceof Error) throw verdict;
      return verdict;
    }),
  };
}

/** Relógio falso que avança 5 ms a cada leitura. */
function fakeClock() {
  let time = 0;
  return () => (time += 5);
}

describe('runPipeline', () => {
  it('aprova quando todas as checagens passam, registrando cada uma na ordem', async () => {
    const result = await runPipeline(
      [check('size', { outcome: 'PASS', details: { sizeBytes: 200_000 } }), check('fileType', { outcome: 'PASS' })],
      context,
      fakeClock(),
    );

    expect(result).toEqual({
      status: 'APPROVED',
      checks: [
        { name: 'size', outcome: 'PASS', durationMs: 5, details: { sizeBytes: 200_000 } },
        { name: 'fileType', outcome: 'PASS', durationMs: 5 },
      ],
    });
  });

  it('para na primeira reprovação e não executa as seguintes', async () => {
    const resolution = check('resolution', {
      outcome: 'REJECT',
      reason: 'LOW_RESOLUTION',
      details: { width: 520, height: 340 },
    });
    const duplicate = check('duplicate', { outcome: 'PASS' });

    const result = await runPipeline([check('size', { outcome: 'PASS' }), resolution, duplicate], context, fakeClock());

    expect(result.status).toBe('REJECTED');
    expect(result.reason).toBe('LOW_RESOLUTION');
    expect(result.checks.map((c) => c.name)).toEqual(['size', 'resolution']);
    expect(result.checks[1]).toMatchObject({ outcome: 'REJECT', reason: 'LOW_RESOLUTION', details: { width: 520, height: 340 } });
    expect(duplicate.run).not.toHaveBeenCalled();
  });

  it('manda para revisão manual quando uma checagem pede', async () => {
    const result = await runPipeline([check('editSignals', { outcome: 'REVIEW', reason: 'SUSPECTED_EDIT' })], context);

    expect(result).toMatchObject({ status: 'MANUAL_REVIEW', reason: 'SUSPECTED_EDIT' });
  });

  it('transforma um erro inesperado em revisão manual e devolve o erro para o log', async () => {
    const boom = new Error('arquivo corrompido');
    const after = check('duplicate', { outcome: 'PASS' });

    const result = await runPipeline([check('size', { outcome: 'PASS' }), check('resolution', boom), after], context);

    expect(result).toMatchObject({
      status: 'MANUAL_REVIEW',
      reason: 'PROCESSING_ERROR',
      failure: { check: 'resolution', error: boom },
    });
    expect(result.checks.map((c) => c.name)).toEqual(['size']);
    expect(after.run).not.toHaveBeenCalled();
  });

  it('passa o mesmo contexto para todas as checagens', async () => {
    const first = check('size', { outcome: 'PASS' });
    const second = check('fileType', { outcome: 'PASS' });

    await runPipeline([first, second], context);

    expect(first.run).toHaveBeenCalledWith(context);
    expect(second.run).toHaveBeenCalledWith(context);
  });
});

describe('lazyFile', () => {
  it('não baixa nada até alguém pedir o arquivo', () => {
    const download = jest.fn().mockResolvedValue(Buffer.from('x'));

    lazyFile(download);

    expect(download).not.toHaveBeenCalled();
  });

  it('baixa uma única vez, mesmo com vários pedidos', async () => {
    const download = jest.fn().mockResolvedValue(Buffer.from('x'));
    const load = lazyFile(download);

    await Promise.all([load(), load()]);
    await load();

    expect(download).toHaveBeenCalledTimes(1);
  });

  it('tenta de novo no próximo pedido se o download falhar', async () => {
    const download = jest.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValue(Buffer.from('x'));
    const load = lazyFile(download);

    await expect(load()).rejects.toThrow('timeout');
    await expect(load()).resolves.toEqual(Buffer.from('x'));
    expect(download).toHaveBeenCalledTimes(2);
  });
});
