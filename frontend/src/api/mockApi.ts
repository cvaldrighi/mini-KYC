import {
  ACCEPTED_CONTENT_TYPES,
  MAX_FILE_SIZE_BYTES,
  MIN_FILE_SIZE_BYTES,
  type AcceptedContentType,
  type CheckResult,
  type Reason,
  type Verification,
  type VerificationStatus,
} from '@/domain/verification';
import { ApiError } from './errors';
import type { VerificationsApi } from './types';

/**
 * Implementação em memória da `VerificationsApi`, para desenvolver a interface sem AWS.
 *
 * O resultado é decidido pelo nome e pelo tamanho do arquivo, imitando as checagens do backend:
 * - menor que 10 KB ou maior que 5 MB → reprovado por tamanho
 * - nome com "renomeado"        → reprovado por tipo de arquivo
 * - nome com "baixa"            → reprovado por resolução (520 × 340)
 * - mesmo nome e tamanho já enviados → reprovado por duplicidade
 * - nome com "editad" ou "photoshop" → revisão manual por sinal de edição
 * - nome com "erro"             → revisão manual por erro no processamento
 * - qualquer outro              → aprovado
 */

export interface MockApiOptions {
  /** Atraso de rede simulado em criar e listar. */
  latencyMs?: number;
  /** Duração total do upload simulado. */
  uploadDurationMs?: number;
  /** Tempo entre o fim do upload e o resultado. */
  processingMs?: number;
  /** Começa com algumas verificações de exemplo. */
  seed?: boolean;
  generateId?: () => string;
}

type FinalStatus = Exclude<VerificationStatus, 'PENDING'>;

interface Outcome {
  status: FinalStatus;
  reason?: Reason;
  checks: CheckResult[];
}

const UPLOAD_URL_PREFIX = 'mock://upload/';
const UPLOAD_STEPS = 10;

const DURATION_MS: Record<CheckResult['name'], number> = {
  size: 1,
  fileType: 3,
  resolution: 12,
  duplicate: 18,
  editSignals: 6,
};

function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function pass(name: CheckResult['name'], details?: CheckResult['details']): CheckResult {
  return { name, outcome: 'PASS', durationMs: DURATION_MS[name], details };
}

function fail(
  name: CheckResult['name'],
  outcome: 'REJECT' | 'REVIEW',
  reason: Reason,
  details?: CheckResult['details'],
): CheckResult {
  return { name, outcome, reason, durationMs: DURATION_MS[name], details };
}

/** Decide o resultado como o pipeline do backend: em ordem, parando na primeira falha. */
export function decideOutcome(
  fileName: string,
  sizeBytes: number,
  contentType: AcceptedContentType,
  isDuplicate: boolean,
): Outcome {
  const name = normalize(fileName);
  const isPdf = contentType === 'application/pdf';

  const steps: Array<() => CheckResult | 'ERROR'> = [
    () => {
      if (sizeBytes > MAX_FILE_SIZE_BYTES) return fail('size', 'REJECT', 'FILE_TOO_LARGE', { sizeBytes });
      if (sizeBytes < MIN_FILE_SIZE_BYTES) return fail('size', 'REJECT', 'FILE_TOO_SMALL', { sizeBytes });
      return pass('size', { sizeBytes });
    },
    () => {
      if (name.includes('erro')) return 'ERROR';
      if (name.includes('renomeado')) {
        return fail('fileType', 'REJECT', 'INVALID_FILE_TYPE', { detectedType: 'application/x-msdownload' });
      }
      return pass('fileType', { detectedType: contentType });
    },
    () => {
      if (isPdf) return pass('resolution');
      if (name.includes('baixa')) {
        return fail('resolution', 'REJECT', 'LOW_RESOLUTION', { width: 520, height: 340 });
      }
      return pass('resolution', { width: 1600, height: 1010 });
    },
    () => (isDuplicate ? fail('duplicate', 'REJECT', 'DUPLICATE_DOCUMENT') : pass('duplicate')),
    () => {
      if (!isPdf && (name.includes('editad') || name.includes('photoshop'))) {
        return fail('editSignals', 'REVIEW', 'SUSPECTED_EDIT', { software: 'Adobe Photoshop 25.0' });
      }
      return pass('editSignals');
    },
  ];

  const checks: CheckResult[] = [];
  for (const step of steps) {
    const result = step();
    if (result === 'ERROR') {
      return { status: 'MANUAL_REVIEW', reason: 'PROCESSING_ERROR', checks };
    }
    checks.push(result);
    if (result.outcome !== 'PASS') {
      return {
        status: result.outcome === 'REJECT' ? 'REJECTED' : 'MANUAL_REVIEW',
        reason: result.reason,
        checks,
      };
    }
  }
  return { status: 'APPROVED', checks };
}

function abortError(): DOMException {
  return new DOMException('Envio cancelado', 'AbortError');
}

/** Espera `ms`, rejeitando se o `signal` for abortado antes. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(abortError());
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Cópia para que quem recebe a lista não altere o estado interno do mock. */
function copy(verification: Verification): Verification {
  return {
    ...verification,
    checks: verification.checks?.map((check) => ({
      ...check,
      details: check.details && { ...check.details },
    })),
  };
}

