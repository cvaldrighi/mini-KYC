import { sizeCheck } from './sizeCheck';
import { makeContext } from './test-helpers';

const KB = 1024;
const MB = 1024 * KB;

describe('sizeCheck', () => {
  it.each([
    [10 * KB, 'PASS'],
    [5 * MB, 'PASS'],
    [200 * KB, 'PASS'],
  ])('%i bytes passa', async (sizeBytes, outcome) => {
    expect(await sizeCheck.run(makeContext(Buffer.alloc(0), { sizeBytes }))).toEqual({
      outcome,
      details: { sizeBytes },
    });
  });

  it('reprova acima de 5 MB', async () => {
    const verdict = await sizeCheck.run(makeContext(Buffer.alloc(0), { sizeBytes: 5 * MB + 1 }));

    expect(verdict).toEqual({ outcome: 'REJECT', reason: 'FILE_TOO_LARGE', details: { sizeBytes: 5 * MB + 1 } });
  });

  it('reprova abaixo de 10 KB', async () => {
    const verdict = await sizeCheck.run(makeContext(Buffer.alloc(0), { sizeBytes: 10 * KB - 1 }));

    expect(verdict).toMatchObject({ outcome: 'REJECT', reason: 'FILE_TOO_SMALL' });
  });

  it('não baixa o arquivo', async () => {
    const context = makeContext(Buffer.alloc(0), { sizeBytes: 200 * KB });

    await sizeCheck.run(context);

    expect(context.loadFile).not.toHaveBeenCalled();
  });
});
