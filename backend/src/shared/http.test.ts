import { badRequest, json } from './http';

describe('json', () => {
  it('monta a resposta com status, content-type e corpo serializado', () => {
    expect(json(201, { verificationId: 'abc' })).toEqual({
      statusCode: 201,
      headers: { 'content-type': 'application/json' },
      body: '{"verificationId":"abc"}',
    });
  });
});

describe('badRequest', () => {
  it('responde 400 com o código de erro', () => {
    const response = badRequest('UNSUPPORTED_CONTENT_TYPE');
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body ?? '')).toEqual({ error: 'UNSUPPORTED_CONTENT_TYPE' });
  });
});
