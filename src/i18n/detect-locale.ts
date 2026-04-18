import { DEFAULT_LOCALE, type Locale } from './config';

export function detectLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) {
    return DEFAULT_LOCALE;
  }

  const normalized = acceptLanguage.toLowerCase();
  const tags = normalized.split(',').map((part) => part.trim());

  for (const tag of tags) {
    if (tag.startsWith('en')) {
      return 'en';
    }

    if (tag.startsWith('es')) {
      return 'es';
    }
  }

  return DEFAULT_LOCALE;
}
