import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { getCurrentLocale } from '@/i18n/server';

export const metadata: Metadata = {
  title: 'Qodari IAM',
  description: 'Qodari IAM',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`antialiased`}>
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
