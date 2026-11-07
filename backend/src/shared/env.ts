/** Lê uma variável de ambiente obrigatória (definida no template.yaml) e falha cedo se faltar. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ${name} não definida`);
  return value;
}
