import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand, UpdateCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { AcceptedContentType, CheckResult, Reason, VerificationStatus } from '../domain/verification';

const ENTITY_TYPE = 'VERIFICATION';
/** Registros (e os arquivos no S3) são apagados depois de 7 dias pelo TTL do DynamoDB. */
const RETENTION_SECONDS = 7 * 24 * 60 * 60;

/** Item da tabela `Verifications`, como fica gravado. */
export interface VerificationRecord {
  verificationId: string;
  /** Valor fixo; é a partition key do GSI `byCreatedAt`. */
  entityType: typeof ENTITY_TYPE;
  fileName: string;
  contentType: AcceptedContentType;
  fileKey: string;
  status: VerificationStatus;
  reason?: Reason;
  checks?: CheckResult[];
  createdAt: string;
  updatedAt: string;
  /** Epoch em segundos; atributo de TTL. */
  expiresAt: number;
}

export interface NewVerification {
  verificationId: string;
  fileName: string;
  contentType: AcceptedContentType;
  fileKey: string;
}

export interface VerificationOutcome {
  status: Exclude<VerificationStatus, 'PENDING'>;
  reason?: Reason;
  checks: CheckResult[];
}

export class VerificationRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Cria a verificação como `PENDING`. A condição impede sobrescrever um id que já existe. */
  async create(input: NewVerification): Promise<VerificationRecord> {
    const now = this.now();
    const record: VerificationRecord = {
      ...input,
      entityType: ENTITY_TYPE,
      status: 'PENDING',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: Math.floor(now.getTime() / 1000) + RETENTION_SECONDS,
    };
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: record,
        ConditionExpression: 'attribute_not_exists(verificationId)',
      }),
    );
    return record;
  }

  async get(verificationId: string): Promise<VerificationRecord | null> {
    const { Item } = await this.client.send(new GetCommand({ TableName: this.tableName, Key: { verificationId } }));
    return (Item as VerificationRecord | undefined) ?? null;
  }

  /**
   * Grava o resultado só se a verificação ainda estiver `PENDING` (escrita condicional).
   * O S3 entrega eventos "pelo menos uma vez": se o mesmo evento chegar duas vezes, a segunda
   * escrita falha na condição e devolvemos `ALREADY_PROCESSED`, sem sobrescrever o resultado.
   */
  async updateIfPending(verificationId: string, outcome: VerificationOutcome): Promise<'UPDATED' | 'ALREADY_PROCESSED'> {
    const assignments = ['#status = :status', 'checks = :checks', 'updatedAt = :updatedAt'];
    const values: Record<string, unknown> = {
      ':status': outcome.status,
      ':checks': outcome.checks,
      ':updatedAt': this.now().toISOString(),
      ':pending': 'PENDING',
    };
    if (outcome.reason) {
      assignments.push('reason = :reason');
      values[':reason'] = outcome.reason;
    }

    try {
      await this.client.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { verificationId },
          UpdateExpression: `SET ${assignments.join(', ')}`,
          ConditionExpression: '#status = :pending',
          // "status" é palavra reservada no DynamoDB; por isso o apelido #status.
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: values,
        }),
      );
      return 'UPDATED';
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) return 'ALREADY_PROCESSED';
      throw error;
    }
  }
}
