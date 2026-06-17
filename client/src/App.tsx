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

// Outlined sun/moon glyphs for the theme toggle, matching the outlined look of
// the MUI icons used on ruudjuffermans.nl. The icon shown is the mode you'll
// switch *to*: a moon in light mode, a sun in dark mode.
function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
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

  const navItems = [
    { to: '/today', label: 'Today' },
    { to: '/history', label: 'History' },
    { to: '/stats', label: 'Stats' },
    { to: '/week', label: 'Week' },
    { to: '/month', label: 'Month' },
    { to: '/all-time', label: 'All time' },
    { to: '/settings', label: 'Settings' },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <Shell>
      <HeaderGroup>
      <Nav>
        <NavInner>
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
          <DesktopLinks>
            {navItems.map((item) => (
              <StyledNavLink key={item.to} to={item.to}>{item.label}</StyledNavLink>
            ))}
          </DesktopLinks>
          <UserArea>
            <UserEmail title={user?.email}>{user?.name || user?.email}</UserEmail>
            <DesktopThemeToggle
              onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
              aria-label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              title={mode === 'light' ? 'Dark' : 'Light'}
            >
              {mode === 'light' ? <MoonIcon /> : <SunIcon />}
            </DesktopThemeToggle>
            <SignOut onClick={() => logout()}>Sign out</SignOut>
          </UserArea>
        </NavInner>
      </Nav>
      {user?.isGuest && (
        <GuestBanner>
          <span>You're exploring as a guest, </span>
          <Link to="/settings">Create an account →</Link>
        </GuestBanner>
      )}
      </HeaderGroup>
      {/* Mobile drawer + overlay live OUTSIDE the blurred <Nav>: backdrop-filter
          would otherwise make Nav the containing block for these fixed elements,
          trapping them inside the header bar and behind the page content. */}
      <Overlay $open={menuOpen} onClick={closeMenu} aria-hidden="true" />
      <Drawer $open={menuOpen}>
        <DrawerHeader>
          <CloseButton onClick={closeMenu} aria-label="Close menu">
            &times;
          </CloseButton>
        </DrawerHeader>
        <DrawerLinks>
          {navItems.map((item) => (
            <StyledNavLink key={item.to} to={item.to} onClick={closeMenu}>{item.label}</StyledNavLink>
          ))}
        </DrawerLinks>
        <DrawerDivider />
        <DrawerFooter>
          <ThemeToggle
            onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
            aria-label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            title={mode === 'light' ? 'Dark' : 'Light'}
          >
            {mode === 'light' ? <MoonIcon /> : <SunIcon />}
          </ThemeToggle>
        </DrawerFooter>
      </Drawer>
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

// Sticky group that keeps the header and the guest banner pinned together so
// the banner always stays directly under the header on scroll.
const HeaderGroup = styled.div`
  position: sticky;
  top: 0;
  z-index: 40;
`;

// Translucent, blurred bar with a bottom border — mirrors the
// ruudjuffermans.nl AppBar treatment.
const Nav = styled.nav`
  background: color-mix(in srgb, ${({ theme }) => theme.colors.background} 82%, transparent);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

// Centered content container at the ruudjuffermans.nl width (MUI Container "lg").
const NavInner = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.lg};
  min-height: 64px;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.xl};

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    min-height: 56px;
    gap: ${({ theme }) => theme.space.sm};
    padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.md};
  }
`;

const Brand = styled.div`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: 1.35rem;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text};
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

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: flex;
  }
`;

const Overlay = styled.div<{ $open: boolean }>`
  display: none;

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(0, 0, 0, 0.45);
    opacity: ${({ $open }) => ($open ? 1 : 0)};
    pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
    transition: opacity 0.25s ease;
  }
`;

// Desktop: inline horizontal links inside the header. Hidden on mobile, where
// the <Drawer> below takes over.
const DesktopLinks = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.md};
  flex: 1;

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: none;
  }
`;

// Mobile slide-in drawer. Rendered outside the blurred <Nav> so its fixed
// positioning is relative to the viewport (z-index above the sticky header).
const Drawer = styled.div<{ $open: boolean }>`
  display: none;

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 60;
    display: flex;
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

// Close-button row at the top of the drawer — mirrors the ruudjuffermans.nl
// drawer, which opens with a single close icon aligned to the end.
const DrawerHeader = styled.div`
  display: none;

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-bottom: ${({ theme }) => theme.space.xs};
  }
`;

// Vertical stack of nav links in the drawer body.
const DrawerLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
`;

// Separator between the nav links and the theme toggle, matching the ruud
// drawer's <Divider> above its switcher row.
const DrawerDivider = styled.hr`
  width: 100%;
  height: 1px;
  border: none;
  margin: ${({ theme }) => theme.space.sm} 0;
  background: ${({ theme }) => theme.colors.border};
`;

// Footer row holding the theme toggle, centered like the ruud drawer's
// switcher row.
const DrawerFooter = styled.div`
  display: flex;
  justify-content: center;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.sm} 0;
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
  position: relative;
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.md};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.95rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
  transition: color 0.2s;

  &.active {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: ${({ theme }) => theme.fontWeights.bold};
  }

  /* Red underline indicator under the active link (desktop). */
  &.active::after {
    content: '';
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: 2px;
    border-radius: 1px;
    background: ${({ theme }) => theme.colors.primary};
  }

  &:hover { text-decoration: none; color: ${({ theme }) => theme.colors.primary}; }

  /* In the mobile drawer the links stack vertically, so swap the underline for
     a subtle background highlight on the active item. */
  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    border-radius: ${({ theme }) => theme.radii.md};
    padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg};

    &.active::after { display: none; }
    &.active {
      background: color-mix(in srgb, ${({ theme }) => theme.colors.primary} 12%, transparent);
      color: ${({ theme }) => theme.colors.primary};
    }
  }
`;

const UserArea = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
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

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: none;
  }
`;

// Circular icon toggle mirroring the ruudjuffermans.nl ThemeSwitcher: a small
// bordered button whose sun/moon icon tilts on hover.
const ThemeToggle = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 50%;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background-color 0.2s;

  svg {
    width: 18px;
    height: 18px;
    transition: transform 0.3s cubic-bezier(0.2, 0.65, 0.25, 1);
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.textMuted};
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }

  &:hover svg {
    transform: rotate(-12deg);
  }
`;

// The header copy of the theme toggle is desktop-only; on mobile the toggle
// lives inside the drawer (mirroring ruudjuffermans.nl).
const DesktopThemeToggle = styled(ThemeToggle)`
  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: none;
  }
`;

// Contained red CTA, mirroring the ruudjuffermans.nl header's primary button.
const SignOut = styled.button`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.lg};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.primaryText};
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  cursor: pointer;
  white-space: nowrap;
  transition: transform 0.2s, box-shadow 0.2s, background 0.2s;

  &:hover {
    background: #b8244c;
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(221, 46, 90, 0.24);
  }
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
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: ${({ theme }) => theme.space.md};
  }
`;
