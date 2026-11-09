## 1. Base do repositório

- [x] 1.1 Criar `frontend/` com Vite + React + TypeScript e configurar Jest + React Testing Library + jsdom
- [x] 1.2 Configurar Tailwind CSS v4, shadcn/ui, a fonte e os tokens de cor dos temas claro e escuro
- [x] 1.3 Criar `backend/` com TypeScript, Jest + ts-jest e estrutura de pastas do design
- [x] 1.4 Atualizar o README com objetivo, arquitetura e como rodar

## 2. Frontend com API fake

- [x] 2.1 Definir tipos de domínio (`Verification`, `VerificationStatus`, `Reason`, `CheckResult`) e a interface `VerificationsApi`
- [x] 2.2 Implementar `mockApi` em memória com atraso simulado, progresso de upload e transição de `PENDING` para os quatro status finais com motivo e checagens
- [x] 2.3 Criar o layout base (cabeçalho, duas colunas responsivas) e o `ThemeToggle`
- [x] 2.4 Implementar `StatusBadge` com texto, ícone e cor por status e o anúncio de mudança de status numa região `aria-live`, com testes
- [x] 2.5 Implementar hook `useVerifications` com carregamento, erro, polling de 5 s e limpeza do intervalo, com teste do unmount
- [x] 2.6 Implementar `VerificationList` e `VerificationRow` com esqueleto, erro, vazio e data relativa, com teste
- [x] 2.7 Implementar `Dropzone` com arrastar e soltar, botões "Tirar foto" e "Escolher arquivo" no celular, validação, prévia e liberação da URL da prévia, com teste de arquivo inválido
- [x] 2.8 Implementar hook `useUpload` com progresso via `XMLHttpRequest` e `UploadPanel` com barra de progresso, notificação e "Tentar de novo", com teste de falha
- [x] 2.9 Implementar `reasonMessages` (título e explicação por motivo, usando `details`), com testes
- [x] 2.10 Implementar `VerificationSheet` com `ChecksTimeline`, explicação e botão "Enviar outra foto" para reprovadas, com testes de abrir, fechar com Esc, foco e o botão
- [x] 2.11 Desenhar o padrão de guilhoché em SVG para a área de envio
- [x] 2.12 Revisar responsividade (360 px), navegação por teclado e contraste nos dois temas
- [x] 2.13 Montar `App` e escolher a implementação da API por `VITE_API_MODE`

## 3. Pipeline de checagens (backend)

- [x] 3.1 Definir tipos de domínio (`VerificationStatus`, `Reason`, `CheckResult`) e a interface `VerificationCheck`
- [x] 3.2 Implementar o pipeline que executa as checagens em ordem, para no primeiro resultado diferente de `PASS` e registra `checks` com `durationMs` e `details`, com testes
- [x] 3.3 Criar arquivos de exemplo em `fixtures/` (JPEG válido, PNG, PDF, imagem pequena, JPEG com EXIF do Photoshop, arquivo renomeado)
- [x] 3.4 Implementar checagens de tamanho e de tipo real (assinatura dos bytes), com testes
- [x] 3.5 Implementar checagem de resolução (cabeçalhos PNG e JPEG), com testes
- [x] 3.6 Implementar checagem de sinal de edição (`exifr`), com testes
- [x] 3.7 Implementar checagem de duplicidade com `HashRepository` e escrita condicional, com testes (primeiro envio, repetido, reprocessamento)

## 4. Infraestrutura (SAM)

- [x] 4.1 Criar alerta de US$ 5 no AWS Budgets
- [x] 4.2 Escrever `template.yaml` com bucket privado (CORS, criptografia, lifecycle de 7 dias), tabela `Verifications` com GSI e TTL, e tabela `DocumentHashes` com TTL
- [x] 4.3 Declarar as três Lambdas (Node.js 22, esbuild), Function URLs com CORS, evento S3 no prefixo `uploads/`, permissões IAM mínimas e log groups com retenção de 7 dias
- [x] 4.4 Declarar alarme de erros na função de processamento
- [x] 4.5 Primeiro deploy com `sam deploy --guided` e validar recursos no console

## 5. Lambda create-verification

- [x] 5.1 Implementar `VerificationRepository.create`
- [x] 5.2 Implementar handler com validação de entrada, criação do item e presigned URL
- [x] 5.3 Testes do handler: sucesso, tipo não permitido e corpo inválido

## 6. Lambda process-document

- [x] 6.1 Implementar `VerificationRepository.updateIfPending` com escrita condicional
- [x] 6.2 Implementar handler: extrair `verificationId` da chave, executar o pipeline (baixando o arquivo só depois da checagem de tamanho) e gravar status, motivo e `checks`
- [x] 6.3 Testes: aprovado, reprovado, revisão manual, erro inesperado em uma checagem, verificação inexistente e evento duplicado

## 7. Lambda list-verifications

- [x] 7.1 Implementar `VerificationRepository.listByCreatedAt` com cursor base64url
- [x] 7.2 Implementar handler com validação de `limit` e `cursor` e mapeamento sem `fileKey`
- [x] 7.3 Testes: listagem, paginação, lista vazia e parâmetros inválidos

## 8. Integração ponta a ponta

- [x] 8.1 Implementar `awsApi` no frontend usando as Function URLs (via `.env`)
- [x] 8.2 Deploy e teste manual com os arquivos de `fixtures/` (incluindo enviar o mesmo arquivo duas vezes), conferindo cada status e motivo

## 9. Observabilidade (CloudWatch)

- [x] 9.1 Configurar Powertools Logger nas três funções com `service` e `verificationId`
- [x] 9.2 Registrar resultado e duração de cada checagem e o status final no processamento
- [x] 9.3 Publicar métricas `VerificationCompleted` (por `Status`) e `ProcessingDuration` com Powertools Metrics
- [x] 9.4 Declarar o dashboard no `template.yaml` (Lambdas, métricas customizadas e widget de erros do Logs Insights)
- [x] 9.5 Documentar em `docs/` as queries do Logs Insights (por `verificationId`, contagem por status, erros recentes e checagens mais lentas)
- [x] 9.6 Escrever o runbook de investigação em `docs/runbook.md`
- [x] 9.7 Simular um incidente (remover `s3:GetObject`), investigar com alarme, dashboard e Logs Insights, corrigir e registrar em `docs/incidente-01.md`

## 10. Fechamento

- [ ] 10.1 Revisar critérios de aceite das specs e marcar o que foi entregue
- [ ] 10.2 Registrar no README decisões, trade-offs e próximos passos (revisão manual, verificação por IA, API Gateway, DLQ)
- [ ] 10.3 Destruir a stack com `sam delete` quando não estiver usando
