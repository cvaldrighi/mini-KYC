/**
 * Identifica o formato pelo conteúdo (os primeiros bytes, a "assinatura" do formato),
 * e não pela extensão ou pelo Content-Type, que o cliente pode informar errado.
 *
 * Feito à mão em vez de usar a biblioteca `file-type`: só precisamos de poucos formatos,
 * e as versões atuais dela são só ESM, o que não roda no Jest em CommonJS sem configuração extra.
 */

interface Signature {
  type: string;
  bytes: readonly number[];
}

const SIGNATURES: readonly Signature[] = [
  { type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // "%PDF-"
  { type: 'application/x-msdownload', bytes: [0x4d, 0x5a] }, // "MZ", executável do Windows
];

export const UNKNOWN_TYPE = 'application/octet-stream';

export function detectFileType(content: Buffer): string {
  const match = SIGNATURES.find(({ bytes }) => bytes.every((byte, index) => content[index] === byte));
  return match?.type ?? UNKNOWN_TYPE;
}
