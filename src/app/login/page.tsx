import { env } from '@/env';
import { redirect, notFound } from 'next/navigation';

export default function LoginRedirectPage() {
  const defaultAccountSlug = env.IAM_DEFAULT_ACCOUNT_SLUG;

  if (!defaultAccountSlug) {
    notFound();
  }

  redirect(`/${defaultAccountSlug}/login`);
}
