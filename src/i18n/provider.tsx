'use client';

import { createContext, useContext, useMemo } from 'react';

import { type Locale } from './config';
import { getMessages, type Messages } from './index';

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
};

const I18nContext = createContext<I18nContextValue | null>(null);

type I18nProviderProps = React.PropsWithChildren<{
  initialLocale: Locale;
}>;

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const value = useMemo<I18nContextValue>(
    () => ({
      locale: initialLocale,
      messages: getMessages(initialLocale),
    }),
    [initialLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }

  return context;
}
