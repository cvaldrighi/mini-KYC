import { Logger } from '@aws-lambda-powertools/logger';

/**
 * Logger estruturado (JSON) do AWS Lambda Powertools, compartilhado pelas três funções.
 * Cada linha sai com nível, mensagem, horário e `service` (de POWERTOOLS_SERVICE_NAME).
 * Com `logger.addContext(context)` no início da invocação, também com o nome da função,
 * o `function_request_id` e se foi cold start.
 *
 * Regra: o `verificationId` vai em todo log que trata de uma verificação, para o Logs Insights
 * juntar as duas funções (criação e processamento) com um único filtro. Nunca registrar a
 * presigned URL nem o conteúdo do arquivo.
 */
export const logger = new Logger({ serviceName: process.env.POWERTOOLS_SERVICE_NAME ?? 'mini-kyc' });
