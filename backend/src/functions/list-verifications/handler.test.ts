import { InvalidCursorError } from '../../repositories/cursor';
import type { VerificationRecord } from '../../repositories/verificationRepository';
import { functionUrlEvent } from '../../test/events';
import { createHandler } from './handler';

const record: VerificationRecord = {
  verificationId: 'v1',
  entityType: 'VERIFICATION',
  fileName: 'cnh.jpg',
  contentType: 'image/jpeg',
  fileKey: 'uploads/v1.jpg',
  status: 'REJECTED',
  reason: 'LOW_RESOLUTION',
  checks: [{ name: 'resolution', outcome: 'REJECT', reason: 'LOW_RESOLUTION', durationMs: 12, details: { width: 520, height: 340 } }],
  createdAt: '2026-11-07T12:00:00.000Z',
  updatedAt: '2026-11-07T12:00:01.000Z',
  expiresAt: 1_794_571_200,
};

function setup(page = { items: [record], nextCursor: 'proxima' as string | null }) {
  const repository = { listByCreatedAt: jest.fn().mockResolvedValue(page) };
  return { repository, handler: createHandler({ repository }) };
}

function parse(response: { body?: string }) {
  return JSON.parse(response.body ?? '');
}

describe('list-verifications', () => {
  it('devolve a página sem a chave do arquivo nem atributos internos', async () => {
    const { repository, handler } = setup();

    const response = await handler(functionUrlEvent());

    expect(response.statusCode).toBe(200);
    expect(parse(response)).toEqual({
      items: [
        {
          verificationId: 'v1',
          fileName: 'cnh.jpg',
          status: 'REJECTED',
          reason: 'LOW_RESOLUTION',
          checks: record.checks,
          createdAt: '2026-11-07T12:00:00.000Z',
          updatedAt: '2026-11-07T12:00:01.000Z',
        },
      ],
      nextCursor: 'proxima',
    });
    expect(response.body).not.toContain('uploads/');
    expect(repository.listByCreatedAt).toHaveBeenCalledWith({ limit: 20, cursor: undefined });
  });

  it('repassa limite e cursor', async () => {
    const { repository, handler } = setup();

    await handler(functionUrlEvent({ query: { limit: '5', cursor: 'abc' } }));

    expect(repository.listByCreatedAt).toHaveBeenCalledWith({ limit: 5, cursor: 'abc' });
  });

  it('devolve lista vazia com nextCursor null', async () => {
    const { handler } = setup({ items: [], nextCursor: null });

    expect(parse(await handler(functionUrlEvent()))).toEqual({ items: [], nextCursor: null });
  });

  it.each(['0', '51', '2.5', '-1', 'dez', ''])('recusa limit=%s', async (limit) => {
    const { repository, handler } = setup();

    const response = await handler(functionUrlEvent({ query: { limit } }));

    expect(response.statusCode).toBe(400);
    expect(parse(response)).toEqual({ error: 'INVALID_REQUEST' });
    expect(repository.listByCreatedAt).not.toHaveBeenCalled();
  });

  it('recusa um cursor inválido', async () => {
    const repository = { listByCreatedAt: jest.fn().mockRejectedValue(new InvalidCursorError()) };

    const response = await createHandler({ repository })(functionUrlEvent({ query: { cursor: 'xyz' } }));

    expect(response.statusCode).toBe(400);
    expect(parse(response)).toEqual({ error: 'INVALID_REQUEST' });
  });

  it('responde 500 em erro inesperado', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const repository = { listByCreatedAt: jest.fn().mockRejectedValue(new Error('timeout')) };

    const response = await createHandler({ repository })(functionUrlEvent());

    expect(response.statusCode).toBe(500);
  });

  it('aceita só GET', async () => {
    const { handler } = setup();

    expect((await handler(functionUrlEvent({ method: 'POST' }))).statusCode).toBe(405);
  });
});
