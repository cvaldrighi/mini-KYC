import { selectApi } from './index';
import { mockApi } from './mockApi';

describe('selectApi', () => {
  it('usa o mock quando VITE_API_MODE não é aws', () => {
    expect(selectApi({ apiMode: 'mock', createVerificationUrl: '', listVerificationsUrl: '' })).toBe(mockApi);
  });

  it('usa a API real quando VITE_API_MODE=aws', () => {
    const api = selectApi({
      apiMode: 'aws',
      createVerificationUrl: 'https://create.lambda-url.test/',
      listVerificationsUrl: 'https://list.lambda-url.test/',
    });

    expect(api).not.toBe(mockApi);
  });

  it('falha logo ao iniciar se faltar uma URL no modo aws', () => {
    expect(() =>
      selectApi({ apiMode: 'aws', createVerificationUrl: 'https://create.lambda-url.test/', listVerificationsUrl: '' }),
    ).toThrow('VITE_API_MODE=aws exige');
  });
});
