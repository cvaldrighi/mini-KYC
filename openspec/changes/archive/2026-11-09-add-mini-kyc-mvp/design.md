## Context

Projeto novo (repositório só com README). Objetivo de estudo: praticar React, AWS serverless e DynamoDB num fluxo parecido com KYC. Restrições: custo dentro do Free Tier, sem IA no MVP, implementável em poucos dias por uma pessoa.

Fluxo:

```
React ──POST──▶ Lambda create-verification ──▶ DynamoDB (PENDING)
  │                    │
  │◀── uploadUrl ──────┘
  │
  └──PUT (presigned)──▶ S3 uploads/ ──evento──▶ Lambda process-document
                                                   │  checagens: tamanho → tipo → resolução
                                                   │             → duplicidade → edição
                                                   ├──▶ DynamoDB DocumentHashes
                                                   └──▶ DynamoDB Verifications (status final)
React ──GET (polling 5s)──▶ Lambda list-verifications ──▶ DynamoDB GSI
Todas as Lambdas ──▶ CloudWatch: logs JSON, métricas EMF, dashboard e alarme de erros
```

## Goals / Non-Goals

**Goals:**
- Upload direto para o S3 via presigned URL, sem o arquivo passar pela Lambda.
- Processamento assíncrono orientado a evento, idempotente.
- Validação em camadas, onde cada checagem é independente e novas camadas (como IA) entram sem mudar o pipeline.
- Listagem paginada via GSI, sem `Scan`.
- Observabilidade suficiente para investigar um documento ponta a ponta.
- Frontend desenvolvível sem AWS (modo mock).

**Non-Goals:**
- Revisão manual e verificação por IA (evoluções futuras).
- Autenticação, multi-tenant, selfie/biometria, API Gateway, CI/CD.

## Decisions

### Estrutura do repositório
```
frontend/   React + Vite + TypeScript
backend/
  src/
    functions/      create-verification, process-document, list-verifications
    domain/         tipos, status e motivos
    checks/         VerificationCheck, pipeline e cada checagem
    repositories/   VerificationRepository (DynamoDB)
    shared/         logger, validação, respostas HTTP
  template.yaml     AWS SAM
docs/               queries do Logs Insights, decisões
```
Sem workspaces de monorepo: cada pasta com seu `package.json`, para manter simples.

### Lambda Function URLs em vez de API Gateway
Cada endpoint HTTP é uma Function URL com `AuthType: NONE` e CORS restrito à origem do frontend.
- Por quê: zero custo extra, menos configuração.
- Trade-off: sem autenticação, throttling por cliente ou roteamento. Em produção usaríamos API Gateway (HTTP API) com autorizador e rate limit.

### AWS SAM para infraestrutura
- Por quê: template declarativo curto para Lambdas e eventos do S3, `sam build` com esbuild para TypeScript e `sam local invoke` para testar sem deploy.
- Alternativa: CDK em TypeScript (mais flexível, mais código). Terraform (fora do ecossistema AWS).

### Presigned PUT com Content-Type fixo
A URL é assinada com `ContentType`, então o cliente precisa enviar o mesmo tipo. Validade de 300 segundos.
- Trade-off: presigned PUT não limita tamanho. Por isso a validação de tamanho acontece no processamento (o evento do S3 traz `size`). Alternativa seria presigned POST com `content-length-range`, mais complexo no frontend.

### Modelo de dados no DynamoDB
Tabela `Verifications`, modo on-demand.
- PK: `verificationId` (UUID v4).
- Atributos: `entityType` (`"VERIFICATION"`), `fileName`, `contentType`, `fileKey`, `status`, `reason?`, `checks?` (lista com `name`, `outcome`, `reason?`, `durationMs`, `details?`), `createdAt`, `updatedAt` (ISO 8601), `expiresAt` (epoch, TTL de 7 dias).
- GSI `byCreatedAt`: PK `entityType`, SK `createdAt`, projeção `ALL`. A listagem faz `Query` com `ScanIndexForward: false`.
- Trade-off: PK fixa no GSI concentra tudo em uma partição. Aceitável no volume de estudo. Num sistema real, a PK seria `customerId`.
- Cursor: `LastEvaluatedKey` em JSON codificado em base64url.

Tabela `DocumentHashes`, modo on-demand.
- PK: `hash` (SHA-256 em hexadecimal). Atributos: `verificationId`, `createdAt`, `expiresAt` (TTL de 7 dias).
- Gravação com `PutItem` e `ConditionExpression: "attribute_not_exists(#hash)"`. Em `ConditionalCheckFailedException`, lê o item: se o `verificationId` for o mesmo, é reprocessamento (`PASS`); se for outro, é duplicado (`REJECT`).
- Por que tabela separada: deixa explícito o padrão de unicidade e mantém o item de verificação simples. Alternativa seria a mesma tabela com chaves genéricas (single-table design), mais eficiente mas menos didática.

