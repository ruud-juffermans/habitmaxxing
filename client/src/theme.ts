export type ThemeMode = 'light' | 'dark';

const sharedTokens = {
  space: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
  },
  radii: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    pill: '999px',
  },
  fontSizes: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '22px',
    xxl: '28px',
  },
  fontWeights: {
    regular: 400,
    medium: 500,
    bold: 700,
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
  },
};

const lightColors = {
  background: '#f6f7f9',
  surface: '#ffffff',
  surfaceAlt: '#eef0f3',
  border: '#d9dde2',
  text: '#13151a',
  textMuted: '#5a6270',
  primary: '#3357ff',
  primaryText: '#ffffff',
  success: '#2fa36a',
  danger: '#d64545',
  warning: '#d99100',
};

const darkColors = {
  background: '#0f1115',
  surface: '#1a1d24',
  surfaceAlt: '#23272f',
  border: '#2e333c',
  text: '#f2f4f7',
  textMuted: '#9aa1ad',
  primary: '#6b8bff',
  primaryText: '#ffffff',
  success: '#4ed08c',
  danger: '#ef6a6a',
  warning: '#e7b046',
};

export interface AppTheme {
  mode: ThemeMode;
  colors: typeof lightColors;
  space: typeof sharedTokens.space;
  radii: typeof sharedTokens.radii;
  fontSizes: typeof sharedTokens.fontSizes;
  fontWeights: typeof sharedTokens.fontWeights;
  breakpoints: typeof sharedTokens.breakpoints;
}

export const lightTheme: AppTheme = {
  mode: 'light',
  colors: lightColors,
  ...sharedTokens,
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  colors: darkColors,
  ...sharedTokens,
};

export const themes: Record<ThemeMode, AppTheme> = {
  light: lightTheme,
  dark: darkTheme,
};
