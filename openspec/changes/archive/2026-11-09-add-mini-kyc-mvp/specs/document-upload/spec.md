## ADDED Requirements

### Requirement: Criar verificação
O sistema SHALL expor um endpoint `POST` que recebe `fileName` e `contentType`, cria um registro de verificação no DynamoDB com status `PENDING` e devolve `201` com `verificationId`, `uploadUrl` e `expiresIn`.

#### Scenario: Criação com dados válidos
- **WHEN** o cliente envia `{ "fileName": "minha-cnh.jpg", "contentType": "image/jpeg" }`
- **THEN** o sistema responde `201` com um `verificationId` no formato UUID, uma `uploadUrl` e `expiresIn` igual a 300
- **AND** existe um item no DynamoDB com esse `verificationId`, status `PENDING`, `fileName`, `contentType`, `fileKey`, `createdAt` e `updatedAt`

#### Scenario: Tipo de arquivo não permitido
- **WHEN** o cliente envia `contentType` diferente de `image/jpeg`, `image/png` ou `application/pdf`
- **THEN** o sistema responde `400` com `{ "error": "UNSUPPORTED_CONTENT_TYPE" }`
- **AND** nenhum item é criado no DynamoDB

#### Scenario: Corpo inválido
- **WHEN** o corpo não é JSON válido, ou `fileName` está ausente, vazio ou tem mais de 200 caracteres
- **THEN** o sistema responde `400` com `{ "error": "INVALID_REQUEST" }`

### Requirement: Presigned URL de upload
O sistema SHALL gerar uma presigned URL de `PUT` para a chave `uploads/<verificationId>.<extensão>`, válida por 5 minutos e vinculada ao `contentType` informado.

#### Scenario: Upload dentro da validade
- **WHEN** o cliente faz `PUT` do arquivo na `uploadUrl` com o mesmo `Content-Type` em até 5 minutos
- **THEN** o S3 aceita o objeto na chave `uploads/<verificationId>.<extensão>`

#### Scenario: URL expirada
- **WHEN** o cliente tenta usar a `uploadUrl` depois de 5 minutos
- **THEN** o S3 recusa o upload e a verificação permanece `PENDING`

### Requirement: Bucket privado
O bucket de documentos MUST bloquear todo acesso público, usar criptografia em repouso e permitir CORS apenas para `PUT` a partir da origem do frontend.

#### Scenario: Acesso público negado
- **WHEN** alguém tenta ler um objeto do bucket sem credenciais nem presigned URL
- **THEN** o S3 responde `403`
