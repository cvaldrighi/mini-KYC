import { decodeCursor, encodeCursor, InvalidCursorError } from './cursor';

const key = { verificationId: 'v1', entityType: 'VERIFICATION', createdAt: '2026-11-07T11:00:00.000Z' };

function encodeRaw(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

describe('cursor', () => {
  it('codifica e decodifica a chave sem perder nada', () => {
    expect(decodeCursor(encodeCursor(key))).toEqual(key);
  });

  it('gera um valor seguro para URL (base64url, sem + / =)', () => {
    expect(encodeCursor(key)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each([
    ['texto que não é base64 de JSON', 'nao-e-um-cursor'],
    ['JSON que não é objeto', encodeRaw(['v1'])],
    ['objeto vazio', encodeRaw({})],
    ['atributo fora da chave', encodeRaw({ ...key, status: 'APPROVED' })],
    ['valor que não é texto', encodeRaw({ verificationId: 123 })],
    ['null', encodeRaw(null)],
  ])('recusa %s', (_description, cursor) => {
    expect(() => decodeCursor(cursor)).toThrow(InvalidCursorError);
  });
});
