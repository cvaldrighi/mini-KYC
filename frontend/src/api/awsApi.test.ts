import { ApiError } from './errors';
import { createAwsApi, type FetchLike } from './awsApi';

function respond(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => (body === undefined ? Promise.reject(new SyntaxError('sem corpo')) : Promise.resolve(body)),
  };
}

function makeApi(fetchImpl: FetchLike) {
  return createAwsApi({
    createUrl: 'https://create.lambda-url.test/',
    listUrl: 'https://list.lambda-url.test/',
    fetchImpl,
  });
}

describe('createAwsApi', () => {
  describe('createVerification', () => {
    it('faz POST com JSON e devolve a URL de envio', async () => {
      const created = { verificationId: 'v1', uploadUrl: 'https://s3.test/v1', expiresIn: 300 };
      const fetchImpl = jest.fn().mockResolvedValue(respond(201, created));

      const result = await makeApi(fetchImpl).createVerification({ fileName: 'cnh.jpg', contentType: 'image/jpeg' });

      expect(result).toEqual(created);
      expect(fetchImpl).toHaveBeenCalledWith('https://create.lambda-url.test/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fileName: 'cnh.jpg', contentType: 'image/jpeg' }),
      });
    });

    it('transforma o erro do backend em ApiError com o mesmo código', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(respond(400, { error: 'UNSUPPORTED_CONTENT_TYPE' }));

      await expect(
        makeApi(fetchImpl).createVerification({ fileName: 'cnh.jpg', contentType: 'image/jpeg' }),
      ).rejects.toEqual(new ApiError('UNSUPPORTED_CONTENT_TYPE'));
    });

    it('usa SERVER_ERROR quando a resposta de erro não tem um código conhecido', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(respond(502));

      await expect(
        makeApi(fetchImpl).createVerification({ fileName: 'cnh.jpg', contentType: 'image/jpeg' }),
      ).rejects.toMatchObject({ code: 'SERVER_ERROR', message: 'O servidor respondeu 502' });
    });

    it('usa NETWORK_ERROR quando a requisição nem chega ao servidor', async () => {
      const fetchImpl = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(
        makeApi(fetchImpl).createVerification({ fileName: 'cnh.jpg', contentType: 'image/jpeg' }),
      ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    });
  });

  describe('listVerifications', () => {
    it('monta a URL com limite e cursor', async () => {
      const page = { items: [], nextCursor: null };
      const fetchImpl = jest.fn().mockResolvedValue(respond(200, page));

      const result = await makeApi(fetchImpl).listVerifications({ limit: 20, cursor: 'abc' });

      expect(result).toEqual(page);
      expect(fetchImpl).toHaveBeenCalledWith('https://list.lambda-url.test/?limit=20&cursor=abc', undefined);
    });

    it('não envia cursor na primeira página', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(respond(200, { items: [], nextCursor: null }));

      await makeApi(fetchImpl).listVerifications({ limit: 20, cursor: null });

      expect(fetchImpl).toHaveBeenCalledWith('https://list.lambda-url.test/?limit=20', undefined);
    });
  });
});
