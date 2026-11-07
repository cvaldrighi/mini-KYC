import { readStorage, writeStorage } from './storage';

afterEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
});

describe('readStorage', () => {
  it('lê o valor salvo', () => {
    localStorage.setItem('theme', 'dark');

    expect(readStorage('theme')).toBe('dark');
  });

  it('devolve null quando o navegador bloqueia o acesso', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Acesso negado', 'SecurityError');
    });

    expect(readStorage('theme')).toBeNull();
  });
});

describe('writeStorage', () => {
  it('grava o valor e devolve true', () => {
    expect(writeStorage('theme', 'light')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('devolve false quando o navegador bloqueia o acesso', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Cota excedida', 'QuotaExceededError');
    });

    expect(writeStorage('theme', 'light')).toBe(false);
  });
});
