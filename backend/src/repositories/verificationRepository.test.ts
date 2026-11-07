import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { VerificationRepository } from './verificationRepository';

const dynamo = mockClient(DynamoDBDocumentClient);
const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'sa-east-1' }));
const NOW = new Date('2026-11-07T12:00:00.000Z');
const repository = new VerificationRepository(client, 'Verifications', () => NOW);

beforeEach(() => {
  dynamo.reset();
});

describe('VerificationRepository.create', () => {
  it('grava a verificação pendente com TTL de 7 dias, sem sobrescrever um id existente', async () => {
    dynamo.on(PutCommand).resolves({});

    const record = await repository.create({
      verificationId: 'v1',
      fileName: 'cnh.jpg',
      contentType: 'image/jpeg',
      fileKey: 'uploads/v1.jpg',
    });

    expect(record).toEqual({
      verificationId: 'v1',
      entityType: 'VERIFICATION',
      fileName: 'cnh.jpg',
      contentType: 'image/jpeg',
      fileKey: 'uploads/v1.jpg',
      status: 'PENDING',
      createdAt: '2026-11-07T12:00:00.000Z',
      updatedAt: '2026-11-07T12:00:00.000Z',
      expiresAt: Math.floor(NOW.getTime() / 1000) + 7 * 24 * 60 * 60,
    });
    const [call] = dynamo.commandCalls(PutCommand);
    expect(call.args[0].input).toEqual({
      TableName: 'Verifications',
      Item: record,
      ConditionExpression: 'attribute_not_exists(verificationId)',
    });
  });
});

describe('VerificationRepository.get', () => {
  it('devolve o item encontrado', async () => {
    dynamo.on(GetCommand, { TableName: 'Verifications', Key: { verificationId: 'v1' } }).resolves({
      Item: { verificationId: 'v1', status: 'PENDING' },
    });

    expect(await repository.get('v1')).toMatchObject({ verificationId: 'v1', status: 'PENDING' });
  });

  it('devolve null quando não existe', async () => {
    dynamo.on(GetCommand).resolves({});

    expect(await repository.get('nao-existe')).toBeNull();
  });
});

describe('VerificationRepository.updateIfPending', () => {
  const checks = [{ name: 'resolution' as const, outcome: 'REJECT' as const, reason: 'LOW_RESOLUTION' as const, durationMs: 12 }];

  it('grava status, motivo e checagens só se ainda estiver pendente', async () => {
    dynamo.on(UpdateCommand).resolves({});

    const result = await repository.updateIfPending('v1', { status: 'REJECTED', reason: 'LOW_RESOLUTION', checks });

    expect(result).toBe('UPDATED');
    const [call] = dynamo.commandCalls(UpdateCommand);
    expect(call.args[0].input).toMatchObject({
      Key: { verificationId: 'v1' },
      UpdateExpression: 'SET #status = :status, checks = :checks, updatedAt = :updatedAt, reason = :reason',
      ConditionExpression: '#status = :pending',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': 'REJECTED',
        ':reason': 'LOW_RESOLUTION',
        ':checks': checks,
        ':updatedAt': '2026-11-07T12:00:00.000Z',
        ':pending': 'PENDING',
      },
    });
  });

  it('não grava motivo quando a verificação foi aprovada', async () => {
    dynamo.on(UpdateCommand).resolves({});

    await repository.updateIfPending('v1', { status: 'APPROVED', checks: [] });

    const input = dynamo.commandCalls(UpdateCommand)[0].args[0].input;
    expect(input.UpdateExpression).not.toContain('reason');
    expect(input.ExpressionAttributeValues).not.toHaveProperty(':reason');
  });

  it('devolve ALREADY_PROCESSED quando a condição falha (evento duplicado)', async () => {
    dynamo.on(UpdateCommand).rejects(new ConditionalCheckFailedException({ message: 'condição falhou', $metadata: {} }));

    expect(await repository.updateIfPending('v1', { status: 'APPROVED', checks: [] })).toBe('ALREADY_PROCESSED');
  });

  it('repassa outros erros do DynamoDB', async () => {
    dynamo.on(UpdateCommand).rejects(new Error('ProvisionedThroughputExceededException'));

    await expect(repository.updateIfPending('v1', { status: 'APPROVED', checks: [] })).rejects.toThrow(
      'ProvisionedThroughputExceededException',
    );
  });
});
