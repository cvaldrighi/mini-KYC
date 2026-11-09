import { statusFromOutcome, type CheckName, type CheckResult, type Reason, type VerificationStatus } from '../domain/verification';
import type { CheckContext, CheckVerdict, VerificationCheck } from './types';

export interface PipelineResult {
  status: Exclude<VerificationStatus, 'PENDING'>;
  reason?: Reason;
  /** Checagens executadas, na ordem; as que não chegaram a rodar ficam de fora. */
  checks: CheckResult[];
  /** Presente quando uma checagem lançou um erro inesperado, para o handler registrar no log. */
  failure?: { check: CheckName; error: unknown };
}

/**
 * Falha ao baixar o arquivo (permissão, S3 indisponível, rede). É um problema de infraestrutura,
 * não do documento: por isso o pipeline não a transforma em revisão manual, mas deixa a invocação
 * falhar, para a Lambda tentar de novo e o alarme de erros contar a falha.
 * (Encontrado no incidente simulado 01, ver docs/incidente-01.md.)
 */
export class FileDownloadError extends Error {
  constructor(cause: unknown) {
    super(`Falha ao baixar o arquivo: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
    this.name = 'FileDownloadError';
  }
}

function toResult(name: CheckName, verdict: CheckVerdict, durationMs: number): CheckResult {
  const result: CheckResult = { name, outcome: verdict.outcome, durationMs };
  if (verdict.outcome !== 'PASS') result.reason = verdict.reason;
  if (verdict.details) result.details = verdict.details;
  return result;
}

/**
 * Executa as checagens em ordem e para na primeira que não passar.
 * Um erro inesperado numa checagem não derruba o processamento: a verificação vai para
 * revisão manual com `PROCESSING_ERROR`, e o erro volta em `failure` para ser registrado.
 * A exceção é `FileDownloadError`, que é repassada: falha de infraestrutura deve ser tentada de novo.
 *
 * `now` é parâmetro para os testes controlarem o tempo medido.
 */
export async function runPipeline(
  checks: readonly VerificationCheck[],
  context: CheckContext,
  now: () => number = () => performance.now(),
): Promise<PipelineResult> {
  const results: CheckResult[] = [];

  for (const check of checks) {
    const startedAt = now();
    let verdict: CheckVerdict;
    try {
      verdict = await check.run(context);
    } catch (error) {
      if (error instanceof FileDownloadError) throw error; // infraestrutura: não é culpa do documento
      return {
        status: 'MANUAL_REVIEW',
        reason: 'PROCESSING_ERROR',
        checks: results,
        failure: { check: check.name, error },
      };
    }

    results.push(toResult(check.name, verdict, Math.round(now() - startedAt)));
    if (verdict.outcome !== 'PASS') {
      return { status: statusFromOutcome(verdict.outcome), reason: verdict.reason, checks: results };
    }
  }

  return { status: 'APPROVED', checks: results };
}

/**
 * Envolve o download do arquivo para que ele aconteça no máximo uma vez, e só quando
 * alguma checagem pedir. Se o download falhar, a próxima chamada tenta de novo.
 */
export function lazyFile(download: () => Promise<Buffer>): () => Promise<Buffer> {
  let pending: Promise<Buffer> | null = null;
  return () => {
    if (!pending) {
      pending = download().catch((error: unknown) => {
        pending = null;
        throw new FileDownloadError(error);
      });
    }
    return pending;
  };
}
