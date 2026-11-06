## ADDED Requirements

### Requirement: Processamento disparado por evento
O sistema SHALL processar cada documento quando o S3 emitir o evento de objeto criado no prefixo `uploads/`, identificando a verificação pelo nome da chave.

#### Scenario: Documento enviado
- **WHEN** um objeto é criado em `uploads/<verificationId>.jpg`
- **THEN** a função de processamento é invocada com esse evento e localiza a verificação correspondente no DynamoDB

#### Scenario: Verificação inexistente
- **WHEN** o evento se refere a um `verificationId` que não existe na tabela
- **THEN** o sistema registra um log de nível `WARN` e encerra sem erro

### Requirement: Pipeline de checagens
O sistema SHALL executar as checagens em ordem fixa (tamanho, tipo real, resolução, duplicidade, sinal de edição), parando na primeira que não passar. Cada checagem SHALL implementar a interface `VerificationCheck` e devolver `PASS`, `REJECT` com motivo ou `REVIEW` com motivo.

#### Scenario: Todas as checagens passam
- **WHEN** o documento passa em todas as checagens
- **THEN** a verificação fica `APPROVED`

#### Scenario: Checagem reprova
- **WHEN** uma checagem devolve `REJECT`
- **THEN** a verificação fica `REJECTED` com o `reason` dessa checagem
- **AND** as checagens seguintes não são executadas

#### Scenario: Checagem pede revisão
- **WHEN** uma checagem devolve `REVIEW`
- **THEN** a verificação fica `MANUAL_REVIEW` com o `reason` dessa checagem

#### Scenario: Falha inesperada
- **WHEN** uma checagem lança um erro inesperado
- **THEN** a verificação fica `MANUAL_REVIEW` com `reason` igual a `PROCESSING_ERROR` e o erro é registrado em log de nível `ERROR`

### Requirement: Checagem de tamanho
O sistema SHALL reprovar documentos maiores que 5 MB ou menores que 10 KB, usando o tamanho informado no evento, antes de baixar o arquivo.

#### Scenario: Arquivo grande demais
- **WHEN** o objeto enviado tem mais de 5 MB
- **THEN** a verificação fica `REJECTED` com `reason` igual a `FILE_TOO_LARGE`

#### Scenario: Arquivo pequeno demais
- **WHEN** o objeto enviado tem menos de 10 KB
- **THEN** a verificação fica `REJECTED` com `reason` igual a `FILE_TOO_SMALL`

### Requirement: Checagem de tipo real
O sistema SHALL identificar o tipo do arquivo pelos seus primeiros bytes (assinatura do formato) e reprovar quando não for JPEG, PNG ou PDF, ou quando for diferente do `contentType` declarado na criação.

#### Scenario: Arquivo renomeado
- **WHEN** um arquivo executável é enviado com `contentType` `image/jpeg`
- **THEN** a verificação fica `REJECTED` com `reason` igual a `INVALID_FILE_TYPE`

#### Scenario: Tipo divergente do declarado
- **WHEN** o arquivo é um PNG válido mas foi declarado como `image/jpeg`
- **THEN** a verificação fica `REJECTED` com `reason` igual a `INVALID_FILE_TYPE`

### Requirement: Checagem de resolução
O sistema SHALL reprovar imagens cujo lado maior tenha menos de 600 pixels ou cujo lado menor tenha menos de 400 pixels. PDFs SHALL pular esta checagem.

#### Scenario: Imagem pequena
- **WHEN** a imagem tem 500x300 pixels
- **THEN** a verificação fica `REJECTED` com `reason` igual a `LOW_RESOLUTION`

#### Scenario: PDF
- **WHEN** o documento é um PDF
- **THEN** a checagem de resolução devolve `PASS`

### Requirement: Checagem de duplicidade
O sistema SHALL calcular o SHA-256 do arquivo e registrá-lo na tabela de hashes com escrita condicional. Se o hash já estiver registrado por outra verificação, o documento SHALL ser reprovado.

#### Scenario: Primeiro envio
- **WHEN** o hash do arquivo não existe na tabela de hashes
- **THEN** o hash é gravado com o `verificationId` atual e a checagem devolve `PASS`

#### Scenario: Arquivo repetido
- **WHEN** o mesmo arquivo é enviado em uma nova verificação
- **THEN** a nova verificação fica `REJECTED` com `reason` igual a `DUPLICATE_DOCUMENT`

#### Scenario: Reprocessamento da mesma verificação
- **WHEN** o hash já está registrado pelo próprio `verificationId` em processamento
- **THEN** a checagem devolve `PASS`

### Requirement: Checagem de sinal de edição
O sistema SHALL ler os metadados EXIF de imagens JPEG e enviar para revisão manual quando o campo `Software` indicar um editor de imagem conhecido (por exemplo Photoshop, GIMP, Canva).

#### Scenario: Imagem editada
- **WHEN** o EXIF da imagem tem `Software` igual a `Adobe Photoshop 25.0`
- **THEN** a verificação fica `MANUAL_REVIEW` com `reason` igual a `SUSPECTED_EDIT`

#### Scenario: Sem metadados
- **WHEN** a imagem não tem EXIF ou não é JPEG
- **THEN** a checagem devolve `PASS`

### Requirement: Registro das checagens
O sistema SHALL gravar na verificação a lista `checks` com o resultado de cada checagem executada, contendo `name`, `outcome` (`PASS`, `REJECT` ou `REVIEW`), `reason` quando houver, `durationMs` e `details` com os valores medidos (`sizeBytes` no tamanho, `detectedType` no tipo, `width` e `height` na resolução, `software` no sinal de edição), na ordem de execução.

#### Scenario: Reprovação no meio do pipeline
- **WHEN** a checagem de resolução reprova o documento
- **THEN** `checks` contém os resultados de tamanho, tipo e resolução, e não contém duplicidade nem edição
- **AND** o item de resolução tem `details` com `width` e `height` da imagem

### Requirement: Atualização idempotente
O sistema MUST atualizar o status somente se a verificação ainda estiver `PENDING`, usando escrita condicional no DynamoDB, para que eventos duplicados não sobrescrevam um resultado.

#### Scenario: Evento duplicado
- **WHEN** o S3 entrega o mesmo evento duas vezes
- **THEN** apenas o primeiro processamento altera o item
- **AND** o segundo registra um log `INFO` de evento já processado e encerra sem erro
