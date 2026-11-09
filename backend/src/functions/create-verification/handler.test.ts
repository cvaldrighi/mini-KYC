import { functionUrlEvent } from '../../test/events';
import { createHandler, type Dependencies } from './handler';
import { logger } from '../../shared/logger';

function setup(overrides: Partial<Dependencies> = {}) {
  const deps = {
    repository: { create: jest.fn().mockResolvedValue({}) },
    presignUpload: jest.fn().mockResolvedValue('https://s3.test/upload?assinatura'),
    generateId: () => 'v1',
    ...overrides,
  };
  return { deps, handler: createHandler(deps) };
}

function post(body: unknown) {
  return functionUrlEvent({ method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });
}

function parse(response: { body?: string }) {
  return JSON.parse(response.body ?? '');
}

describe('create-verification', () => {
  it('cria a verificação e devolve a URL de envio', async () => {
    const { deps, handler } = setup();

    const response = await handler(post({ fileName: ' minha-cnh.jpg ', contentType: 'image/jpeg' }));

    expect(response.statusCode).toBe(201);
    expect(parse(response)).toEqual({ verificationId: 'v1', uploadUrl: 'https://s3.test/upload?assinatura', expiresIn: 300 });
    expect(deps.presignUpload).toHaveBeenCalledWith('uploads/v1.jpg', 'image/jpeg');
    expect(deps.repository.create).toHaveBeenCalledWith({
      verificationId: 'v1',
      fileName: 'minha-cnh.jpg',
      contentType: 'image/jpeg',
      fileKey: 'uploads/v1.jpg',
    });
  });

  it.each([
    ['image/png', 'uploads/v1.png'],
    ['application/pdf', 'uploads/v1.pdf'],
  ])('usa a extensão certa para %s', async (contentType, fileKey) => {
    const { deps, handler } = setup();

    await handler(post({ fileName: 'doc', contentType }));

    expect(deps.presignUpload).toHaveBeenCalledWith(fileKey, contentType);
  });

  it('recusa tipo de arquivo não permitido', async () => {
    const { deps, handler } = setup();

    const response = await handler(post({ fileName: 'doc.gif', contentType: 'image/gif' }));

    expect(response.statusCode).toBe(400);
    expect(parse(response)).toEqual({ error: 'UNSUPPORTED_CONTENT_TYPE' });
    expect(deps.repository.create).not.toHaveBeenCalled();
  });

  it.each([
    ['corpo que não é JSON', 'não é json'],
    ['corpo vazio', ''],
    ['fileName ausente', { contentType: 'image/jpeg' }],
    ['fileName vazio', { fileName: '   ', contentType: 'image/jpeg' }],
    ['fileName com mais de 200 caracteres', { fileName: 'a'.repeat(201), contentType: 'image/jpeg' }],
    ['contentType ausente', { fileName: 'cnh.jpg' }],
    ['JSON que não é objeto', '"texto"'],
  ])('recusa %s com INVALID_REQUEST', async (_description, body) => {
    const { deps, handler } = setup();

    const response = await handler(post(body));

    expect(response.statusCode).toBe(400);
    expect(parse(response)).toEqual({ error: 'INVALID_REQUEST' });
    expect(deps.repository.create).not.toHaveBeenCalled();
  });

  it('aceita só POST', async () => {
    const { handler } = setup();

    const response = await handler(functionUrlEvent({ method: 'GET' }));

    expect(response.statusCode).toBe(405);
  });

  it('lê o corpo em base64 quando a Function URL o codifica', async () => {
    const { deps, handler } = setup();
    const event = post({ fileName: 'cnh.jpg', contentType: 'image/jpeg' });
    event.body = Buffer.from(event.body ?? '').toString('base64');
    event.isBase64Encoded = true;

    expect((await handler(event)).statusCode).toBe(201);
    expect(deps.repository.create).toHaveBeenCalled();
  });

  it('não grava nada se a assinatura falhar, e responde 500', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => {});
    const { deps, handler } = setup({ presignUpload: jest.fn().mockRejectedValue(new Error('sem credenciais')) });

    const response = await handler(post({ fileName: 'cnh.jpg', contentType: 'image/jpeg' }));

    expect(response.statusCode).toBe(500);
    expect(parse(response)).toEqual({ error: 'INTERNAL_ERROR' });
    expect(deps.repository.create).not.toHaveBeenCalled();
  });
});
