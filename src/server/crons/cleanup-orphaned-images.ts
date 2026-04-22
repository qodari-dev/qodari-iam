import { db } from '../db';
import { accounts, applications } from '../db/schema';
import { env } from '@/env';
import { getManagedStoragePrefix, isManagedStorageKey } from '../utils/storage-paths';
import { deleteObject, listObjects, type S3Object } from '../utils/spaces';

const ORPHAN_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
const MANAGED_IMAGE_RESOURCE_PATHS = new Set([
  'account-logo',
  'account-image-ad',
  'application-logo',
  'application-image',
  'application-image-ad',
]);

function normalizeReferencedImageKey(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const storageUrlPrefix = `${env.NEXT_PUBLIC_STORAGE_URL.replace(/\/+$/, '')}/`;
  const normalizedKey = trimmed.startsWith(storageUrlPrefix)
    ? trimmed.slice(storageUrlPrefix.length)
    : trimmed.replace(/^\/+/, '');

  return isManagedStorageKey(normalizedKey) ? normalizedKey : null;
}

function isManagedImageObjectKey(key: string): boolean {
  if (!isManagedStorageKey(key)) {
    return false;
  }

  const relativePath = key.slice(`${getManagedStoragePrefix()}/`.length);
  const [, resourcePath, fileName] = relativePath.split('/');

  return Boolean(fileName) && MANAGED_IMAGE_RESOURCE_PATHS.has(resourcePath);
}

/**
 * Gets all image keys referenced in the database.
 * This includes logos and images from both accounts and applications.
 */
async function getReferencedImageKeys(): Promise<Set<string>> {
  const [accountsData, applicationsData] = await Promise.all([
    db.select({ logo: accounts.logo, imageAd: accounts.imageAd }).from(accounts),
    db
      .select({ logo: applications.logo, image: applications.image, imageAd: applications.imageAd })
      .from(applications),
  ]);

  const keys = new Set<string>();

  for (const acc of accountsData) {
    const logoKey = normalizeReferencedImageKey(acc.logo);
    const imageAdKey = normalizeReferencedImageKey(acc.imageAd);

    if (logoKey) keys.add(logoKey);
    if (imageAdKey) keys.add(imageAdKey);
  }

  for (const app of applicationsData) {
    const logoKey = normalizeReferencedImageKey(app.logo);
    const imageKey = normalizeReferencedImageKey(app.image);
    const imageAdKey = normalizeReferencedImageKey(app.imageAd);

    if (logoKey) keys.add(logoKey);
    if (imageKey) keys.add(imageKey);
    if (imageAdKey) keys.add(imageAdKey);
  }

  return keys;
}

/**
 * Identifies orphaned images that are:
 * 1. In the temp folder
 * 2. Older than 24 hours
 * 3. Not referenced in any database record
 */
function findOrphanedImages(
  objects: S3Object[],
  referencedKeys: Set<string>,
  now: Date
): S3Object[] {
  return objects.filter((obj) => {
    if (!isManagedImageObjectKey(obj.key)) {
      return false;
    }

    const age = now.getTime() - obj.lastModified.getTime();
    const isOldEnough = age > ORPHAN_THRESHOLD_MS;
    const isNotReferenced = !referencedKeys.has(obj.key);
    return isOldEnough && isNotReferenced;
  });
}

/**
 * Cleans up orphaned images from DO Spaces.
 * This function:
 * 1. Lists all objects in the current app storage namespace
 * 2. Gets all referenced image keys from the database
 * 3. Deletes any images older than 24 hours that are not referenced
 *
 * @returns Statistics about the cleanup operation
 */
export async function cleanupOrphanedImages(): Promise<{
  scanned: number;
  deleted: number;
  errors: number;
}> {
  const stats = { scanned: 0, deleted: 0, errors: 0 };

  try {
    const [objects, referencedKeys] = await Promise.all([
      listObjects(`${getManagedStoragePrefix()}/`),
      getReferencedImageKeys(),
    ]);

    stats.scanned = objects.length;

    const orphans = findOrphanedImages(objects, referencedKeys, new Date());

    await Promise.all(
      orphans.map(async (obj) => {
        try {
          await deleteObject(obj.key);
          stats.deleted++;
        } catch (error) {
          console.error(`Failed to delete orphaned image: ${obj.key}`, error);
          stats.errors++;
        }
      })
    );

    console.log(
      `[cleanup-orphaned-images] Scanned: ${stats.scanned}, Deleted: ${stats.deleted}, Errors: ${stats.errors}`
    );
  } catch (error) {
    console.error('[cleanup-orphaned-images] Failed to run cleanup:', error);
  }

  return stats;
}
