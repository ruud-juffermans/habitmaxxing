import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }

  html, body, #root { height: 100%; }

  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: ${({ theme }) => theme.fontSizes.md};
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.background};
    -webkit-font-smoothing: antialiased;
  }

  button { font-family: inherit; }

  input, select, textarea { font-family: inherit; font-size: inherit; color: inherit; }

  a { color: ${({ theme }) => theme.colors.primary}; text-decoration: none; }
  a:hover { text-decoration: underline; }
`;
