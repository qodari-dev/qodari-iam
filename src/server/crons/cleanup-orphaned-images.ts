import { db } from '../db';
import { accounts, applications } from '../db/schema';
import { deleteObject, listObjects, type S3Object } from '../utils/spaces';

const TEMP_LOGOS_PREFIX = 'public/temp/logos/';
const ORPHAN_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

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
    if (acc.logo) keys.add(acc.logo);
    if (acc.imageAd) keys.add(acc.imageAd);
  }

  for (const app of applicationsData) {
    if (app.logo) keys.add(app.logo);
    if (app.image) keys.add(app.image);
    if (app.imageAd) keys.add(app.imageAd);
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
    const age = now.getTime() - obj.lastModified.getTime();
    const isOldEnough = age > ORPHAN_THRESHOLD_MS;
    const isNotReferenced = !referencedKeys.has(obj.key);
    return isOldEnough && isNotReferenced;
  });
}

/**
 * Cleans up orphaned images from DO Spaces.
 * This function:
 * 1. Lists all objects in the temp logos folder
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
      listObjects(TEMP_LOGOS_PREFIX),
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
