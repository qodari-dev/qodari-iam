import 'server-only';
import { ClientSecretCredential } from '@azure/identity';
import { Client, ResponseType, RetryHandlerOptions } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { Resend } from 'resend';

export type EmailConfig = {
  EMAIL_PROVIDER?: 'resend' | 'graph';
  EMAIL_FROM_EMAIL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  RESEND_MAIL_FROM?: string;
  MS_GRAPH_TENANT_ID?: string;
  MS_GRAPH_CLIENT_ID?: string;
  MS_GRAPH_CLIENT_SECRET?: string;
};

export type EmailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
};

function required(value: string | undefined, name: string): string {
  if (!value?.trim() || value.includes('CHANGE_ME')) {
    throw new Error(`Configure ${name} before sending email`);
  }
  return value;
}

export function emailSender(config: EmailConfig): string {
  return required(
    config.EMAIL_FROM_EMAIL ||
      (config.EMAIL_PROVIDER === 'graph'
        ? undefined
        : config.RESEND_FROM_EMAIL || config.RESEND_MAIL_FROM),
    'EMAIL_FROM_EMAIL (or the legacy Resend sender when using Resend)'
  );
}

/** Safe to log: never retains SDK errors, tokens, message bodies or recipients. */
export class EmailDeliveryError extends Error {
  constructor(
    public readonly provider: 'resend' | 'graph',
    public readonly status?: number
  ) {
    super(
      `Email submission failed (${provider}${status ? `, HTTP ${status}` : ''}); check provider configuration and delivery logs`
    );
    this.name = 'EmailDeliveryError';
  }
}

/** One instance per process; Azure Identity owns token caching and renewal. */
export function createEmailClient(config: EmailConfig) {
  const provider = config.EMAIL_PROVIDER ?? 'resend';
  if (provider !== 'resend' && provider !== 'graph') throw new Error('Invalid EMAIL_PROVIDER');
  const sender = emailSender(config);
  let resend: Resend | undefined;
  let graph: Client | undefined;

  return async (message: EmailMessage): Promise<void> => {
    if (provider === 'resend') {
      resend ??= new Resend(required(config.RESEND_API_KEY, 'RESEND_API_KEY'));
      const name = message.fromName?.replace(/[\r\n<>]/g, '').trim();
      const from = name ? `${name} <${sender}>` : sender;
      try {
        const { error } = await resend.emails.send({
          from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ? { replyTo: message.replyTo } : {}),
          ...(message.attachments?.length
            ? {
                attachments: message.attachments.map((file) => ({
                  ...file,
                  content: file.content.toString('base64'),
                })),
              }
            : {}),
        });
        if (error) throw new EmailDeliveryError(provider, error.statusCode ?? undefined);
      } catch (error) {
        if (error instanceof EmailDeliveryError) throw error;
        throw new EmailDeliveryError(provider);
      }
      return;
    }

    // sendMail + Mail.Send supports small inline attachments. Larger uploads
    // require drafts/upload sessions and additional permissions (Mail.ReadWrite).
    if (message.attachments?.some((file) => file.content.length >= 3 * 1024 * 1024)) {
      throw new Error(
        'Graph email attachments must be smaller than 3 MiB; use a download link for larger files'
      );
    }
    const payload = {
      message: {
        subject: message.subject,
        body: { contentType: 'HTML', content: message.html },
        toRecipients: (Array.isArray(message.to) ? message.to : [message.to]).map((address) => ({
          emailAddress: { address },
        })),
        ...(message.replyTo ? { replyTo: [{ emailAddress: { address: message.replyTo } }] } : {}),
        ...(message.attachments?.length
          ? {
              attachments: message.attachments.map((file) => ({
                '@odata.type': '#microsoft.graph.fileAttachment',
                name: file.filename,
                contentType: file.contentType || 'application/octet-stream',
                contentBytes: file.content.toString('base64'),
              })),
            }
          : {}),
      },
      saveToSentItems: true,
    };
    if (Buffer.byteLength(JSON.stringify(payload), 'utf8') >= 4 * 1024 * 1024) {
      throw new Error(
        'Graph email request must be smaller than 4 MiB including encoded attachments; use download links'
      );
    }
    if (!graph) {
      const credential = new ClientSecretCredential(
        required(config.MS_GRAPH_TENANT_ID, 'MS_GRAPH_TENANT_ID'),
        required(config.MS_GRAPH_CLIENT_ID, 'MS_GRAPH_CLIENT_ID'),
        required(config.MS_GRAPH_CLIENT_SECRET, 'MS_GRAPH_CLIENT_SECRET')
      );
      graph = Client.initWithMiddleware({
        authProvider: new TokenCredentialAuthenticationProvider(credential, {
          scopes: ['https://graph.microsoft.com/.default'],
        }),
      });
    }
    try {
      const response: Response = await graph
        .api(`/users/${encodeURIComponent(sender)}/sendMail`)
        .version('v1.0')
        // sendMail is not idempotent. Do not silently repeat a submission after
        // an ambiguous failure, or switch providers and risk duplicate emails.
        .middlewareOptions([new RetryHandlerOptions(3, 0)])
        .options({ signal: AbortSignal.timeout(30_000) })
        .responseType(ResponseType.RAW)
        .post(payload);
      await response.body?.cancel();
      if (response.status !== 202) throw new EmailDeliveryError(provider, response.status);
      // Accepted for processing, not a delivery receipt.
    } catch (error) {
      if (error instanceof EmailDeliveryError) throw error;
      const status =
        error &&
        typeof error === 'object' &&
        'statusCode' in error &&
        typeof error.statusCode === 'number'
          ? error.statusCode
          : undefined;
      throw new EmailDeliveryError(provider, status);
    }
  };
}
