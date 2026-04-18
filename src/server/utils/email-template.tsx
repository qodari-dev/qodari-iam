import type { Locale } from '@/i18n/config';
import { getStorageUrl } from '@/utils/storage';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { render } from '@react-email/render';
import * as React from 'react';

type EmailAction = {
  label: string;
  href: string;
};

type EmailLayoutProps = {
  previewText: string;
  accountName: string;
  accountLogo?: string | null;
  eyebrow: string;
  title: string;
  intro: readonly string[];
  action?: EmailAction;
  details?: ReadonlyArray<{ label: string; value: string }>;
  highlightedValue?: string;
  highlightedCaption?: string;
  notes?: readonly string[];
  footerLead: string;
  footerText: string;
};

export type PasswordResetEmailTemplateArgs = {
  locale: Locale;
  name?: string;
  resetUrl: string;
  accountName: string;
  accountLogo?: string | null;
};

export type MfaCodeEmailTemplateArgs = {
  locale: Locale;
  name?: string;
  code: string;
  expiresInMinutes: number;
  accountName: string;
  accountLogo?: string | null;
  applicationName?: string | null;
};

export type RenderedEmail = {
  subject: string;
  react: React.ReactElement;
  html: string;
  text: string;
};

const copy = {
  es: {
    common: {
      securityEmail: 'Correo de seguridad',
      footerLead: '¿Necesitas ayuda?',
      footerText: (accountName: string) =>
        `Este correo fue enviado por ${accountName} a través de Qodari IAM.`,
      accountFallback: 'Cuenta',
    },
    reset: {
      subject: (accountName: string) => `Restablece tu contraseña | ${accountName}`,
      previewText: (accountName: string) =>
        `Usa este enlace para restablecer tu contraseña en ${accountName}.`,
      title: 'Restablece tu contraseña',
      intro: (name: string, accountName: string) => [
        `Hola ${name},`,
        `Recibimos una solicitud para restablecer la contraseña de tu cuenta en ${accountName}.`,
        'Haz clic en el botón de abajo para crear una nueva contraseña segura.',
      ],
      action: 'Restablecer contraseña',
      details: {
        linkLabel: 'Enlace de recuperación',
      },
      notes: [
        'Este enlace expirará en 1 hora.',
        'Si no solicitaste este cambio, puedes ignorar este correo con tranquilidad.',
      ],
    },
    mfa: {
      subject: (accountName: string) => `Tu código de verificación | ${accountName}`,
      previewText: (applicationName: string, accountName: string) =>
        `Usa este código para continuar el acceso a ${applicationName || accountName}.`,
      title: 'Tu código de verificación',
      intro: (name: string, applicationName: string, accountName: string) => [
        `Hola ${name},`,
        `Usa el siguiente código para continuar el acceso a ${applicationName || accountName}.`,
        'Por seguridad, no compartas este código con nadie.',
      ],
      highlightedCaption: 'Código de verificación',
      expiresLabel: 'Vence en',
      expiresValue: (minutes: number) => `${minutes} min`,
      accountLabel: 'Cuenta',
      applicationLabel: 'Aplicación',
      notes: [
        'Si no iniciaste este proceso, puedes ignorar este correo.',
        'Si recibes varios correos como este, revisa con tu equipo quién está intentando acceder.',
      ],
    },
  },
  en: {
    common: {
      securityEmail: 'Security email',
      footerLead: 'Need help?',
      footerText: (accountName: string) =>
        `This email was sent by ${accountName} through Qodari IAM.`,
      accountFallback: 'Account',
    },
    reset: {
      subject: (accountName: string) => `Reset your password | ${accountName}`,
      previewText: (accountName: string) => `Use this link to reset your password for ${accountName}.`,
      title: 'Reset your password',
      intro: (name: string, accountName: string) => [
        `Hello ${name},`,
        `We received a request to reset the password for your account in ${accountName}.`,
        'Click the button below to create a new secure password.',
      ],
      action: 'Reset password',
      details: {
        linkLabel: 'Recovery link',
      },
      notes: [
        'This link will expire in 1 hour.',
        'If you did not request this change, you can safely ignore this email.',
      ],
    },
    mfa: {
      subject: (accountName: string) => `Your verification code | ${accountName}`,
      previewText: (applicationName: string, accountName: string) =>
        `Use this code to continue signing in to ${applicationName || accountName}.`,
      title: 'Your verification code',
      intro: (name: string, applicationName: string, accountName: string) => [
        `Hello ${name},`,
        `Use the code below to continue signing in to ${applicationName || accountName}.`,
        'For your security, do not share this code with anyone.',
      ],
      highlightedCaption: 'Verification code',
      expiresLabel: 'Expires in',
      expiresValue: (minutes: number) => `${minutes} min`,
      accountLabel: 'Account',
      applicationLabel: 'Application',
      notes: [
        'If you did not start this sign-in flow, you can ignore this email.',
        'If you receive multiple emails like this, check with your team who is trying to access.',
      ],
    },
  },
} as const;

