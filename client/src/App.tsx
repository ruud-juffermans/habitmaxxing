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

// Outlined glyphs (24px grid, stroke-based) used across the shell. The theme
// toggle shows the mode you'll switch *to*: a moon in light mode, a sun in dark.
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

function TodayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <polyline points="8.5 12.5 11 15 15.5 9.5" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="20" x2="5" y2="12" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="19" y1="20" x2="19" y2="9" />
    </svg>
  );
}

function WeekIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="15 7 21 7 21 13" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="7" x2="20" y2="7" />
      <circle cx="9" cy="7" r="2.2" fill="none" />
      <line x1="4" y1="17" x2="20" y2="17" />
      <circle cx="15" cy="17" r="2.2" fill="none" />
    </svg>
  );
}

// Small gradient app mark shown next to the wordmark.
function LogoMark() {
  return (
    <Mark aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 12.5 10.2 16.5 18 8" />
      </svg>
    </Mark>
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

// The primary destinations that fit in the mobile tab bar; the drawer still
// lists everything.
const TAB_ITEMS = [
  { to: '/today', label: 'Today', icon: <TodayIcon /> },
  { to: '/history', label: 'History', icon: <HistoryIcon /> },
  { to: '/stats', label: 'Stats', icon: <StatsIcon /> },
  { to: '/week', label: 'Week', icon: <WeekIcon /> },
  { to: '/settings', label: 'Settings', icon: <SettingsIcon /> },
];

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
          <Brand>
            <LogoMark />
            habitmaxxing
          </Brand>
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
          <Brand>
            <LogoMark />
            habitmaxxing
          </Brand>
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
      {/* Native-feeling bottom tab bar on phones. */}
      <TabBar>
        {TAB_ITEMS.map((item) => (
          <TabLink key={item.to} to={item.to}>
            <TabIcon>{item.icon}</TabIcon>
            <TabLabel>{item.label}</TabLabel>
          </TabLink>
        ))}
      </TabBar>
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

// Translucent, blurred app bar.
const Nav = styled.nav`
  background: color-mix(in srgb, ${({ theme }) => theme.colors.background} 78%, transparent);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

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

const Mark = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.gradientPrimary};
  box-shadow: ${({ theme }) => theme.shadows.xs};
  flex-shrink: 0;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const Brand = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: 1.3rem;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
`;

const Hamburger = styled.button`
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 40px;
  height: 40px;
  padding: 0 9px;
  background: transparent;
  border: none;
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:active {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }

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
    background: ${({ theme }) => theme.colors.overlay};
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    opacity: ${({ $open }) => ($open ? 1 : 0)};
    pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
    transition: opacity ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.ease};
  }
`;

// Desktop: inline horizontal links inside the header. Hidden on mobile, where
// the <Drawer> and <TabBar> take over.
const DesktopLinks = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.xs};
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
    width: 82%;
    max-width: 320px;
    padding: ${({ theme }) => theme.space.lg} ${({ theme }) => theme.space.md};
    padding-bottom: calc(${({ theme }) => theme.space.lg} + env(safe-area-inset-bottom));
    background: ${({ theme }) => theme.colors.surface};
    border-right: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 0 ${({ theme }) => theme.radii.xl} ${({ theme }) => theme.radii.xl} 0;
    box-shadow: ${({ theme, $open }) => ($open ? theme.shadows.lg : 'none')};
    transform: translateX(${({ $open }) => ($open ? '0' : '-105%')});
    transition: transform ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.ease};
    overflow-y: auto;
  }
`;

const DrawerHeader = styled.div`
  display: none;

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 ${({ theme }) => theme.space.xs};
    margin-bottom: ${({ theme }) => theme.space.md};
  }
`;

// Vertical stack of nav links in the drawer body.
const DrawerLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
`;

const DrawerDivider = styled.hr`
  width: 100%;
  height: 1px;
  border: none;
  margin: ${({ theme }) => theme.space.sm} 0;
  background: ${({ theme }) => theme.colors.border};
`;

const DrawerFooter = styled.div`
  display: flex;
  justify-content: center;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.sm} 0;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
  border-radius: ${({ theme }) => theme.radii.sm};

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
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
  border-radius: ${({ theme }) => theme.radii.pill};
  transition:
    color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    background-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  /* Pill highlight on the active link (desktop). */
  &.active {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    background: ${({ theme }) => theme.colors.primarySoft};
  }

  &:hover {
    text-decoration: none;
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }

  &.active:hover {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primarySoft};
  }

  /* In the mobile drawer the links stack vertically with roomier targets. */
  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    border-radius: ${({ theme }) => theme.radii.md};
    padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg};
    font-size: ${({ theme }) => theme.fontSizes.md};
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

// Circular icon toggle; the sun/moon icon tilts on hover.
const ThemeToggle = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 50%;
  cursor: pointer;
  transition:
    color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    background-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  svg {
    width: 18px;
    height: 18px;
    transition: transform ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.spring};
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.borderStrong};
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }

  &:hover svg {
    transform: rotate(-14deg);
  }
`;

// The header copy of the theme toggle is desktop-only; on mobile the toggle
// lives inside the drawer.
const DesktopThemeToggle = styled(ThemeToggle)`
  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: none;
  }
`;

// Contained gradient CTA in the header.
const SignOut = styled.button`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.lg};
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: ${({ theme }) => theme.colors.primaryText};
  border: none;
  border-radius: ${({ theme }) => theme.radii.pill};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  cursor: pointer;
  white-space: nowrap;
  transition:
    transform ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    box-shadow ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    filter ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadows.glowPrimary};
    filter: brightness(1.06);
  }

  &:active {
    transform: scale(0.97);
  }
`;

const GuestBanner = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  background: ${({ theme }) => theme.colors.gradientPrimary};
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

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    /* Leave room for the fixed bottom tab bar (+ iOS home indicator). */
    padding-bottom: calc(84px + env(safe-area-inset-bottom));
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding-left: ${({ theme }) => theme.space.lg};
    padding-right: ${({ theme }) => theme.space.lg};
    padding-top: ${({ theme }) => theme.space.lg};
  }
`;

// Fixed, blurred bottom tab bar — phones only.
const TabBar = styled.nav`
  display: none;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 45;
    padding: 6px ${({ theme }) => theme.space.sm};
    padding-bottom: calc(6px + env(safe-area-inset-bottom));
    background: color-mix(in srgb, ${({ theme }) => theme.colors.surface} 82%, transparent);
    backdrop-filter: blur(18px) saturate(160%);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const TabIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: ${({ theme }) => theme.radii.pill};
  transition: transform ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.spring};

  svg {
    width: 22px;
    height: 22px;
  }
`;

const TabLabel = styled.span`
  font-size: 11px;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  letter-spacing: 0.01em;
`;

const TabLink = styled(NavLink)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 0 4px;
  color: ${({ theme }) => theme.colors.textFaint};
  text-decoration: none;
  border-radius: ${({ theme }) => theme.radii.md};
  -webkit-tap-highlight-color: transparent;

  &:hover {
    text-decoration: none;
  }

  &.active {
    color: ${({ theme }) => theme.colors.primary};
  }

  &.active ${TabIcon} {
    transform: translateY(-1px) scale(1.08);
  }

  &:active ${TabIcon} {
    transform: scale(0.9);
  }
`;
