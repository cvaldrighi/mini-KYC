# Arquivos de exemplo das checagens

Gerados com Python (Pillow) para os testes do pipeline. Nenhum contém dados reais:
são imagens sintéticas com blocos e ruído, com cara de documento.

| Arquivo | Conteúdo | Resultado esperado |
|---|---|---|
| `valid.jpg` | JPEG 1600 × 1010, sem EXIF | Aprovado |
| `valid.png` | PNG 1200 × 800 | Aprovado |
| `document.pdf` | PDF de uma página (A4) | Aprovado (PDF pula a resolução) |
| `progressive.jpg` | JPEG progressivo 800 × 600 (marcador SOF2) | Aprovado |
| `portrait-minimum.jpg` | JPEG 400 × 600, exatamente o mínimo em retrato | Aprovado |
| `low-resolution.jpg` | JPEG 520 × 340 | Reprovado: `LOW_RESOLUTION` |
| `tiny.jpg` | JPEG 120 × 80, cerca de 2 KB | Reprovado: `FILE_TOO_SMALL` |
| `edited.jpg` | JPEG 1600 × 1010 com EXIF `Software: Adobe Photoshop 25.0 (Macintosh)` | Revisão: `SUSPECTED_EDIT` |
| `renamed.jpg` | Assinatura `MZ` (início de executável do Windows) seguida de bytes nulos; não é um programa | Reprovado: `INVALID_FILE_TYPE` |

Para testar a duplicidade, envie o mesmo arquivo duas vezes.

## Metadados extras

As imagens JPEG e PNG carregam um bloco de *Content Credentials* (padrão C2PA): um segmento
APP11 no JPEG e um chunk `caBX` no PNG. Ele foi adicionado pela ferramenta que transferiu os
arquivos e registra que são imagens geradas. Não muda nenhum resultado esperado, e é um caso
realista: fotos de celular também trazem segmentos variados no começo do arquivo, que o leitor
de resolução precisa pular até encontrar o marcador com as dimensões.
