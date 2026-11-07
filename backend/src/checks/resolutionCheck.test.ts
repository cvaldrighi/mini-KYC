import { readFixture } from '../test/fixtures';
import { readImageDimensions } from './readImageDimensions';
import { resolutionCheck } from './resolutionCheck';
import { makeContext } from './test-helpers';

describe('readImageDimensions', () => {
  it.each([
    ['valid.jpg', 'image/jpeg', 1600, 1010],
    ['progressive.jpg', 'image/jpeg', 800, 600],
    ['portrait-minimum.jpg', 'image/jpeg', 400, 600],
    ['valid.png', 'image/png', 1200, 800],
  ])('lê %s (%s) como %i × %i', (fixture, type, width, height) => {
    expect(readImageDimensions(readFixture(fixture), type)).toEqual({ width, height });
  });

  it('pula segmentos que vêm antes das dimensões (EXIF, C2PA)', () => {
    // edited.jpg tem os segmentos JFIF, C2PA e EXIF antes do SOF.
    expect(readImageDimensions(readFixture('edited.jpg'), 'image/jpeg')).toEqual({ width: 1600, height: 1010 });
  });

  it('devolve null para um JPEG cortado antes das dimensões', () => {
    const truncated = readFixture('valid.jpg').subarray(0, 30);

    expect(readImageDimensions(truncated, 'image/jpeg')).toBeNull();
  });

  it('devolve null para um PNG sem cabeçalho IHDR', () => {
    expect(readImageDimensions(Buffer.from([0x89, 0x50, 0x4e, 0x47]), 'image/png')).toBeNull();
  });
});

describe('resolutionCheck', () => {
  it.each(['valid.jpg', 'progressive.jpg', 'portrait-minimum.jpg'])('aprova %s', async (fixture) => {
    const verdict = await resolutionCheck.run(makeContext(readFixture(fixture)));

    expect(verdict.outcome).toBe('PASS');
  });

  it('aprova o PNG e guarda as dimensões', async () => {
    const verdict = await resolutionCheck.run(
      makeContext(readFixture('valid.png'), { declaredContentType: 'image/png' }),
    );

    expect(verdict).toEqual({ outcome: 'PASS', details: { width: 1200, height: 800 } });
  });

  it('reprova abaixo do mínimo e guarda as dimensões medidas', async () => {
    const verdict = await resolutionCheck.run(makeContext(readFixture('low-resolution.jpg')));

    expect(verdict).toEqual({ outcome: 'REJECT', reason: 'LOW_RESOLUTION', details: { width: 520, height: 340 } });
  });

  it('aprova PDF sem baixar o arquivo', async () => {
    const context = makeContext(readFixture('document.pdf'), { declaredContentType: 'application/pdf' });

    expect(await resolutionCheck.run(context)).toEqual({ outcome: 'PASS' });
    expect(context.loadFile).not.toHaveBeenCalled();
  });

  it('lança erro para um arquivo corrompido (o pipeline transforma em revisão manual)', async () => {
    const corrupted = readFixture('valid.jpg').subarray(0, 30);

    await expect(resolutionCheck.run(makeContext(corrupted))).rejects.toThrow('Não foi possível ler as dimensões');
  });
});
