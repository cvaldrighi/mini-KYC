import { S3Client } from '@aws-sdk/client-s3';

/** Cliente do S3 compartilhado, criado fora do handler para ser reaproveitado entre invocações. */
export const s3Client = new S3Client({});
