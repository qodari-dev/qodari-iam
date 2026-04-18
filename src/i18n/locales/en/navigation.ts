export const navigation = {
  main: 'Main',
  users: 'Users',
  applications: 'Applications',
  roles: 'Roles',
  apiClients: 'API Clients',
  auditLogs: 'Audit Logs',
  settings: 'Settings',
  portal: 'Portal',
  logout: 'Log out',
  loggingOut: 'Logging out...',
} as const;

export type NavigationMessages = typeof navigation;
