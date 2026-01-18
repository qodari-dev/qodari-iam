import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/env';

const s3Client = new S3Client({
  endpoint: env.DO_SPACES_ENDPOINT,
  region: env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: env.DO_SPACES_KEY,
    secretAccessKey: env.DO_SPACES_SECRET,
  },
});

const PRESIGNED_URL_EXPIRES_IN = 300; // 5 minutes

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.DO_SPACES_BUCKET,
    Key: key,
    ContentType: contentType,
    ACL: 'public-read',
  });

  return getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_URL_EXPIRES_IN });
}

export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.DO_SPACES_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}

export function isStorageKey(value: string | null | undefined): boolean {
  if (!value) return false;
  // Storage keys start with 'logos/' and don't contain http
  return value.includes('logos/') && !value.includes('http');
}
