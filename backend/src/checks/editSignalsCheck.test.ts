import { readFixture } from '../test/fixtures';
import { editSignalsCheck, isEditingSoftware } from './editSignalsCheck';
import { makeContext } from './test-helpers';

describe('isEditingSoftware', () => {
  it.each(['Adobe Photoshop 25.0 (Macintosh)', 'GIMP 2.10.36', 'Canva', 'Adobe Lightroom 7.0', 'Paint.NET 5.0'])(
    'reconhece "%s" como editor',
    (software) => {
      expect(isEditingSoftware(software)).toBe(true);
    },
  );

  it.each(['iOS 17.1', 'Android 14', 'G998BXXU5CWD1', 'HDR+ 1.0'])('não trata "%s" (câmera) como editor', (software) => {
    expect(isEditingSoftware(software)).toBe(false);
  });
});

describe('editSignalsCheck', () => {
  it('manda para revisão uma imagem editada no Photoshop', async () => {
    const verdict = await editSignalsCheck.run(makeContext(readFixture('edited.jpg')));

    expect(verdict).toEqual({
      outcome: 'REVIEW',
      reason: 'SUSPECTED_EDIT',
      details: { software: 'Adobe Photoshop 25.0 (Macintosh)' },
    });
  });

  it('aprova um JPEG sem EXIF', async () => {
    expect(await editSignalsCheck.run(makeContext(readFixture('valid.jpg')))).toEqual({ outcome: 'PASS' });
  });

  it.each([
    ['valid.png', 'image/png'],
    ['document.pdf', 'application/pdf'],
  ] as const)('aprova %s sem baixar o arquivo', async (fixture, declaredContentType) => {
    const context = makeContext(readFixture(fixture), { declaredContentType });

    expect(await editSignalsCheck.run(context)).toEqual({ outcome: 'PASS' });
    expect(context.loadFile).not.toHaveBeenCalled();
  });
});
