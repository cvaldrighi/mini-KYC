import { validateFile } from './validateFile';

function makeFile(name: string, type: string, size = 20_000): File {
  const file = new File(['conteúdo'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('validateFile', () => {
  it.each(['image/jpeg', 'image/png', 'application/pdf'])('aceita %s', (type) => {
    expect(validateFile(makeFile('doc', type))).toEqual({ valid: true, contentType: type });
  });

  it('recusa outros tipos', () => {
    expect(validateFile(makeFile('doc.heic', 'image/heic'))).toEqual({
      valid: false,
      message: 'Envie um arquivo JPEG, PNG ou PDF.',
    });
  });

  it('recusa arquivos maiores que 5 MB e diz o tamanho', () => {
    expect(validateFile(makeFile('doc.jpg', 'image/jpeg', 6.2 * 1024 * 1024))).toEqual({
      valid: false,
      message: 'O arquivo tem 6,2 MB. O limite é 5 MB.',
    });
  });

  it('aceita arquivos pequenos (o mínimo é checado no backend)', () => {
    expect(validateFile(makeFile('doc.jpg', 'image/jpeg', 2_000)).valid).toBe(true);
  });
});
