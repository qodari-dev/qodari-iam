import { env } from '@/env';
import { Resend } from 'resend';

const resend = new Resend(env.RESEND_API_KEY);

type PasswordResetEmailArgs = {
  to: string;
  name?: string;
  resetUrl: string;
};

export async function sendPasswordResetEmail({ to, name, resetUrl }: PasswordResetEmailArgs) {
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
