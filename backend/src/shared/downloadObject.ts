import { GetObjectCommand, type S3Client } from '@aws-sdk/client-s3';

/** Baixa um objeto do S3 inteiro para a memória (os documentos têm no máximo 5 MB). */
export async function downloadObject(client: S3Client, bucket: string, key: string): Promise<Buffer> {
  const { Body } = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!Body) throw new Error(`Objeto vazio no S3: ${key}`);
  return Buffer.from(await Body.transformToByteArray());
}
