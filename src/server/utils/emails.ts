import { env } from '@/env';
import type { Locale } from '@/i18n/config';
import type * as React from 'react';
import { Resend } from 'resend';
import {
  renderMfaCodeEmailTemplate,
  renderPasswordResetEmailTemplate,
} from './email-template';

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

export async function sendEmailMessage({ to, subject, react, html, text }: SendEmailMessageArgs) {
  const resend = new Resend(env.RESEND_API_KEY);
  if (react) {
    await resend.emails.send({
      from: env.RESEND_MAIL_FROM,
      to,
      subject,
      react,
    });
    return;
  }

  if (!html) {
    throw new Error('HTML email content is required when no React template is provided');
  }

  await resend.emails.send({
    from: env.RESEND_MAIL_FROM,
    to,
    subject,
    html,
    text,
  });
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