const styles = {
  main: {
    backgroundColor: '#f3f4f6',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    margin: '0 auto',
    padding: '32px 16px',
    color: '#111827',
  },
  container: {
    maxWidth: '640px',
    margin: '0 auto',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '24px',
    overflow: 'hidden',
  },
  hero: {
    padding: '32px 32px 24px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e5e7eb',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
  },
  logoImage: {
    maxWidth: '56px',
    maxHeight: '56px',
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    objectFit: 'contain' as const,
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
  },
  logoFallback: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    backgroundColor: '#111827',
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '700',
    lineHeight: '56px',
    textAlign: 'center' as const,
  },
  brandMeta: {
    marginLeft: '16px',
  },
  securityLabel: {
    fontSize: '12px',
    color: '#6b7280',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    margin: '0 0 6px',
  },
  brandName: {
    fontSize: '24px',
    lineHeight: '32px',
    fontWeight: '700',
    margin: 0,
  },
  content: {
    padding: '32px',
  },
  eyebrow: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '999px',
    backgroundColor: '#eef2f7',
    color: '#111827',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    marginBottom: '18px',
  },
  heading: {
    fontSize: '30px',
    lineHeight: '36px',
    fontWeight: '700',
    margin: '0 0 18px',
    color: '#111827',
  },
  paragraph: {
    margin: '0 0 14px',
    color: '#111827',
    fontSize: '16px',
    lineHeight: '26px',
  },
  actionWrap: {
    margin: '28px 0 24px',
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: '12px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '15px',
    fontWeight: '700',
    padding: '14px 22px',
    textDecoration: 'none',
  },
  highlightBox: {
    margin: '28px 0 24px',
    padding: '22px 24px',
    borderRadius: '18px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    textAlign: 'center' as const,
  },
  highlightCaption: {
    fontSize: '12px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#6b7280',
    margin: '0 0 10px',
    fontWeight: '600',
  },
  highlightValue: {
    fontSize: '34px',
    lineHeight: '38px',
    letterSpacing: '0.28em',
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    margin: 0,
  },
  detailsWrap: {
    marginTop: '8px',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  detailRow: {
    borderBottom: '1px solid #e5e7eb',
  },
  detailLabel: {
    backgroundColor: '#f9fafb',
    color: '#6b7280',
    fontSize: '13px',
    width: '180px',
    padding: '14px 16px',
    verticalAlign: 'top' as const,
  },
  detailValue: {
    fontSize: '13px',
    lineHeight: '20px',
    wordBreak: 'break-word' as const,
    padding: '14px 16px',
  },
  notesWrap: {
    marginTop: '24px',
  },
  note: {
    margin: '0 0 10px',
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: '22px',
  },
  footer: {
    padding: '22px 32px 28px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  footerLead: {
    margin: '0 0 8px',
    fontSize: '14px',
    lineHeight: '22px',
    fontWeight: '600',
    color: '#111827',
  },
  footerText: {
    margin: 0,
    fontSize: '13px',
    lineHeight: '21px',
    color: '#6b7280',
  },
  metaFooter: {
    paddingTop: '16px',
    color: '#6b7280',
    fontSize: '12px',
    lineHeight: '20px',
    textAlign: 'center' as const,
  },
} as const;

function getAccountDisplayName(accountName?: string) {
  return accountName?.trim() || 'Qodari IAM';
}

function getInitials(value: string) {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (words.length === 0) {
    return 'QI';
  }

  return words.map((word) => word[0]?.toUpperCase() ?? '').join('');
}

