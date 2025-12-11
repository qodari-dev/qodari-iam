import { Suspense } from 'react';
import Login from './login';
import { Spinner } from '@/components/ui/spinner';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      }
    >
      <Login />
    </Suspense>
  );
}
