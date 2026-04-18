import type { LocaleShape } from '@/i18n/types';
import type { PortalMessages } from '../en/portal';

export const portal: LocaleShape<PortalMessages> = {
  noAuthenticatedUser: 'No hay usuario autenticado',
  welcome: (firstName: string, lastName: string) => `Bienvenido, ${firstName} ${lastName}`,
  goToApplication: 'Ir a la aplicación',
  profileMenuTitle: 'Menú de perfil',
  changePassword: 'Cambiar contraseña',
};
