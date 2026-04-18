import { isErrorResponse } from '@ts-rest/core';
import { type Locale } from '@/i18n/config';
import { getMessages } from '@/i18n';

type ErrorBodyWithMessage = {
  message?: string;
};

function translateMessage(message: string, locale: Locale): string {
  const translations = getMessages(locale).errors.translations;
  return translations[message as keyof typeof translations] ?? message;
}

export function getTsRestErrorMessage(
  error: unknown | null | undefined,
  locale: Locale = 'es'
): string {
  if (!error) {
    return getMessages(locale).errors.unexpected;
  }

  // Error de ts-rest (ErrorResponse)
  if (isErrorResponse(error)) {
    const body = error.body as ErrorBodyWithMessage;

    if (body.message && typeof body.message === 'string') {
      return translateMessage(body.message, locale);
    }
  }

  // Error normal de JS/TS
  if (error instanceof Error && error.message) {
    return translateMessage(error.message, locale);
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return translateMessage(error.message, locale);
  }

  return getMessages(locale).errors.unexpected;
}
