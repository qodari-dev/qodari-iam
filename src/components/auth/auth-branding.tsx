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
    <a href="#" className="flex items-center gap-2 font-medium">
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={name}
          width={24}
          height={24}
          className="size-6 rounded-md object-cover"
          unoptimized
        />
      ) : (
        <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md text-xs font-semibold">
          {getInitials(name)}
        </div>
      )}
      {name}
    </a>
  );
}
