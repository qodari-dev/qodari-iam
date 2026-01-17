import { Suspense } from 'react';
import Login from './login';
import { Spinner } from '@/components/ui/spinner';
import { env } from '@/env';

type Props = {
  params: Promise<{ accountSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ params, searchParams }: Props) {
  const { accountSlug } = await params;
  const search = await searchParams;

  // Default to IAM_APP_SLUG if no app query param is provided
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
