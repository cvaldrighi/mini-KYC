import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import type { VerificationStatus } from '../domain/verification';

/**
 * Métricas customizadas no formato EMF (Embedded Metric Format): o Powertools escreve um JSON
 * especial no log, e o CloudWatch extrai a métrica dele. Não há chamada à API PutMetricData,
 * então publicar não adiciona latência nem exige permissão extra.
 *
 * Namespace `MiniKyc`, com a dimensão padrão `service`. São 5 métricas no total:
 * `VerificationCompleted` × 4 status + `ProcessingDuration`. Nunca usar `verificationId`
 * como dimensão: cada valor diferente cria uma métrica nova (e cobrada).
 */
export const metrics = new Metrics({
  namespace: process.env.POWERTOOLS_METRICS_NAMESPACE ?? 'MiniKyc',
  serviceName: process.env.POWERTOOLS_SERVICE_NAME ?? 'mini-kyc',
});

export function recordVerificationCompleted(status: Exclude<VerificationStatus, 'PENDING'>, durationMs: number): void {
  // singleMetric publica na hora, com a dimensão Status só nesta métrica.
  const byStatus = metrics.singleMetric();
  byStatus.addDimension('Status', status);
  byStatus.addMetric('VerificationCompleted', MetricUnit.Count, 1);

  // Fica guardada e sai no publishStoredMetrics() ao fim da invocação.
  metrics.addMetric('ProcessingDuration', MetricUnit.Milliseconds, durationMs);
}
