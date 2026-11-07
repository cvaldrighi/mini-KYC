import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * Cliente do DynamoDB compartilhado pelas Lambdas. Criado fora do handler para ser
 * reaproveitado entre invocações do mesmo ambiente (só é recriado num cold start).
 *
 * O DocumentClient converte objetos JavaScript para o formato do DynamoDB
 * (`{ S: 'texto' }`, `{ N: '10' }`...) e de volta, então trabalhamos com objetos normais.
 */
export const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
