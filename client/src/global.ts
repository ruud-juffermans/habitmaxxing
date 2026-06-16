import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }

  html, body, #root { height: 100%; }

  body {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.body};
    font-size: ${({ theme }) => theme.fontSizes.md};
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.background};
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: ${({ theme }) => theme.fonts.heading};
    letter-spacing: -0.02em;
  }

  button { font-family: inherit; }

  input, select, textarea { font-family: inherit; font-size: inherit; color: inherit; }

  a { color: ${({ theme }) => theme.colors.primary}; text-decoration: none; }
  a:hover { text-decoration: underline; }
`;
