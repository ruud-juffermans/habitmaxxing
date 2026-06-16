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
  fonts: {
    heading: "'Bricolage Grotesque Variable', Georgia, serif",
    body: "'Outfit Variable', 'Segoe UI', Roboto, sans-serif",
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
  },
};

const lightColors = {
  background: '#ffffff',
  surface: '#f7f8fa',
  surfaceAlt: '#f1f5f9',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  primary: '#dd2e5a',
  primaryText: '#ffffff',
  success: '#2fa36a',
  danger: '#d64545',
  warning: '#d99100',
};

const darkColors = {
  background: '#0a0f1c',
  surface: '#121826',
  surfaceAlt: '#1a2032',
  border: '#2a3244',
  text: '#f4f7fb',
  textMuted: '#cbd5e1',
  primary: '#dd2e5a',
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
  fonts: typeof sharedTokens.fonts;
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
