import { Suspense } from 'react';
import MfaVerify from './mfa-verify';
import { Spinner } from '@/components/ui/spinner';
import { env } from '@/env';
import { redirect } from 'next/navigation';

export default async function MfaPage(props: PageProps<'/[accountSlug]/mfa'>) {
  const { accountSlug } = await props.params;
  const search = await props.searchParams;

  const appSlug = (search.app as string) ?? env.IAM_APP_SLUG;
  const token = search.token as string | undefined;
  const maskedEmail = search.email as string | undefined;
  const redirectUrl = (search.redirect as string) ?? undefined;

  if (!token) {
    redirect(`/${accountSlug}/login${appSlug ? `?app=${appSlug}` : ''}`);
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      }
    >
      <MfaVerify
        accountSlug={accountSlug}
        appSlug={appSlug}
        mfaToken={token}
        maskedEmail={maskedEmail ?? ''}
        redirect={redirectUrl}
      />
    </Suspense>
  );
}
