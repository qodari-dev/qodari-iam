'use client';

import Link from 'next/link';

import { DropdownUser } from '@/components/portal/dropdown-user';
import { useAuth } from '@/stores/auth-store-provider';
import Image from 'next/image';

export function Portal() {
  const auth = useAuth();

  if (!auth) {
    return <div className="p-4">No authenticated user</div>;
  }

  return (
    <main className="py-12">
      <header className="container mx-auto mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">
            Welcome, {auth.user.firstName} {auth.user.lastName}
          </h1>
        </div>
        <div>
          <DropdownUser />
        </div>
      </header>
      <div className="container mx-auto">
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-4">
          {auth.applications?.map((app) => {
            return (
              <Link key={app.id} href={app.homeUrl ?? ''} className="block">
                <div className="group relative">
                  <div className="relative">
                    <Image
                      alt={app.name}
                      src={app.logo ?? ''}
                      width={200}
                      height={200}
                      className="aspect-4/3 w-full rounded-lg bg-gray-100 object-cover"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 flex items-end p-4 opacity-0 group-hover:opacity-100"
                    >
                      <div className="w-full rounded-md bg-white/75 px-4 py-2 text-center text-sm font-medium text-gray-900 backdrop-blur backdrop-filter">
                        Go to App
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between space-x-8 text-base font-medium">
                    <h3>{app.name}</h3>
                  </div>
                  <p className="text-foreground mt-1 text-sm">{app.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
