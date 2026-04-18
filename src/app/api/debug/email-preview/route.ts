import { env } from '@/env';
import { detectLocale } from '@/i18n/detect-locale';
import { isLocale } from '@/i18n/config';
import { db } from '@/server/db';
import { accounts, applications } from '@/server/db/schema';
import {
  renderMfaCodeEmailTemplate,
  renderPasswordResetEmailTemplate,
} from '@/server/utils/email-template';
import { sendEmailMessage } from '@/server/utils/emails';
import { and, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

type PreviewTemplate = 'reset' | 'mfa';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function parseRecipients(to: string | null, fallbackEmail: string | null) {
  const raw = to ?? fallbackEmail ?? '';
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderPreviewPage({
  title,
  subject,
  previewHtml,
  template,
  locale,
  accountSlug,
  applicationName,
  sentTo,
}: {
  title: string;
  subject: string;
  previewHtml: string;
  template: PreviewTemplate;
  locale: string;
  accountSlug: string;
  applicationName?: string | null;
  sentTo?: string[];
}) {
  const metaRows = [
    ['Template', template],
    ['Locale', locale],
    ['Account', accountSlug],
    ['Application', applicationName ?? '—'],
    ['Subject', subject],
  ];

  return `<!DOCTYPE html>
<html lang="${escapeHtml(locale)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:32px 16px;background:#e5e7eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111827;">
    <div style="max-width:960px;margin:0 auto;">
      <div style="background:#111827;color:#f9fafb;border-radius:18px;padding:18px 20px;margin-bottom:20px;">
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.75;margin-bottom:8px;">Email Preview</div>
        <div style="font-size:22px;font-weight:700;line-height:1.2;margin-bottom:14px;">${escapeHtml(title)}</div>
        ${
          sentTo?.length
            ? `<div style="background:#0f172a;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:14px;line-height:1.5;">
                Test email sent to: ${escapeHtml(sentTo.join(', '))}
              </div>`
            : ''
        }
        <table style="width:100%;border-collapse:collapse;font-size:13px;line-height:1.5;">
          ${metaRows
            .map(
              ([label, value]) => `<tr>
                <td style="padding:6px 0;color:#9ca3af;width:120px;vertical-align:top;">${escapeHtml(label)}</td>
                <td style="padding:6px 0;color:#f9fafb;">${escapeHtml(value)}</td>
              </tr>`
            )
            .join('')}
        </table>
      </div>
      <div style="border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,.16);background:#fff;border:1px solid #d1d5db;">
        <iframe
          title="${escapeHtml(title)}"
          srcdoc="${escapeHtml(previewHtml)}"
          style="display:block;width:100%;min-height:1180px;border:0;background:#fff;"
        ></iframe>
      </div>
    </div>
  </body>
</html>`;
}

export async function GET(request: NextRequest) {
  if (env.NODE_ENV === 'production') {
    return new Response('Email preview is disabled in production.', { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const template = (searchParams.get('template') ?? 'reset') as PreviewTemplate;
  const requestedLocale = searchParams.get('locale');
  const locale = isLocale(requestedLocale)
    ? requestedLocale
    : detectLocale(request.headers.get('accept-language'));
  const accountSlug = searchParams.get('accountSlug') ?? env.IAM_DEFAULT_ACCOUNT_SLUG;
  const name = searchParams.get('name') ?? 'Carlos Sanchez';
  const email = searchParams.get('email') ?? '';
  const send = searchParams.get('send') === 'true';

  if (!accountSlug) {
    return new Response('Missing accountSlug and IAM_DEFAULT_ACCOUNT_SLUG is not configured.', {
      status: 400,
    });
  }

  const account = await db.query.accounts.findFirst({
    where: eq(accounts.slug, accountSlug),
  });

  if (!account) {
    return new Response(`Account not found for slug: ${accountSlug}`, { status: 404 });
  }

  let applicationName: string | null = null;

  if (template === 'mfa') {
    const appSlug = searchParams.get('appSlug');
    const application = appSlug
      ? await db.query.applications.findFirst({
          where: and(eq(applications.accountId, account.id), eq(applications.slug, appSlug)),
        })
      : await db.query.applications.findFirst({
          where: eq(applications.accountId, account.id),
        });

    applicationName = application?.name ?? null;
  }

  const rendered =
    template === 'mfa'
      ? await renderMfaCodeEmailTemplate({
          locale,
          name,
          code: searchParams.get('code') ?? '483291',
          expiresInMinutes: Number(searchParams.get('expiresInMinutes') ?? '10'),
          accountName: account.name,
          accountLogo: account.logo,
          applicationName,
        })
      : await renderPasswordResetEmailTemplate({
          locale,
          name,
          resetUrl:
            searchParams.get('resetUrl') ??
            new URL(`/${account.slug}/reset-password?token=preview-reset-token`, env.NEXT_PUBLIC_APP_URL)
              .toString(),
          accountName: account.name,
          accountLogo: account.logo,
        });

  const recipients = parseRecipients(searchParams.get('to'), email);
  if (send) {
    if (recipients.length === 0) {
      return new Response('Missing recipients. Use ?send=true&to=a@b.com,c@d.com', {
        status: 400,
      });
    }

    await sendEmailMessage({
      to: recipients,
      subject: rendered.subject,
      react: rendered.react,
    });
  }

  return new Response(
    renderPreviewPage({
      title:
        template === 'mfa'
          ? 'MFA security email preview'
          : 'Password reset email preview',
      subject: rendered.subject,
      previewHtml: rendered.html,
      template,
      locale,
      accountSlug,
      applicationName,
      sentTo: send ? recipients : undefined,
    }),
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    }
  );
}
