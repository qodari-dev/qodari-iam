import type { NextConfig } from 'next';

// NEXT_PUBLIC_STORAGE_URL is compiled into the release, including custom S3/CDN domains.
const storageUrl = process.env.NEXT_PUBLIC_STORAGE_URL
  ? new URL(process.env.NEXT_PUBLIC_STORAGE_URL)
  : undefined;
const storagePatterns =
  storageUrl?.protocol === 'https:'
    ? [
        {
          protocol: 'https' as const,
          hostname: storageUrl.hostname,
          port: storageUrl.port,
          pathname: `${storageUrl.pathname.replace(/\/$/, '')}/**`,
        },
      ]
    : [];

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      ...storagePatterns,
      {
        protocol: 'https',
        hostname: '*.digitaloceanspaces.com',
      },
      {
        protocol: 'https',
        hostname: '*.cdn.digitaloceanspaces.com',
      },
    ],
  },
};

export default nextConfig;
