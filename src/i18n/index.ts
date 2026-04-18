import { type Locale } from './config';
import { en, type Messages } from './locales/en';
import { es } from './locales/es';

export type { Messages };

const locales: Record<Locale, Messages> = {
  en,
  es,
};

export function getMessages(locale: Locale): Messages {
  return locales[locale] ?? locales.es;
}
