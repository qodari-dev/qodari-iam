import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/env';
import { isManagedStorageKey } from './storage-paths';

const s3Client = new S3Client({
  endpoint: env.DO_SPACES_ENDPOINT,
  region: env.DO_SPACES_REGION,
  forcePathStyle: env.DO_SPACES_FORCE_PATH_STYLE === 'true',
  // Keep SDK defaults unless this installation explicitly opts out of optional checksums.
  ...(env.AWS_REQUEST_CHECKSUM_CALCULATION
    ? { requestChecksumCalculation: env.AWS_REQUEST_CHECKSUM_CALCULATION }
    : {}),
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
    ...(env.STORAGE_PUBLIC_DELIVERY === 'proxy' ? {} : { ACL: 'public-read' as const }),
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
  return isManagedStorageKey(value);
}

export type S3Object = {
  key: string;
  lastModified: Date;
  size: number;
};

/**
 * Lists all objects in a given prefix.
 * @param prefix - The prefix to list objects from (e.g., 'dev/qodari-iam/')
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

/** Headers must match the signed PUT; the browser must not choose the object's ACL. */
export function publicUploadHeaders(contentType: string): Record<string, string> {
  return {
    'Content-Type': contentType,
    ...(env.STORAGE_PUBLIC_DELIVERY === 'proxy' ? {} : { 'x-amz-acl': 'public-read' }),
  };
}

/** Called only after the public route has validated the exact public-purpose key. */
export async function readPublicAssetObject(key: string, headOnly: boolean, signal: AbortSignal) {
  const input = { Bucket: env.DO_SPACES_BUCKET, Key: key };
  const options = { abortSignal: signal };
  if (headOnly)
    return { ...(await s3Client.send(new HeadObjectCommand(input), options)), Body: undefined };
  return s3Client.send(new GetObjectCommand(input), options);
}
