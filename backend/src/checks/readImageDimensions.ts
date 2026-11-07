export interface Dimensions {
  width: number;
  height: number;
}

/**
 * PNG: depois da assinatura de 8 bytes vem sempre o chunk IHDR, com largura e altura
 * em posições fixas (bytes 16 a 23, inteiros de 32 bits big-endian).
 */
function readPng(content: Buffer): Dimensions | null {
  if (content.length < 24 || content.toString('latin1', 12, 16) !== 'IHDR') return null;
  return { width: content.readUInt32BE(16), height: content.readUInt32BE(20) };
}

/** Marcadores SOF ("start of frame") que trazem as dimensões: baseline, progressivo e variações. */
const SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const START_OF_SCAN = 0xda;
const END_OF_IMAGE = 0xd9;

/** Marcadores sem campo de tamanho: só os 2 bytes do marcador. */
function isStandalone(marker: number): boolean {
  return marker === 0x01 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7);
}

/**
 * JPEG: o arquivo é uma sequência de segmentos `FF <marcador> <tamanho de 2 bytes> <dados>`.
 * As dimensões ficam no segmento SOF, que pode vir depois de vários outros (JFIF, EXIF,
 * perfis de cor, C2PA...). Então percorremos os segmentos, pulando cada um pelo tamanho,
 * até achar um SOF. No SOF: 1 byte de precisão, 2 de altura e 2 de largura.
 */
function readJpeg(content: Buffer): Dimensions | null {
  let offset = 2; // pula FF D8 (início da imagem)

  while (offset + 4 <= content.length) {
    if (content[offset] !== 0xff) return null; // fora de um marcador: arquivo corrompido
    const marker = content[offset + 1];

    if (marker === 0xff) {
      offset += 1; // bytes de preenchimento entre segmentos
      continue;
    }
    if (isStandalone(marker)) {
      offset += 2;
      continue;
    }
    if (marker === START_OF_SCAN || marker === END_OF_IMAGE) return null; // começou a imagem sem SOF

    const segmentLength = content.readUInt16BE(offset + 2);
    if (SOF_MARKERS.has(marker)) {
      if (offset + 9 > content.length) return null;
      return { height: content.readUInt16BE(offset + 5), width: content.readUInt16BE(offset + 7) };
    }
    offset += 2 + segmentLength;
  }
  return null;
}

/** Lê largura e altura do cabeçalho. Devolve `null` se o formato não for suportado ou o arquivo estiver corrompido. */
export function readImageDimensions(content: Buffer, contentType: string): Dimensions | null {
  if (contentType === 'image/png') return readPng(content);
  if (contentType === 'image/jpeg') return readJpeg(content);
  return null;
}
