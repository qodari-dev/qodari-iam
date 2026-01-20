import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
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
  return value.includes('logos/') && !value.includes('http');
}

export type S3Object = {
  key: string;
  lastModified: Date;
  size: number;
};

/**
 * Lists all objects in a given prefix.
 * @param prefix - The prefix to list objects from (e.g., 'public/temp/logos/')
 * @returns Array of objects with key, lastModified, and size
 */
export async function listObjects(prefix: string): Promise<S3Object[]> {
  const objects: S3Object[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: env.DO_SPACES_BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key && obj.LastModified) {
          objects.push({
            key: obj.Key,
            lastModified: obj.LastModified,
            size: obj.Size ?? 0,
          });
        }
      }
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects;
}

/**
 * Gets metadata for a specific object.
 * @param key - The object key
 * @returns Object metadata or null if not found
 */
export async function getObjectMetadata(key: string): Promise<{ lastModified: Date } | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: env.DO_SPACES_BUCKET,
      Key: key,
    });

    const response = await s3Client.send(command);
    return {
      lastModified: response.LastModified ?? new Date(),
    };
  } catch {
    return null;
  }
}
