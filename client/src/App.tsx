import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation, Link } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import styled from 'styled-components';
import { GlobalStyle } from './global';
import { themes, type ThemeMode } from './theme';
import { useAuth } from './auth';
import { Today } from './pages/Today';
import { History } from './pages/History';
import { Stats } from './pages/Stats';
import { Week } from './pages/Week';
import { Month } from './pages/Month';
import { AllTime } from './pages/AllTime';
import { Settings } from './pages/Settings';
import { AdminUsers } from './pages/admin/Users';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { VerifyEmail } from './pages/auth/VerifyEmail';

const STORAGE_KEY = 'habitmaxxing.theme';

function readInitialTheme(): ThemeMode {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'light' ? 'light' : 'dark';
}

export function App() {
  const [mode, setMode] = useState<ThemeMode>(readInitialTheme);
  const { user, loading } = useAuth();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  return (
    <ThemeProvider theme={themes[mode]}>
      <GlobalStyle />
      {loading ? (
        <Loading>Loading…</Loading>
      ) : user ? (
        <AuthedApp mode={mode} setMode={setMode} />
      ) : (
        <PublicRoutes />
      )}
    </ThemeProvider>
  );
}

// Routes available when signed out. The email-link destinations (verify-email,
// reset-password) live here so they work before the user has a session.
function PublicRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="*" element={<RedirectToLogin />} />
    </Routes>
  );
}

// Preserve where the user was headed so we can bounce them back after login.
function RedirectToLogin() {
  const location = useLocation();
  const from = location.pathname + location.search;
  const suffix = from && from !== '/' ? `?next=${encodeURIComponent(from)}` : '';
  return <Navigate to={`/login${suffix}`} replace />;
}

function AuthedApp({ mode, setMode }: { mode: ThemeMode; setMode: (m: ThemeMode) => void }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <Shell>
      <Nav>
        <Hamburger
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </Hamburger>
        <Brand>habitmaxxing</Brand>
        <NavLinks $open={menuOpen}>
          <DrawerHeader>
            <Brand>habitmaxxing</Brand>
            <CloseButton onClick={closeMenu} aria-label="Close menu">
              &times;
            </CloseButton>
          </DrawerHeader>
          <StyledNavLink to="/today" onClick={closeMenu}>Today</StyledNavLink>
          <StyledNavLink to="/history" onClick={closeMenu}>History</StyledNavLink>
          <StyledNavLink to="/stats" onClick={closeMenu}>Stats</StyledNavLink>
          <StyledNavLink to="/week" onClick={closeMenu}>Week</StyledNavLink>
          <StyledNavLink to="/month" onClick={closeMenu}>Month</StyledNavLink>
          <StyledNavLink to="/all-time" onClick={closeMenu}>All time</StyledNavLink>
          <StyledNavLink to="/settings" onClick={closeMenu}>Settings</StyledNavLink>
          {user?.role === 'admin' && (
            <StyledNavLink to="/admin" onClick={closeMenu}>Admin</StyledNavLink>
          )}
        </NavLinks>
        <Overlay $open={menuOpen} onClick={closeMenu} aria-hidden="true" />
        <UserArea>
          <UserEmail title={user?.email}>{user?.name || user?.email}</UserEmail>
          <ThemeToggle
            onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
            aria-label="Toggle theme"
          >
            {mode === 'light' ? 'Dark' : 'Light'}
          </ThemeToggle>
          <SignOut onClick={() => logout()}>Sign out</SignOut>
        </UserArea>
      </Nav>
      {user?.isGuest && (
        <GuestBanner>
          <span>You're exploring as a guest, </span>
          <Link to="/settings">Create an account →</Link>
        </GuestBanner>
      )}
      <Main>
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<Today />} />
          <Route path="/history" element={<History />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/week" element={<Week />} />
          <Route path="/month" element={<Month />} />
          <Route path="/all-time" element={<AllTime />} />
          <Route path="/periods" element={<Navigate to="/week" replace />} />
          <Route path="/settings" element={<Settings />} />
          {/* Admin-only; non-admins are bounced to their dashboard. */}
          <Route
            path="/admin"
            element={user?.role === 'admin' ? <AdminUsers /> : <Navigate to="/today" replace />}
          />
          {/* Already authenticated: keep these from showing the public pages. */}
          <Route path="/login" element={<Navigate to="/today" replace />} />
          <Route path="/register" element={<Navigate to="/today" replace />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      </Main>
    </Shell>
  );
}

const Loading = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textMuted};
`;

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

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    gap: ${({ theme }) => theme.space.sm};
    padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  }
`;

const Brand = styled.div`
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: ${({ theme }) => theme.fontSizes.lg};
`;

const Hamburger = styled.button`
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 36px;
  height: 36px;
  padding: 0 8px;
  background: transparent;
  border: none;
  cursor: pointer;

  span {
    display: block;
    height: 2px;
    width: 100%;
    background: ${({ theme }) => theme.colors.text};
    border-radius: 2px;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    display: flex;
  }
`;

const Overlay = styled.div<{ $open: boolean }>`
  display: none;

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 20;
    background: rgba(0, 0, 0, 0.45);
    opacity: ${({ $open }) => ($open ? 1 : 0)};
    pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
    transition: opacity 0.25s ease;
  }
`;

const NavLinks = styled.div<{ $open: boolean }>`
  display: flex;
  gap: ${({ theme }) => theme.space.md};
  flex: 1;

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 30;
    flex: none;
    flex-direction: column;
    gap: ${({ theme }) => theme.space.xs};
    width: 78%;
    max-width: 300px;
    padding: ${({ theme }) => theme.space.md};
    background: ${({ theme }) => theme.colors.surface};
    border-right: 1px solid ${({ theme }) => theme.colors.border};
    transform: translateX(${({ $open }) => ($open ? '0' : '-100%')});
    transition: transform 0.25s ease;
    overflow-y: auto;
  }
`;

const DrawerHeader = styled.div`
  display: none;

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: ${({ theme }) => theme.space.sm};
    padding-bottom: ${({ theme }) => theme.space.sm};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text};
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
`;

const StyledNavLink = styled(NavLink)`
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.textMuted};
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;

  &.active {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }

  &:hover { text-decoration: none; color: ${({ theme }) => theme.colors.text}; }
`;

const UserArea = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    margin-left: auto;
  }
`;

const UserEmail = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    display: none;
  }
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

const SignOut = styled.button`
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.md};
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  white-space: nowrap;

  &:hover { color: ${({ theme }) => theme.colors.text}; background: ${({ theme }) => theme.colors.surfaceAlt}; }
`;

const GuestBanner = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  background: ${({ theme }) => theme.colors.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.primaryText};

  a {
    color: ${({ theme }) => theme.colors.primaryText};
    font-weight: ${({ theme }) => theme.fontWeights.bold};
  }
`;

const Main = styled.main`
  flex: 1;
  padding: ${({ theme }) => theme.space.xl};
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: ${({ theme }) => theme.space.md};
  }
`;
