import type { LocaleShape } from '@/i18n/types';
import type { AuthMessages } from '../en/auth';

export const auth: LocaleShape<AuthMessages> = {
  imageAlt: 'Imagen de autenticación',
  login: {
    title: 'Inicia sesión en tu cuenta',
    description: 'Ingresa tu correo para acceder a tu cuenta',
    email: 'Correo electrónico',
    emailPlaceholder: 'tu@email.com',
    password: 'Contraseña',
    submit: 'Iniciar sesión',
    submitting: 'Iniciando sesión...',
    forgotPassword: '¿Olvidaste tu contraseña?',
  },
  forgotPassword: {
    title: '¿Olvidaste tu contraseña?',
    description: 'Ingresa tu correo para recibir un enlace de restablecimiento',
    submit: 'Enviar enlace de restablecimiento',
    submitting: 'Enviando...',
    successTitle: 'Solicitud enviada',
    backToLogin: 'Volver al inicio de sesión',
  },
  resetPassword: {
    invalidLinkTitle: 'Enlace inválido',
    invalidLinkDescription:
      'El enlace para restablecer la contraseña no es válido o está incompleto.',
    requestNewLink: 'Solicitar un nuevo enlace',
    title: 'Restablece tu contraseña',
    description: 'Ingresa tu nueva contraseña',
    newPassword: 'Nueva contraseña',
    submit: 'Guardar nueva contraseña',
    submitting: 'Guardando...',
    successTitle: 'Contraseña actualizada',
    backToLogin: 'Volver al inicio de sesión',
  },
  mfa: {
    title: 'Revisa tu correo',
    description: 'Enviamos un código de verificación a',
    verify: 'Verificar',
    verifying: 'Verificando...',
    codeSent: 'Código enviado',
    notReceived: '¿No recibiste el código?',
    resend: 'Reenviar código',
    resendIn: 'Reenviar en',
    sending: 'Enviando...',
    backToLogin: 'Volver al inicio de sesión',
  },
  changePassword: {
    title: 'Cambiar contraseña',
    description: 'Ingresa la información para actualizar tu contraseña.',
    currentPassword: 'Contraseña actual',
    newPassword: 'Nueva contraseña',
    confirmPassword: 'Confirmar contraseña',
    submit: 'Cambiar contraseña',
    submitting: 'Actualizando...',
    successTitle: 'Contraseña actualizada',
  },
};