### Idempotência
`UpdateItem` com `ConditionExpression: "#status = :pending"`. `ConditionalCheckFailedException` é tratado como evento já processado (log `INFO`, sem erro). O S3 tem entrega "at least once", então duplicidade é esperada.

### Pipeline de checagens
```ts
type CheckResult =
  | { outcome: 'PASS' }
  | { outcome: 'REJECT' | 'REVIEW'; reason: Reason };

interface VerificationCheck {
  name: string;
  run(ctx: CheckContext): Promise<CheckResult>;
}
```
- `CheckContext` traz `verificationId`, `contentType` declarado, `size` do evento e o arquivo em `Buffer` (carregado sob demanda, depois da checagem de tamanho).
- O pipeline percorre a lista em ordem e para no primeiro resultado diferente de `PASS`. A ordem vai das checagens mais baratas às mais caras: tamanho (sem baixar), tipo, resolução, duplicidade (escrita no banco) e edição.
- Tipo real e dimensões lidos à mão a partir dos bytes do arquivo (assinatura do formato; cabeçalho IHDR do PNG; marcadores SOF do JPEG). Só três formatos importam, e as bibliotecas `file-type` e `image-size` foram descartadas: as versões atuais do `file-type` são só ESM e não rodam no Jest em CommonJS sem configuração extra.
- `exifr` para os metadados EXIF (ler EXIF à mão seria bem mais trabalhoso; tem build CommonJS). Hash com `node:crypto`.
- Arquivo de até 5 MB carregado em memória com `GetObject`. Lambda de processamento com 512 MB e timeout de 30 s.
- Evolução: a verificação por IA será mais uma `VerificationCheck` no fim da lista, e a revisão manual um novo endpoint que tira verificações de `MANUAL_REVIEW`.

### Logs com AWS Lambda Powertools (Logger)
- Por quê: logs JSON padronizados, `requestId` automático e `appendKeys({ verificationId })`.
- Alternativa: logger próprio com `console.log(JSON.stringify(...))`. Mais simples, mas reinventa a roda.

### Métricas com Embedded Metric Format (Powertools Metrics)
- Por quê: a métrica sai no próprio log em JSON e o CloudWatch a extrai, sem chamada extra à API `PutMetricData` e sem latência no handler.
- Custo: 5 métricas customizadas (`VerificationCompleted` x 4 status + `ProcessingDuration`), dentro das 10 gratuitas. Evitar dimensões de alta cardinalidade, como `verificationId`, que criariam uma métrica por verificação.
- Dashboard declarado no template (`AWS::CloudWatch::Dashboard`), dentro dos 3 gratuitos.

### Testes
- Backend: Jest + ts-jest. Unitários para cada checagem (com arquivos de exemplo em `fixtures/`), o pipeline, validação de entrada e handlers com o SDK mockado (`aws-sdk-client-mock`).
- Frontend: Jest + React Testing Library + jsdom (a vaga cita Jest; Vitest seria o padrão com Vite).

### Frontend: arquitetura
- `api/` com duas implementações de `VerificationsApi` (`mockApi`, `awsApi`), escolhidas por `VITE_API_MODE`.
- Hook `useVerifications` concentra busca, polling de 5 s e limpeza do intervalo.
- Hook `useUpload` concentra criação, upload com progresso e estados (`idle`, `uploading`, `done`, `error`). O progresso usa `XMLHttpRequest`, porque o `fetch` não informa progresso de upload.
- No celular, a área de envio tem dois `<input type="file">`: um com `capture="environment"` ("Tirar foto") e outro sem ("Escolher arquivo"), porque em alguns navegadores o `capture` esconde a opção de escolher arquivo.
- As mensagens de motivo e explicação ficam num mapa `reasonMessages` no frontend (motivo → título e função que monta a explicação a partir de `details`). O backend devolve só códigos e valores, nunca texto de interface.
- Prévia da imagem com `URL.createObjectURL`, liberada com `URL.revokeObjectURL` na limpeza do `useEffect`.
- Componentes: `Dropzone`, `UploadPanel`, `VerificationList`, `VerificationRow`, `StatusBadge`, `VerificationSheet`, `ChecksTimeline`, `ThemeToggle`.

