# mini-KYC

Projeto de estudo de React + backend serverless na AWS + NoSQL, simulando um fluxo simplificado de KYC (*Know Your Customer*): a pessoa envia a foto de um documento, o sistema roda checagens automáticas de forma assíncrona e devolve um resultado com o motivo.

## Como funciona

```
React ──POST──▶ Lambda create-verification ──▶ DynamoDB (PENDING)
  │                    │
  │◀── presigned URL ──┘
  │
  └──PUT──▶ S3 uploads/ ──evento──▶ Lambda process-document
                                       │  tamanho → tipo → resolução → duplicidade → edição
                                       └──▶ DynamoDB (APPROVED | REJECTED | MANUAL_REVIEW)
React ──GET (a cada 5 s)──▶ Lambda list-verifications ──▶ DynamoDB (GSI por data)
Lambdas ──▶ CloudWatch: logs JSON, métricas, dashboard e alarme
```

- O arquivo vai direto do navegador para o S3 por uma presigned URL, sem passar pela Lambda.
- O processamento é disparado pelo evento do S3, é idempotente e executa checagens em camadas, da mais barata para a mais cara.
- A listagem usa um índice secundário (GSI) ordenado por data, com paginação por cursor.

## Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, Jest e React Testing Library.
- **Backend**: Node.js 22, TypeScript, AWS Lambda (Function URLs), S3, DynamoDB, CloudWatch, AWS SAM, Jest.

## Estrutura

```
frontend/   aplicação React
backend/    Lambdas, checagens e template SAM
docs/       queries do Logs Insights, runbook e registro de incidentes
openspec/   especificação (OpenSpec): proposta, specs, design e tarefas
```

## Como rodar

Requisitos: Node.js 22+.

### Frontend

```bash
cd frontend
cp .env.example .env   # VITE_API_MODE=mock roda sem backend
npm install
npm run dev            # http://localhost:5173
npm test
```

### Backend

```bash
cd backend
npm install
npm test
```

O deploy na AWS (SAM) é documentado quando a infraestrutura estiver pronta.

## Especificação

O projeto é guiado por especificação com [OpenSpec](https://github.com/Fission-AI/OpenSpec). A mudança atual está em `openspec/changes/add-mini-kyc-mvp/`, com os requisitos e critérios de aceite em `specs/` e as decisões técnicas em `design.md`.

## Próximos passos

- Revisão manual de verificações em `MANUAL_REVIEW`.
- Verificação por IA como uma nova camada do pipeline de checagens.
