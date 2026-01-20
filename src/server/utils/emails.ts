import { env } from '@/env';
import { Resend } from 'resend';

type PasswordResetEmailArgs = {
  to: string;
  name?: string;
  resetUrl: string;
};

export async function sendPasswordResetEmail({ to, name, resetUrl }: PasswordResetEmailArgs) {
  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({
    from: env.RESEND_MAIL_FROM,
    to,
    subject: 'Restablecer tu contraseña - Qodari IAM',
    html: `
      <p>Hola ${name ?? ''},</p>
      <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Qodari IAM.</p>
      <p>Haz clic en el siguiente enlace para establecer una nueva contraseña:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Si tú no solicitaste este cambio, puedes ignorar este correo.</p>
      <p>Este enlace expirará en 1 hora.</p>
    `,
  });
  return;
}

type MfaCodeEmailArgs = {
  to: string;
  name?: string;
  code: string;
  expiresInMinutes: number;
};

export async function sendMfaCodeEmail({
  to,
  name,
  code,
  expiresInMinutes,
}: MfaCodeEmailArgs) {
  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({
    from: env.RESEND_MAIL_FROM,
    to,
    subject: 'Tu código de verificación - Qodari IAM',
    html: `
      <p>Hola ${name ?? ''},</p>
      <p>Tu código de verificación es:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px; text-align: center; padding: 20px; background-color: #f5f5f5; border-radius: 8px;">${code}</p>
      <p>Este código expirará en ${expiresInMinutes} minutos.</p>
      <p>Si tú no solicitaste este código, puedes ignorar este correo.</p>
    `,
  });
  return;
}
