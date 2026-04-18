export const theme = {
  toggle: 'Toggle theme',
  light: 'Light',
  dark: 'Dark',
  system: 'System',
} as const;

export type ThemeMessages = typeof theme;
