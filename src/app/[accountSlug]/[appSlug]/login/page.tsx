import { Suspense } from 'react';
import Login from './login';
import { Spinner } from '@/components/ui/spinner';

export default async function LoginPage({ params }: PageProps<'/[accountSlug]/[appSlug]/login'>) {
  const { accountSlug, appSlug } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      }
    >
      <Login accountSlug={accountSlug} appSlug={appSlug} />
    </Suspense>
  );
}
