'use client';

import { api } from '@/clients/api';
import { Spinner } from '@/components/ui/spinner';
import { getStorageUrl } from '@/utils/storage';
import Image from 'next/image';
import { useMemo } from 'react';
import { AuthBranding } from './auth-branding';

interface AuthLayoutProps {
  accountSlug: string;
  appSlug?: string;
  children: React.ReactNode;
  variant?: 'split' | 'centered';
}

const PICSUM_URL = 'https://picsum.photos/1000/1000';

export function AuthLayout({ accountSlug, appSlug, children, variant = 'split' }: AuthLayoutProps) {
  const { data, isLoading } = api.auth.branding.useQuery({
    queryKey: ['branding', accountSlug, appSlug],
    queryData: { query: { accountSlug, appSlug } },
  });

  const branding = useMemo(() => {
    if (!data?.body) {
      return {
        name: accountSlug,
        logo: null,
        imageAd: null,
      };
    }

    const { account, application } = data.body;

    // Priority: app > account > fallback
    const name = application?.logo ? application?.name : account.name;
    const logo = application?.logo ?? account.logo;
    const imageAd = application?.imageAd ?? account.imageAd;

    return { name, logo, imageAd };
  }, [data, accountSlug]);

  const imageAdUrl = useMemo(() => {
    if (branding.imageAd) {
      return getStorageUrl(branding.imageAd);
    }
    return PICSUM_URL;
  }, [branding.imageAd]);

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (variant === 'centered') {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col gap-6">
            <div className="flex justify-center">
              <AuthBranding name={branding.name} logo={branding.logo} />
            </div>
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <AuthBranding name={branding.name} logo={branding.logo} />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">{children}</div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <Image
          src={imageAdUrl ?? PICSUM_URL}
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          width={1000}
          height={1000}
          unoptimized
        />
      </div>
    </div>
  );
}