function EmailLayout({
  previewText,
  accountName,
  accountLogo,
  eyebrow,
  title,
  intro,
  action,
  details,
  highlightedValue,
  highlightedCaption,
  notes,
  footerLead,
  footerText,
}: EmailLayoutProps) {
  const displayName = getAccountDisplayName(accountName);
  const logoUrl = getStorageUrl(accountLogo);
  const initials = getInitials(displayName);

  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.card}>
            <Section style={styles.hero}>
              <div style={styles.brandRow}>
                {logoUrl ? (
                  <Img src={logoUrl} alt={displayName} width="56" height="56" style={styles.logoImage} />
                ) : (
                  <div style={styles.logoFallback}>{initials}</div>
                )}
                <div style={styles.brandMeta}>
                  <Text style={styles.securityLabel}>{eyebrow}</Text>
                  <Heading as="h2" style={styles.brandName}>
                    {displayName}
                  </Heading>
                </div>
              </div>
            </Section>

            <Section style={styles.content}>
              <div style={styles.eyebrow}>{eyebrow}</div>
              <Heading as="h1" style={styles.heading}>
                {title}
              </Heading>

              {intro.map((paragraph, index) => (
                <Text
                  key={`${paragraph}-${index}`}
                  style={{
                    ...styles.paragraph,
                    marginBottom: index === intro.length - 1 ? '0' : '14px',
                  }}
                >
                  {paragraph}
                </Text>
              ))}

              {highlightedValue ? (
                <Section style={styles.highlightBox}>
                  {highlightedCaption ? <Text style={styles.highlightCaption}>{highlightedCaption}</Text> : null}
                  <Text style={styles.highlightValue}>{highlightedValue}</Text>
                </Section>
              ) : null}

              {action ? (
                <Section style={styles.actionWrap}>
                  <Button href={action.href} style={styles.button}>
                    {action.label}
                  </Button>
                </Section>
              ) : null}

              {details?.length ? (
                <Section style={styles.detailsWrap}>
                  {details.map((detail, index) => (
                    <table
                      key={`${detail.label}-${detail.value}`}
                      role="presentation"
                      width="100%"
                      cellPadding="0"
                      cellSpacing="0"
                      style={{
                        borderCollapse: 'collapse',
                        width: '100%',
                        ...(index === details.length - 1 ? {} : styles.detailRow),
                      }}
                    >
                      <tbody>
                        <tr>
                          <td style={styles.detailLabel}>{detail.label}</td>
                          <td style={styles.detailValue}>{detail.value}</td>
                        </tr>
                      </tbody>
                    </table>
                  ))}
                </Section>
              ) : null}

              {notes?.length ? (
                <>
                  <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0 18px' }} />
                  <Section style={styles.notesWrap}>
                    {notes.map((note, index) => (
                      <Text
                        key={`${note}-${index}`}
                        style={{
                          ...styles.note,
                          marginBottom: index === notes.length - 1 ? '0' : '10px',
                        }}
                      >
                        {note}
                      </Text>
                    ))}
                  </Section>
                </>
              ) : null}
            </Section>

            <Section style={styles.footer}>
              <Text style={styles.footerLead}>{footerLead}</Text>
              <Text style={styles.footerText}>{footerText}</Text>
            </Section>
          </Section>

          <Text style={styles.metaFooter}>Qodari IAM · {new Date().getFullYear()}</Text>
        </Container>
      </Body>
    </Html>
  );
}

function PasswordResetEmail({
  locale,
  name,
  resetUrl,
  accountName,
  accountLogo,
}: PasswordResetEmailTemplateArgs) {
  const localeCopy = copy[locale];
  const displayName = getAccountDisplayName(accountName);
  const displayRecipient = name?.trim() || localeCopy.common.accountFallback;

  return (
    <EmailLayout
      previewText={localeCopy.reset.previewText(displayName)}
      accountName={displayName}
      accountLogo={accountLogo}
      eyebrow={localeCopy.common.securityEmail}
      title={localeCopy.reset.title}
      intro={localeCopy.reset.intro(displayRecipient, displayName)}
      action={{ label: localeCopy.reset.action, href: resetUrl }}
      details={[{ label: localeCopy.reset.details.linkLabel, value: resetUrl }]}
      notes={localeCopy.reset.notes}
      footerLead={localeCopy.common.footerLead}
      footerText={localeCopy.common.footerText(displayName)}
    />
  );
}

function MfaCodeEmail({
  locale,
  name,
  code,
  expiresInMinutes,
  accountName,
  accountLogo,
  applicationName,
}: MfaCodeEmailTemplateArgs) {
  const localeCopy = copy[locale];
  const displayName = getAccountDisplayName(accountName);
  const displayRecipient = name?.trim() || localeCopy.common.accountFallback;
  const effectiveApplicationName = applicationName?.trim() || displayName;

  return (
    <EmailLayout
      previewText={localeCopy.mfa.previewText(effectiveApplicationName, displayName)}
      accountName={displayName}
      accountLogo={accountLogo}
      eyebrow={localeCopy.common.securityEmail}
      title={localeCopy.mfa.title}
      intro={localeCopy.mfa.intro(displayRecipient, effectiveApplicationName, displayName)}
      highlightedValue={code}
      highlightedCaption={localeCopy.mfa.highlightedCaption}
      details={[
        { label: localeCopy.mfa.expiresLabel, value: localeCopy.mfa.expiresValue(expiresInMinutes) },
        { label: localeCopy.mfa.accountLabel, value: displayName },
        { label: localeCopy.mfa.applicationLabel, value: effectiveApplicationName },
      ]}
      notes={localeCopy.mfa.notes}
      footerLead={localeCopy.common.footerLead}
      footerText={localeCopy.common.footerText(displayName)}
    />
  );
}

async function finalizeEmail(subject: string, reactNode: React.ReactElement): Promise<RenderedEmail> {
  const html = await render(reactNode);
  const text = await render(reactNode, { plainText: true });

  return {
    subject,
    react: reactNode,
    html,
    text,
  };
}

export async function renderPasswordResetEmailTemplate(
  args: PasswordResetEmailTemplateArgs
): Promise<RenderedEmail> {
  const displayName = getAccountDisplayName(args.accountName);
  const subject = copy[args.locale].reset.subject(displayName);
  const reactNode = <PasswordResetEmail {...args} />;
  return finalizeEmail(subject, reactNode);
}

export async function renderMfaCodeEmailTemplate(
  args: MfaCodeEmailTemplateArgs
): Promise<RenderedEmail> {
  const displayName = getAccountDisplayName(args.accountName);
  const subject = copy[args.locale].mfa.subject(displayName);
  const reactNode = <MfaCodeEmail {...args} />;
  return finalizeEmail(subject, reactNode);
}
