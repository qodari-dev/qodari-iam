import type { LocaleShape } from '@/i18n/types';
import type { NavigationMessages } from '../en/navigation';

export const navigation: LocaleShape<NavigationMessages> = {
  main: 'Principal',
  users: 'Usuarios',
  applications: 'Aplicaciones',
  roles: 'Roles',
  apiClients: 'Clientes API',
  auditLogs: 'Registros de auditoría',
  settings: 'Configuración',
  portal: 'Portal',
  logout: 'Cerrar sesión',
  loggingOut: 'Cerrando sesión...',
};
