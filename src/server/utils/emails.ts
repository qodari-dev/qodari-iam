import { env } from '@/env';
import type { Locale } from '@/i18n/config';
import type * as React from 'react';
import 'server-only';
import { render } from '@react-email/render';
import { createEmailClient } from './email-client';
import { renderMfaCodeEmailTemplate, renderPasswordResetEmailTemplate } from './email-template';

type PasswordResetEmailArgs = {
  to: string | string[];
  name?: string;
  resetUrl: string;
  locale: Locale;
  accountName: string;
  accountLogo?: string | null;
};

type MfaCodeEmailArgs = {
  to: string | string[];
  name?: string;
  code: string;
  expiresInMinutes: number;
  locale: Locale;
  accountName: string;
  accountLogo?: string | null;
  applicationName?: string | null;
};

type SendEmailMessageArgs = {
  to: string | string[];
  subject: string;
} & (
  | {
      react: React.ReactNode;
      html?: never;
      text?: never;
    }
  | {
      react?: never;
      html: string;
      text?: string;
    }
);

let client: ReturnType<typeof createEmailClient> | undefined;

export async function sendEmailMessage({ to, subject, react, html, text }: SendEmailMessageArgs) {
  if (react) {
    [html, text] = await Promise.all([render(react), render(react, { plainText: true })]);
  }
  if (!html) throw new Error('HTML email content is required');
  client ??= createEmailClient(env);
  await client({ to, subject, html, text });
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
  locale,
  accountName,
  accountLogo,
}: PasswordResetEmailArgs) {
  const rendered = await renderPasswordResetEmailTemplate({
    locale,
    name,
    resetUrl,
    accountName,
    accountLogo,
  });

  await sendEmailMessage({
    to,
    subject: rendered.subject,
    react: rendered.react,
  });
}

export async function sendMfaCodeEmail({
  to,
  name,
  code,
  expiresInMinutes,
  locale,
  accountName,
  accountLogo,
  applicationName,
}: MfaCodeEmailArgs) {
  const rendered = await renderMfaCodeEmailTemplate({
    locale,
    name,
    code,
    expiresInMinutes,
    accountName,
    accountLogo,
    applicationName,
  });

  await sendEmailMessage({
    to,
    subject: rendered.subject,
    react: rendered.react,
  });
}
