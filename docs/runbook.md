# Runbook de investigação

Roteiro para quando algo der errado no mini-KYC. A ordem é sempre a mesma: **o que o usuário
vê → o que o dashboard mostra → o que os logs dizem → qual é a causa → como corrigir**.
As consultas citadas estão em [logs-insights.md](logs-insights.md).

## Onde olhar

| Ferramenta | Onde | Para quê |
|---|---|---|
| Dashboard `mini-kyc` | CloudWatch › Dashboards (link no output `DashboardUrl` do deploy) | Visão geral: volume por status, erros, latência, throttles, estado do alarme e últimos erros |
| Alarme `ProcessDocumentErrorsAlarm` | CloudWatch › Alarms | Erros não tratados na função de processamento |
| Logs Insights | CloudWatch › Logs Insights | Detalhes: o que aconteceu com cada verificação |
| Tabela `Verifications` | DynamoDB › Tables › Explore items | Estado real de uma verificação (`status`, `reason`, `checks`) |
| Bucket de documentos | S3 › `mini-kyc-documents-<conta>` › `uploads/` | Se o arquivo de fato chegou |
| Stack | CloudFormation › Stacks › `mini-kyc` | Recursos, eventos e falhas de deploy |

Pela CLI, os logs de uma função em tempo real:

```bash
sam logs --stack-name mini-kyc --name ProcessDocumentFunction --tail
```

## Cenário 1: o alarme de erros disparou

Significa que a `process-document` lançou um erro **não tratado**. Por desenho, erros de um
documento (arquivo corrompido, por exemplo) não chegam aqui: viram revisão manual. Já falhas de
**infraestrutura** (permissão, DynamoDB, S3, inclusive não conseguir baixar o arquivo) fazem a
invocação falhar, para a Lambda tentar de novo e o alarme contar o erro.

> Até o [incidente 01](incidente-01.md), uma falha ao baixar o arquivo virava revisão manual
> com `PROCESSING_ERROR`, sem erro de Lambda e sem alarme. Se o alarme não disparar, mas houver
> logs `ERROR` com "Erro inesperado numa checagem" e um aumento de revisões manuais, confira
> `error.name` na consulta 3: um erro da AWS (`AccessDenied`, `NoSuchBucket`, `Throttling`...)
> indica infraestrutura, não documento.

1. Dashboard: confirme no gráfico **Erros** quando começou e se continua acontecendo.
2. Dashboard: veja o widget **Últimos erros**, ou rode a consulta 3. Anote `error.name` e
   `error.message`. Erros comuns:
   - `AccessDenied`: falta permissão no papel IAM da função (veja o `template.yaml`).
   - `ResourceNotFoundException`: tabela ou bucket com nome errado nas variáveis de ambiente.
   - `ProvisionedThroughputExceededException` ou `ThrottlingException`: limite de capacidade.
3. Pegue um `verificationId` do erro e rode a consulta 1 para ver a história completa.
4. Confira o impacto: as verificações afetadas ficam em `PENDING`. A Lambda tenta de novo
   até 2 vezes; depois disso, o evento é descartado.
5. Corrija (normalmente no `template.yaml`), faça `sam deploy` e acompanhe o gráfico de erros
   voltar a zero.
6. Reprocesse os documentos que ficaram presos (ver "Reprocessar uma verificação").
7. Registre o incidente em `docs/incidente-NN.md`.

## Cenário 2: verificações presas em "Em análise"

1. A verificação existe na tabela? Procure pelo `verificationId` no DynamoDB.
2. O arquivo chegou? Procure `uploads/<verificationId>.<extensão>` no bucket.
   - **Não chegou**: o problema foi no envio pelo navegador (ver cenário 3). A presigned URL
     vale 5 minutos; se expirou, a verificação fica pendente até o TTL apagá-la (7 dias).
   - **Chegou**: o evento disparou a função? Rode a consulta 1 com o id.
3. Sem nenhum log da `process-document` para o id: confira se a notificação do bucket existe
   (S3 › bucket › Properties › Event notifications) e se o arquivo está no prefixo `uploads/`.
4. Com log de erro: siga o cenário 1.

## Cenário 3: o frontend diz "Sem conexão com a internet"

O navegador recebeu uma falha de rede. Na prática, quase sempre é **CORS**: a resposta chega,
mas o navegador a bloqueia, e o JavaScript só vê a falha.

1. DevTools › Console: procure "blocked by CORS policy" e veja qual URL falhou.
2. Confira a origem da página. O `template.yaml` libera só `http://localhost:5173` (parâmetro
   `FrontendOrigin`). Outra porta ou `127.0.0.1` é outra origem. O Vite está com
   `strictPort`, então não troca de porta sozinho.
3. Teste o preflight pelo terminal:
   ```bash
   curl -s -i -X OPTIONS <Function URL> \
     -H 'Origin: http://localhost:5173' \
     -H 'Access-Control-Request-Method: POST' \
     -H 'Access-Control-Request-Headers: content-type' | grep -i access-control
   ```
   Sem `access-control-allow-origin` na resposta, o CORS da Function URL ou do bucket está
   errado.

## Cenário 4: a lista não carrega (erro 500)

1. Consulta 3, filtrando a função `list-verifications`.
2. `AccessDenied` em `dynamodb:Query`: a permissão precisa apontar para o índice
   (`.../index/byCreatedAt`), não só para a tabela.

## Reprocessar uma verificação

A `process-document` só processa verificações `PENDING` e é idempotente. Para reprocessar um
arquivo que ficou preso, basta disparar o evento do S3 de novo, copiando o objeto sobre ele
mesmo:

```bash
aws s3 cp s3://mini-kyc-documents-<conta>/uploads/<id>.jpg \
          s3://mini-kyc-documents-<conta>/uploads/<id>.jpg \
          --metadata-directive REPLACE
```

## Recuperar verificações enviadas para revisão por erro de processamento

Quando uma falha de infraestrutura levou documentos bons para `MANUAL_REVIEW` com
`PROCESSING_ERROR` (como no incidente 01), eles não são reprocessados sozinhos, porque já não
estão `PENDING`. Depois de corrigir a causa:

1. Liste os ids afetados no intervalo do incidente:
   ```
   filter message = 'Verificação concluída' and reason = 'PROCESSING_ERROR'
   | fields @timestamp, verificationId
   ```
2. Descubra o nome da tabela:
   ```bash
   TABLE=$(aws cloudformation describe-stack-resource --stack-name mini-kyc \
     --logical-resource-id VerificationsTable \
     --query StackResourceDetail.PhysicalResourceId --output text)
   ```
3. Para cada id, volte a verificação para `PENDING`. A condição garante que só verificações com
   esse motivo são alteradas:
   ```bash
   aws dynamodb update-item --table-name "$TABLE" \
     --key '{"verificationId": {"S": "<id>"}}' \
     --update-expression 'SET #status = :pending REMOVE reason, checks' \
     --condition-expression 'reason = :error' \
     --expression-attribute-names '{"#status": "status"}' \
     --expression-attribute-values '{":pending": {"S": "PENDING"}, ":error": {"S": "PROCESSING_ERROR"}}'
   ```
4. Dispare o processamento de novo (ver "Reprocessar uma verificação" acima).

## Custos e limpeza

- O alerta de orçamento da conta avisa por e-mail se o gasto do mês passar do limite.
- Sem uso, a stack custa praticamente zero: Lambda e DynamoDB on-demand cobram por uso.
- Para apagar tudo: esvazie o bucket (`aws s3 rm s3://mini-kyc-documents-<conta> --recursive`)
  e rode `sam delete --stack-name mini-kyc`.
