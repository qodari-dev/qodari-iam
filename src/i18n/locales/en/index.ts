import type { LocaleShape } from '@/i18n/types';
import { admin } from './admin';
import { auth } from './auth';
import { common } from './common';
import { errors } from './errors';
import { navigation } from './navigation';
import { portal } from './portal';
import { theme } from './theme';

const definitions = {
  admin,
  common,
  theme,
  auth,
  navigation,
  portal,
  errors,
} as const;

export type Messages = LocaleShape<typeof definitions>;

export const en: Messages = definitions;
