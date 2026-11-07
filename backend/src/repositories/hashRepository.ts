import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const RETENTION_SECONDS = 7 * 24 * 60 * 60;

/**
 * - `CLAIMED`: primeira vez que este arquivo aparece; o hash foi registrado para esta verificação.
 * - `SAME_VERIFICATION`: o hash já é desta verificação (o mesmo evento foi processado de novo).
 * - `DUPLICATE`: o hash pertence a outra verificação.
 */
export type ClaimResult = 'CLAIMED' | 'SAME_VERIFICATION' | 'DUPLICATE';

/**
 * Tabela `DocumentHashes`: um item por arquivo, com o hash SHA-256 como chave primária.
 * O DynamoDB só garante unicidade na chave primária (não existe UNIQUE em outro atributo),
 * então o padrão é criar um item cuja chave é o valor que precisa ser único.
 */
export class HashRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async claim(hash: string, verificationId: string): Promise<ClaimResult> {
    const now = this.now();
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: {
            hash,
            verificationId,
            createdAt: now.toISOString(),
            expiresAt: Math.floor(now.getTime() / 1000) + RETENTION_SECONDS,
          },
          // Só grava se o hash ainda não existir. "hash" é palavra reservada, daí o apelido.
          ConditionExpression: 'attribute_not_exists(#hash)',
          ExpressionAttributeNames: { '#hash': 'hash' },
        }),
      );
      return 'CLAIMED';
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) throw error;
    }

    // O hash já existe: descobrimos de quem é. Leitura consistente para ver a escrita mais recente.
    const { Item } = await this.client.send(
      new GetCommand({ TableName: this.tableName, Key: { hash }, ConsistentRead: true }),
    );
    return Item?.verificationId === verificationId ? 'SAME_VERIFICATION' : 'DUPLICATE';
  }
}