function seedVerifications(now: number, generateId: () => string): Verification[] {
  const examples: Array<{
    fileName: string;
    contentType: AcceptedContentType;
    minutesAgo: number;
    duplicate?: boolean;
  }> = [
    { fileName: 'cnh-frente.jpg', contentType: 'image/jpeg', minutesAgo: 2 },
    { fileName: 'rg-verso.png', contentType: 'image/png', minutesAgo: 4, duplicate: true },
    { fileName: 'foto-editada.jpg', contentType: 'image/jpeg', minutesAgo: 18 },
    { fileName: 'cnh-baixa-resolucao.jpg', contentType: 'image/jpeg', minutesAgo: 25 },
    { fileName: 'comprovante-cnh.pdf', contentType: 'application/pdf', minutesAgo: 32 },
  ];
  return examples.map(({ fileName, contentType, minutesAgo, duplicate = false }) => {
    const createdAt = new Date(now - minutesAgo * 60_000);
    const updatedAt = new Date(createdAt.getTime() + 1_500);
    const outcome = decideOutcome(fileName, 214_000, contentType, duplicate);
    return {
      verificationId: generateId(),
      fileName,
      status: outcome.status,
      reason: outcome.reason,
      checks: outcome.checks,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    };
  });
}

function defaultGenerateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createMockApi(options: MockApiOptions = {}): VerificationsApi {
  const {
    latencyMs = 300,
    uploadDurationMs = 1_200,
    processingMs = 2_500,
    seed = false,
    generateId = defaultGenerateId,
  } = options;

  const verifications = new Map<string, Verification>();
  /** Ordem de criação, para desempatar itens criados no mesmo milissegundo. */
  const sequence = new Map<string, number>();
  const awaitingUpload = new Map<string, AcceptedContentType>();
  /** "nome:tamanho" dos arquivos já enviados, para simular a checagem de duplicidade. */
  const fingerprints = new Set<string>();

  function save(verification: Verification) {
    if (!sequence.has(verification.verificationId)) {
      sequence.set(verification.verificationId, sequence.size);
    }
    verifications.set(verification.verificationId, verification);
  }

  if (seed) {
    seedVerifications(Date.now(), generateId).reverse().forEach(save);
  }

  return {
    async createVerification({ fileName, contentType }) {
      await sleep(latencyMs);
      if (!fileName.trim() || fileName.length > 200) {
        throw new ApiError('INVALID_REQUEST');
      }
      if (!ACCEPTED_CONTENT_TYPES.includes(contentType)) {
        throw new ApiError('UNSUPPORTED_CONTENT_TYPE');
      }
      const verificationId = generateId();
      const now = new Date().toISOString();
      save({ verificationId, fileName, status: 'PENDING', createdAt: now, updatedAt: now });
      awaitingUpload.set(verificationId, contentType);
      return { verificationId, uploadUrl: `${UPLOAD_URL_PREFIX}${verificationId}`, expiresIn: 300 };
    },

    async uploadFile(uploadUrl, file, { onProgress, signal } = {}) {
      const verificationId = uploadUrl.startsWith(UPLOAD_URL_PREFIX)
        ? uploadUrl.slice(UPLOAD_URL_PREFIX.length)
        : '';
      const contentType = awaitingUpload.get(verificationId);
      if (!contentType) {
        throw new ApiError('UPLOAD_FAILED', 'URL de envio inválida ou já usada');
      }

      for (let step = 1; step <= UPLOAD_STEPS; step++) {
        await sleep(uploadDurationMs / UPLOAD_STEPS, signal);
        onProgress?.((step / UPLOAD_STEPS) * 100);
      }
      awaitingUpload.delete(verificationId);

      const fingerprint = `${file.name}:${file.size}`;
      const isDuplicate = fingerprints.has(fingerprint);
      fingerprints.add(fingerprint);

      // Simula o processamento assíncrono disparado pelo evento do S3.
      setTimeout(() => {
        const current = verifications.get(verificationId);
        if (!current || current.status !== 'PENDING') return;
        const outcome = decideOutcome(current.fileName, file.size, contentType, isDuplicate);
        save({
          ...current,
          status: outcome.status,
          reason: outcome.reason,
          checks: outcome.checks,
          updatedAt: new Date().toISOString(),
        });
      }, processingMs);
    },

    async listVerifications({ limit = 20, cursor = null } = {}) {
      await sleep(latencyMs);
      const offset = cursor === null ? 0 : Number(cursor);
      if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        throw new ApiError('INVALID_REQUEST');
      }
      if (!Number.isInteger(offset) || offset < 0) {
        throw new ApiError('INVALID_REQUEST');
      }
      const sorted = [...verifications.values()].sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) ||
          (sequence.get(b.verificationId) ?? 0) - (sequence.get(a.verificationId) ?? 0),
      );
      const end = offset + limit;
      return {
        items: sorted.slice(offset, end).map(copy),
        nextCursor: end < sorted.length ? String(end) : null,
      };
    },
  };
}

/** Instância usada pela aplicação quando `VITE_API_MODE=mock`. */
export const mockApi = createMockApi({ seed: true });
