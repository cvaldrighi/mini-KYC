/**
 * Acesso seguro ao localStorage. O navegador pode bloquear o acesso (aba anônima em alguns
 * navegadores, cota cheia, dados de sites bloqueados); nesse caso as funções não lançam erro,
 * mas devolvem um valor que deixa a falha explícita para quem chama.
 */

/** Lê uma chave. Devolve `null` se ela não existir ou se o acesso for bloqueado. */
export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Grava uma chave. Devolve `false` se o acesso for bloqueado. */
export function writeStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
