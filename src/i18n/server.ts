import { headers } from 'next/headers';

import { type Locale } from './config';
import { detectLocale } from './detect-locale';

export async function getCurrentLocale(): Promise<Locale> {
  const requestHeaders = await headers();
  return detectLocale(requestHeaders.get('accept-language'));
}
