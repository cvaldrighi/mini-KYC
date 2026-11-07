import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { HashRepository } from './hashRepository';

const dynamo = mockClient(DynamoDBDocumentClient);
const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'sa-east-1' }));
const NOW = new Date('2026-11-07T12:00:00.000Z');
const repository = new HashRepository(client, 'DocumentHashes', () => NOW);
const conditionFailed = () => new ConditionalCheckFailedException({ message: 'condição falhou', $metadata: {} });

beforeEach(() => {
  dynamo.reset();
});

describe('HashRepository.claim', () => {
  it('registra o hash na primeira vez, com escrita condicional e TTL', async () => {
    dynamo.on(PutCommand).resolves({});

    expect(await repository.claim('abc123', 'v1')).toBe('CLAIMED');
    expect(dynamo.commandCalls(PutCommand)[0].args[0].input).toEqual({
      TableName: 'DocumentHashes',
      Item: {
        hash: 'abc123',
        verificationId: 'v1',
        createdAt: '2026-11-07T12:00:00.000Z',
        expiresAt: Math.floor(NOW.getTime() / 1000) + 7 * 24 * 60 * 60,
      },
      ConditionExpression: 'attribute_not_exists(#hash)',
      ExpressionAttributeNames: { '#hash': 'hash' },
    });
    expect(dynamo.commandCalls(GetCommand)).toHaveLength(0);
  });

  it('identifica o reprocessamento da mesma verificação', async () => {
    dynamo.on(PutCommand).rejects(conditionFailed());
    dynamo.on(GetCommand).resolves({ Item: { hash: 'abc123', verificationId: 'v1' } });

    expect(await repository.claim('abc123', 'v1')).toBe('SAME_VERIFICATION');
    expect(dynamo.commandCalls(GetCommand)[0].args[0].input).toMatchObject({ ConsistentRead: true });
  });

  it('identifica o arquivo já usado por outra verificação', async () => {
    dynamo.on(PutCommand).rejects(conditionFailed());
    dynamo.on(GetCommand).resolves({ Item: { hash: 'abc123', verificationId: 'outra' } });

    expect(await repository.claim('abc123', 'v1')).toBe('DUPLICATE');
  });

  it('repassa outros erros do DynamoDB', async () => {
    dynamo.on(PutCommand).rejects(new Error('AccessDeniedException'));

    await expect(repository.claim('abc123', 'v1')).rejects.toThrow('AccessDeniedException');
  });
});
