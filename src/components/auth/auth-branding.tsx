'use client';

import { getStorageUrl } from '@/utils/storage';
import Image from 'next/image';

interface AuthBrandingProps {
  name: string;
  logo: string | null;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AuthBranding({ name, logo }: AuthBrandingProps) {
  const logoUrl = getStorageUrl(logo);

  return (
    <a href="#" className="flex items-center gap-3 font-semibold text-lg">
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={name}
          width={40}
          height={40}
          className="size-10 rounded-xl object-cover"
          unoptimized
        />
      ) : (
        <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl text-base font-bold">
          {getInitials(name)}
        </div>
      )}
      {name}
    </a>
  );
}
