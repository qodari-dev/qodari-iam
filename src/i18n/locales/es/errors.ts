import type { LocaleShape } from '@/i18n/types';
import type { ErrorMessages } from '../en/errors';

export const errors: LocaleShape<ErrorMessages> = {
  unexpected: 'Ocurrió un error inesperado',
  translations: {
    APPLICATION_NAME_REQUIRED: 'El nombre de la aplicación es obligatorio',
    APPLICATION_NAME_TOO_LONG: 'El nombre de la aplicación debe tener como máximo 255 caracteres',
    APPLICATION_SLUG_REQUIRED: 'El slug de la aplicación es obligatorio',
    APPLICATION_SLUG_TOO_LONG: 'El slug de la aplicación debe tener como máximo 100 caracteres',
    APPLICATION_DESCRIPTION_TOO_LONG: 'La descripción debe tener como máximo 500 caracteres',
    APPLICATION_CLIENT_ID_REQUIRED: 'El ID de cliente es obligatorio',
    APPLICATION_CLIENT_SECRET_REQUIRED: 'El secreto del cliente es obligatorio',
    APPLICATION_CLIENT_JWT_SECRET_REQUIRED: 'El JWT secret del cliente es obligatorio',
    APPLICATION_HOME_URL_INVALID: 'La URL de inicio no es válida',
    APPLICATION_LOGOUT_URL_REQUIRED: 'Debes agregar al menos una URL de logout',
    APPLICATION_LOGOUT_URL_INVALID: 'La URL de logout no es válida',
    APPLICATION_CALLBACK_URL_REQUIRED: 'Debes agregar al menos una URL de callback',
    APPLICATION_CALLBACK_URL_INVALID: 'La URL de callback no es válida',
    APPLICATION_PERMISSION_NAME_REQUIRED: 'El nombre del permiso es obligatorio',
    APPLICATION_PERMISSION_NAME_TOO_LONG: 'El nombre del permiso debe tener como máximo 45 caracteres',
    APPLICATION_PERMISSION_RESOURCE_REQUIRED: 'El recurso del permiso es obligatorio',
    APPLICATION_PERMISSION_RESOURCE_TOO_LONG: 'El recurso del permiso debe tener como máximo 45 caracteres',
    APPLICATION_PERMISSION_ACTION_REQUIRED: 'La acción del permiso es obligatoria',
    APPLICATION_PERMISSION_ACTION_TOO_LONG: 'La acción del permiso debe tener como máximo 45 caracteres',
    APPLICATION_PERMISSION_DESCRIPTION_TOO_LONG:
      'La descripción del permiso debe tener como máximo 500 caracteres',
    ROLE_NAME_REQUIRED: 'El nombre del rol es obligatorio',
    ROLE_SLUG_REQUIRED: 'El slug del rol es obligatorio',
    ROLE_APPLICATION_REQUIRED: 'La aplicación es obligatoria',
    ROLE_APPLICATION_INVALID: 'La aplicación no es válida',
    ROLE_DESCRIPTION_TOO_LONG: 'La descripción debe tener como máximo 500 caracteres',
    ROLE_PERMISSION_ID_INVALID: 'El permiso no es válido',
    ACCOUNT_NAME_REQUIRED: 'El nombre de la cuenta es obligatorio',
    ACCOUNT_NAME_TOO_LONG: 'El nombre de la cuenta debe tener como máximo 255 caracteres',
    'Correo electronico invalido': 'Correo electrónico inválido',
    'La contrasena debe tener al menos 8 caracteres':
      'La contraseña debe tener al menos 8 caracteres',
    'Token invalido': 'Token inválido',
    'Las contrasenas no coinciden': 'Las contraseñas no coinciden',
    'Demasiadas solicitudes. Intentalo de nuevo mas tarde.':
      'Demasiadas solicitudes. Inténtalo de nuevo más tarde.',
    'Cuenta invalida': 'Cuenta inválida',
    'Aplicacion invalida': 'Aplicación inválida',
    'Credenciales invalidas': 'Credenciales inválidas',
    'Cuenta bloqueada por intentos fallidos. Contacta al area de sistemas para desbloquearla.':
      'Cuenta bloqueada por intentos fallidos. Contacta al área de sistemas para desbloquearla.',
    'Token de restablecimiento invalido o expirado':
      'Token de restablecimiento inválido o expirado',
    'Contrasena restablecida correctamente. Ya puedes iniciar sesion.':
      'Contraseña restablecida correctamente. Ya puedes iniciar sesión.',
    'No autenticado': 'No autenticado',
    'Token MFA invalido o expirado': 'Token MFA inválido o expirado',
    'El codigo MFA expiro. Inicia sesion nuevamente.':
      'El código MFA expiró. Inicia sesión nuevamente.',
    'Solicitud invalida': 'Solicitud inválida',
    'Demasiados intentos fallidos. Inicia sesion nuevamente.':
      'Demasiados intentos fallidos. Inicia sesión nuevamente.',
    'Codigo invalido': 'Código inválido',
    'Se envio un nuevo codigo a tu correo.': 'Se envió un nuevo código a tu correo.',
    'Cuenta no encontrada': 'Cuenta no encontrada',
    'Error al obtener la cuenta': 'Error al obtener la cuenta',
    'Error al actualizar la cuenta': 'Error al actualizar la cuenta',
    'Ya existe un permiso con ese recurso y acción': 'Ya existe un permiso con ese recurso y acción',
    'Failed to get presigned URL': 'No se pudo preparar la carga de la imagen',
    'Failed to upload file': 'No se pudo subir el archivo',
    'Upload failed': 'La carga falló',
  },
};
