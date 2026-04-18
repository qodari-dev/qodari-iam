export const portal = {
  noAuthenticatedUser: 'No authenticated user',
  welcome: (firstName: string, lastName: string) => `Welcome, ${firstName} ${lastName}`,
  goToApplication: 'Open application',
  profileMenuTitle: 'Profile menu',
  changePassword: 'Change password',
} as const;

export type PortalMessages = typeof portal;
