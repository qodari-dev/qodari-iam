import { env } from '@/env';
import { getResourcePathForUploadType, type UploadType } from '@/lib/upload';

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

function joinKeyParts(...parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .map((part) => trimSlashes(part))
    .filter(Boolean)
    .join('/');
}

export function getStoragePrefix(): string {
  return joinKeyParts(env.APP_ENV, env.IAM_APP_SLUG);
}

export function getManagedStoragePrefix(): string {
  return getStoragePrefix();
}

export function buildManagedUploadKey(
  accountId: string,
  uploadType: UploadType,
  fileName: string
): string {
  return joinKeyParts(
    getManagedStoragePrefix(),
    accountId,
    getResourcePathForUploadType(uploadType),
    fileName
  );
}

export function isManagedStorageKey(value: string | null | undefined): boolean {
  if (!value) return false;
  if (value.startsWith('http://') || value.startsWith('https://')) return false;

  const prefix = getManagedStoragePrefix();
  return value === prefix || value.startsWith(`${prefix}/`);
}

export function extractAccountIdFromManagedStorageKey(key: string): string | null {
  if (!isManagedStorageKey(key)) {
    return null;
  }

  const relativePath = key.slice(`${getManagedStoragePrefix()}/`.length);
  const [accountId] = relativePath.split('/');
  return accountId || null;
}
