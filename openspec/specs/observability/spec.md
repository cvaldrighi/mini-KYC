# observability Specification

## Purpose
TBD - created by archiving change add-mini-kyc-mvp. Update Purpose after archive.

## Requirements

### Requirement: Logs estruturados
Todas as funções Lambda SHALL escrever logs em JSON contendo `level`, `message`, `timestamp`, `service`, o `requestId` da invocação e, quando aplicável, o `verificationId`.

#### Scenario: Correlação ponta a ponta
- **WHEN** uma verificação é criada e processada
- **THEN** é possível encontrar no CloudWatch Logs Insights todos os logs das duas funções filtrando por um único `verificationId`

#### Scenario: Dados sensíveis
- **WHEN** qualquer função registra logs
- **THEN** os logs não contêm presigned URLs nem o conteúdo do arquivo

### Requirement: Métricas de negócio
A função de processamento SHALL registrar em log o resultado e a duração de cada checagem e o status final de cada verificação, permitindo agregar no Logs Insights a quantidade de verificações por status.

#### Scenario: Contagem por status
- **WHEN** a query documentada é executada no Logs Insights
- **THEN** o resultado mostra a quantidade de verificações por status em intervalos de 5 minutos

### Requirement: Métricas customizadas
A função de processamento SHALL publicar no CloudWatch, via Embedded Metric Format, a métrica `VerificationCompleted` com a dimensão `Status` e a métrica `ProcessingDuration` em milissegundos, no namespace `MiniKyc`.

#### Scenario: Verificação concluída
- **WHEN** uma verificação termina com status `REJECTED`
- **THEN** a métrica `VerificationCompleted` com `Status=REJECTED` aumenta em 1
- **AND** a duração do processamento é registrada em `ProcessingDuration`

### Requirement: Dashboard
O sistema SHALL ter um dashboard no CloudWatch, declarado no template, com invocações, erros, duração e throttles das três Lambdas, as métricas customizadas por status e um widget do Logs Insights com os últimos logs de nível `ERROR`.

#### Scenario: Visão geral
- **WHEN** a stack é implantada e o dashboard é aberto
- **THEN** todos os widgets exibem dados das últimas 3 horas sem configuração manual

### Requirement: Alarme de erros
O sistema SHALL ter um alarme no CloudWatch que dispara quando a função de processamento tiver 1 ou mais erros em 5 minutos.

#### Scenario: Erro não tratado
- **WHEN** a função de processamento lança um erro não tratado
- **THEN** a métrica `Errors` da Lambda aumenta e o alarme entra em estado `ALARM`

### Requirement: Retenção de logs
Os log groups das funções MUST ter retenção de 7 dias.

#### Scenario: Retenção configurada
- **WHEN** a stack é implantada
- **THEN** cada log group das funções tem retenção de 7 dias

### Requirement: Investigação de incidente documentada
O projeto SHALL ter um runbook em `docs/` descrevendo como investigar uma falha usando o alarme, o dashboard e as queries do Logs Insights, e o registro de um incidente simulado com causa, evidências e correção.

#### Scenario: Incidente simulado
- **WHEN** uma falha é introduzida de propósito (por exemplo, remover a permissão `s3:GetObject` da função de processamento)
- **THEN** o alarme dispara, o erro é localizado no Logs Insights pelo `verificationId` e o registro em `docs/` descreve a investigação e a correção