### Frontend: bibliotecas
- **Tailwind CSS v4** para estilos com tokens de design (cores, tipografia, espaçamento) em variáveis CSS.
- **shadcn/ui** (sobre Radix UI) para componentes acessíveis: `Sheet` (painel lateral), `Button`, `Progress`, `Skeleton`, `Tooltip`. Os componentes são copiados para o projeto e adaptados, não uma dependência fechada. Isso é o mais próximo de trabalhar com um design system de empresa.
- **lucide-react** para ícones e **sonner** para notificações.
- Sem biblioteca de animação; só transições curtas de CSS em resposta a ações (hover, abrir o painel).
- Fonte **Schibsted Grotesk** (Google Fonts), com algarismos tabulares nas datas e tamanhos.

### Frontend: direção visual
O tema vem do próprio objeto do produto: o documento de identidade e o papel de segurança.

Cores (tema claro):
- Papel `#F2F4F1`: fundo, um branco frio levemente esverdeado, como papel moeda.
- Tinta `#18222E`: texto e elementos principais, um azul quase preto de tinta de impressão.
- Guilhoché `#2C6E6A`: cor de destaque, usada nas linhas de segurança, foco e ações principais.
- Aprovado `#1F6B3E` sobre `#E1EFE6`, Reprovado `#A3221B` sobre `#FBE9E7`, Em revisão `#7F5300` sobre `#FBF0DC`, Em análise `#3E4A57` sobre `#E6EAEE`: usadas só nos status.
- No tema escuro, o fundo vira a tinta (`#18222E`) e o texto vira o papel, mantendo os mesmos papéis de cada cor.

Elementos de identidade:
- A área de envio tem a proporção de um cartão de identidade (ISO ID-1, 85,6 x 54 mm) e um padrão de guilhoché em SVG ao fundo, as linhas curvas finas das cédulas e documentos. É o único elemento decorativo da tela.
- Os status usam um rótulo único (`StatusBadge`): borda fina, fundo claro e texto na cor do status, com ícone. "Em análise" usa o mesmo formato em cinza. Sem animação.
- A lista é um registro em linhas, com divisórias finas, não uma grade de cards.
- No painel de detalhe, as checagens são numeradas de 1 a 5, porque são de fato uma sequência.

Layout (desktop):
```
┌────────────────────────────────────────────────────────────────┐
│ mini-KYC                                              [tema]   │
├──────────────────────────────┬─────────────────────────────────┤
│  ┌────────────────────────┐  │  Verificações                   │
│  │ ≈≈ guilhoché ≈≈≈≈≈≈≈≈≈ │  │  ─────────────────────────────  │
│  │   Solte a foto do      │  │  minha-cnh.jpg   há 2 min  [APROVADO]  │
│  │   documento aqui       │  │  rg-frente.png   há 5 min  [REPROVADO] │
│  │ ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈ │  │                  Documento duplicado   │
│  └────────────────────────┘  │  selfie.jpg      há 9 min  [EM ANÁLISE]│
│  [ Enviar documento ]        │                                 │
└──────────────────────────────┴─────────────────────────────────┘
```
Em telas pequenas, a área de envio fica em cima e a lista embaixo. Conteúdo alinhado à esquerda.

Textos da interface: curtos e diretos ("Enviar documento", "Tentar de novo", "Documento duplicado"). Erros dizem o que aconteceu e o que fazer, sem pedir desculpas.

### Região
`sa-east-1` (São Paulo), para manter os dados no Brasil. Custos ficam no Free Tier.

## Risks / Trade-offs

- [Function URLs públicas sem auth] → URLs não divulgadas, CORS restrito, destruir a stack (`sam delete`) quando não estiver usando.
- [Free Tier estourado por engano] → alerta no AWS Budgets em US$ 5 antes do primeiro deploy.
- [Verificações presas em `PENDING` se o upload nunca acontecer] → TTL de 7 dias remove o item. Lifecycle do S3 remove objetos após 7 dias.
- [Polling gera requisições constantes] → intervalo de 5 s e só com a página aberta. Alternativa futura: WebSocket ou SSE.
- [Evento do S3 perdido em falha da Lambda] → invocação assíncrona com 2 retries padrão. Fora do MVP: DLQ/destination em SQS.

## Evoluções futuras

- Revisão manual: endpoint `PATCH` para aprovar ou reprovar verificações em `MANUAL_REVIEW` e ações na tela.
- Verificação por IA: nova `VerificationCheck` chamando um modelo com visão (Bedrock ou API direta), com timeout, fallback para `MANUAL_REVIEW` e registro de custo por chamada.
- DLQ em SQS para eventos que falharem todas as tentativas.

## Migration Plan

Não se aplica (projeto novo). Deploy com `sam build && sam deploy --guided`. Rollback com `sam delete`.

## Open Questions

- Hospedar o frontend (S3 + CloudFront ou Vercel) ou rodar só localmente? No MVP, local.
