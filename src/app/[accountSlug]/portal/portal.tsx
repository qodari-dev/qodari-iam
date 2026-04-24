'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import Image from 'next/image';

import { api } from '@/clients/api';
import { DropdownUser } from '@/components/portal/dropdown-user';
import { useI18n } from '@/i18n/provider';
import { useAuth } from '@/stores/auth-store-provider';
import { getStorageUrl } from '@/utils/storage';

function toTitleCase(value: string) {
  return value
    .trim()
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}


export function Portal() {
  const { messages } = useI18n();
  const auth = useAuth();
  const params = useParams<{ accountSlug: string }>();

  const { data: brandingData } = api.auth.branding.useQuery({
    queryKey: ['branding', params.accountSlug],
    queryData: { query: { accountSlug: params.accountSlug } },
  });

  const accountName = brandingData?.body?.account?.name ?? toTitleCase(params.accountSlug);
  const accountLogoUrl = brandingData?.body?.account?.logo
    ? getStorageUrl(brandingData.body.account.logo)
    : null;

  if (!auth) {
    return <div className="p-4">{messages.portal.noAuthenticatedUser}</div>;
  }

  return (
    <main className="min-h-svh px-4 py-6 lg:py-10">
      <header className="container mx-auto mb-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {accountLogoUrl ? (
            <Image
              src={accountLogoUrl}
              alt={accountName}
              width={40}
              height={40}
              className="size-10 rounded-xl object-cover"
              unoptimized
            />
          ) : (
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl text-sm font-bold">
              {accountName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-base font-semibold leading-tight">
              {messages.portal.welcome(auth.user.firstName, auth.user.lastName)}
            </h1>
            <p className="text-muted-foreground text-xs leading-tight">{accountName}</p>
          </div>
        </div>
        <DropdownUser />
      </header>

      <div className="container mx-auto">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {auth.applications?.map((app) => {
            const imageUrl = getStorageUrl(app.image);
            const displayName = toTitleCase(app.name);
            const description = app.description ?? null;

            return (
              <Link key={app.id} href={app.homeUrl ?? ''} className="group block">
                <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
                  {imageUrl ? (
                    <Image
                      alt={displayName}
                      src={imageUrl}
                      width={600}
                      height={400}
                      className="aspect-video w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      unoptimized
                    />
                  ) : (
                    <div className="bg-muted text-muted-foreground flex aspect-video w-full items-center justify-center text-5xl font-bold">
                      {displayName.charAt(0)}
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold">{displayName}</h3>
                    {description && (
                      <p className="text-muted-foreground mt-1 text-sm line-clamp-2">
                        {description}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
