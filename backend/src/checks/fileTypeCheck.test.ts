import type { AcceptedContentType } from '../domain/verification';
import { readFixture } from '../test/fixtures';
import { detectFileType } from './detectFileType';
import { fileTypeCheck } from './fileTypeCheck';
import { makeContext } from './test-helpers';

describe('detectFileType', () => {
  it.each([
    ['valid.jpg', 'image/jpeg'],
    ['progressive.jpg', 'image/jpeg'],
    ['valid.png', 'image/png'],
    ['document.pdf', 'application/pdf'],
    ['renamed.jpg', 'application/x-msdownload'],
  ])('%s é %s', (fixture, type) => {
    expect(detectFileType(readFixture(fixture))).toBe(type);
  });

  it('devolve application/octet-stream para formatos desconhecidos', () => {
    expect(detectFileType(Buffer.from('GIF89a'))).toBe('application/octet-stream');
    expect(detectFileType(Buffer.alloc(0))).toBe('application/octet-stream');
  });
});

describe('fileTypeCheck', () => {
  it.each<[string, AcceptedContentType]>([
    ['valid.jpg', 'image/jpeg'],
    ['valid.png', 'image/png'],
    ['document.pdf', 'application/pdf'],
  ])('aprova %s declarado como %s', async (fixture, declaredContentType) => {
    const verdict = await fileTypeCheck.run(makeContext(readFixture(fixture), { declaredContentType }));

    expect(verdict).toEqual({ outcome: 'PASS', details: { detectedType: declaredContentType } });
  });

  it('reprova um executável com nome e tipo de JPEG', async () => {
    const verdict = await fileTypeCheck.run(makeContext(readFixture('renamed.jpg')));

    expect(verdict).toEqual({
      outcome: 'REJECT',
      reason: 'INVALID_FILE_TYPE',
      details: { detectedType: 'application/x-msdownload' },
    });
  });

  it('reprova um PNG declarado como JPEG', async () => {
    const verdict = await fileTypeCheck.run(
      makeContext(readFixture('valid.png'), { declaredContentType: 'image/jpeg' }),
    );

    expect(verdict).toMatchObject({ outcome: 'REJECT', reason: 'INVALID_FILE_TYPE', details: { detectedType: 'image/png' } });
  });
});
