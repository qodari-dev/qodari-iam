import { env } from '@/env';

/**
 * Builds the full URL for a storage key.
 * If the value is already a URL (legacy), returns it as-is.
 * If the value is a key (e.g., 'logos/acc_123/abc.webp'), builds the full URL.
 */
export function getStorageUrl(keyOrUrl: string | null | undefined): string | null {
  if (!keyOrUrl) return null;

  // If it's already a URL, return it as-is (legacy support)
  if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
    return keyOrUrl;
  }

  // Build the full URL from the key
  return `${env.NEXT_PUBLIC_STORAGE_URL}/${keyOrUrl}`;
}

/**
 * Checks if a value is a storage key (not a URL).
 */
export function isStorageKey(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith('logos/') && !value.includes('http');
}
