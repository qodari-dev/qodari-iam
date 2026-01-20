import { Spinner } from '@/components/ui/spinner';
import { Suspense } from 'react';
import ResetPassword from './reset-password';

export default async function ResetPasswordPage(props: PageProps<'/[accountSlug]/reset-password'>) {
  const { accountSlug } = await props.params;
  const search = await props.searchParams;

  const appSlug = (search.app as string) ?? undefined;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      }
    >
      <ResetPassword accountSlug={accountSlug} appSlug={appSlug} />
    </Suspense>
  );
}
