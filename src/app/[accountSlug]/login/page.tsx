import { Suspense } from 'react';
import Login from './login';
import { Spinner } from '@/components/ui/spinner';
import { env } from '@/env';

export default async function LoginPage(props: PageProps<'/[accountSlug]/login'>) {
  const { accountSlug } = await props.params;
  const search = await props.searchParams;

  const appSlug = (search.app as string) ?? env.IAM_APP_SLUG;
  const redirect = (search.redirect as string) ?? undefined;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      }
    >
      <Login accountSlug={accountSlug} appSlug={appSlug} redirect={redirect} />
    </Suspense>
  );
}
