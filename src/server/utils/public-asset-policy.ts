import 'server-only';
import { env } from '@/env';
import { UPLOAD_TYPE_VALUES } from '@/lib/upload';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|png|webp|svg|pdf)$/i;
const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
};

/** Only keys minted by the authenticated branding upload endpoint are public.
 * No private prefixes, other environments, arbitrary filenames or encoded paths.
 * Public logos are intentionally readable across accounts, just as on the CDN.
 */
export function publicAssetPolicy(key: string): { contentType: string; maxBytes: number } | null {
  const parts = key.split('/');
  const [environment, app, account, type, file] = parts;
  if (
    parts.length !== 5 ||
    environment !== env.APP_ENV ||
    app !== env.IAM_APP_SLUG ||
    !UUID.test(account) ||
    !(UPLOAD_TYPE_VALUES as readonly string[]).includes(type)
  )
    return null;
  const match = FILE.exec(file);
  if (!match || match[2].toLowerCase() === 'pdf') return null;
  return { contentType: CONTENT_TYPES[match[2].toLowerCase()], maxBytes: 2 * 1024 * 1024 };
}
