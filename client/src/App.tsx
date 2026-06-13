import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import styled from 'styled-components';
import { GlobalStyle } from './global';
import { themes, type ThemeMode } from './theme';
import { Today } from './pages/Today';
import { History } from './pages/History';
import { Stats } from './pages/Stats';
import { Periods } from './pages/Periods';
import { Settings } from './pages/Settings';

const STORAGE_KEY = 'lifemaxxing.theme';

function readInitialTheme(): ThemeMode {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'light' ? 'light' : 'dark';
}

export function App() {
  const [mode, setMode] = useState<ThemeMode>(readInitialTheme);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  return (
    <ThemeProvider theme={themes[mode]}>
      <GlobalStyle />
      <Shell>
        <Nav>
          <Brand>lifemaxxing</Brand>
          <NavLinks>
            <StyledNavLink to="/today">Today</StyledNavLink>
            <StyledNavLink to="/history">History</StyledNavLink>
            <StyledNavLink to="/stats">Stats</StyledNavLink>
            <StyledNavLink to="/periods">Periods</StyledNavLink>
            <StyledNavLink to="/settings">Settings</StyledNavLink>
          </NavLinks>
          <ThemeToggle
            onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
            aria-label="Toggle theme"
          >
            {mode === 'light' ? 'Dark' : 'Light'}
          </ThemeToggle>
        </Nav>
        <Main>
          <Routes>
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<Today />} />
            <Route path="/history" element={<History />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/periods" element={<Periods />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Main>
      </Shell>
    </ThemeProvider>
  );
}

const Shell = styled.div`
  min-height: 100%;
  display: flex;
  flex-direction: column;
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.lg};
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.xl};
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Brand = styled.div`
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: ${({ theme }) => theme.fontSizes.lg};
`;

const NavLinks = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.md};
  flex: 1;
`;

const StyledNavLink = styled(NavLink)`
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.textMuted};
  text-decoration: none;

  &.active {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }

  &:hover { text-decoration: none; color: ${({ theme }) => theme.colors.text}; }
`;

const ThemeToggle = styled.button`
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;

  &:hover { background: ${({ theme }) => theme.colors.border}; }
`;

const Main = styled.main`
  flex: 1;
  padding: ${({ theme }) => theme.space.xl};
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
`;
