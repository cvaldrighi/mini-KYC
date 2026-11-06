## Why

Projeto de estudo para fixar React, AWS serverless (Lambda, S3, CloudWatch) e DynamoDB, usando como domínio um fluxo simplificado de KYC (Know Your Customer): o usuário envia a foto de um documento, o sistema roda checagens automáticas de forma assíncrona e devolve um status com o motivo. O domínio exercita padrões reais de mercado: upload direto para storage, processamento orientado a eventos, validação em camadas, idempotência e observabilidade.

## What Changes

- Aplicação web em React com UI moderna e identidade visual própria (Tailwind CSS + shadcn/ui): upload por arrastar e soltar com prévia e progresso, lista de verificações com atualização automática e status com cor e ícone, detalhe com o resultado de cada checagem, tema claro e escuro, responsiva e acessível.
- Endpoint para criar uma verificação e devolver uma presigned URL de upload para o S3.
- Processamento assíncrono disparado pelo evento de criação de objeto no S3, que executa um pipeline de checagens em sequência: tamanho, tipo real do arquivo, resolução, documento duplicado e sinal de edição.
- Cada checagem implementa a interface `VerificationCheck`, permitindo adicionar novas camadas sem alterar o pipeline.
- Endpoint para listar verificações, das mais recentes para as mais antigas, com paginação.
- Observabilidade no CloudWatch: logs estruturados em JSON com correlação por `verificationId`, métricas customizadas por status, dashboard, queries no Logs Insights, alarme de erros e um incidente simulado documentado.
- Infraestrutura declarada com AWS SAM.

### Fora do escopo

- Revisão manual (tela e endpoint para um analista aprovar ou reprovar): evolução futura.
- Verificação por IA (classificação ou leitura do documento com um modelo): evolução futura, como uma nova `VerificationCheck` no fim do pipeline.
- Autenticação, autorização e multi-tenant (um único "cliente" implícito).
- Selfie, prova de vida e comparação facial.
- API Gateway (usaremos Lambda Function URLs), CI/CD e ambientes múltiplos.
- Design system completo publicado (usaremos tokens e componentes locais ao projeto).

## Capabilities

### New Capabilities

- `document-upload`: criação de uma verificação e emissão de presigned URL para envio do documento ao S3.
- `document-processing`: pipeline assíncrono de checagens determinísticas sobre o documento enviado e atualização idempotente do status.
- `verification-query`: listagem paginada das verificações ordenadas por data de criação.
- `web-app`: interface React para upload e acompanhamento das verificações, com modo de API fake para desenvolvimento.
- `observability`: logs estruturados, correlação ponta a ponta, métricas customizadas, dashboard, Logs Insights, alarme de erros e runbook de investigação.

### Modified Capabilities

Nenhuma (projeto novo).

## Impact

- Repositório passa a ter `frontend/` (React + Vite) e `backend/` (Lambdas + template SAM).
- Recursos AWS criados: 1 bucket S3, 2 tabelas DynamoDB (verificações com 1 GSI, e hashes de documentos), 3 funções Lambda (2 com Function URL), log groups, 1 dashboard, 5 métricas customizadas e 1 alarme no CloudWatch.
- Custo esperado: dentro do Free Tier para o volume de estudo.
