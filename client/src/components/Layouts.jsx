import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import BottomNav from './BottomNav.jsx';
import Footer from './Footer.jsx';
import Icon from './Icon.jsx';
import Navbar, { Brand } from './Navbar.jsx';
import NotificationBell from './NotificationBell.jsx';
import { Avatar } from './ui.jsx';
import { fmtDate, todayStr } from '../utils/format.js';

export function CustomerLayout() {
  const { pathname } = useLocation();
  return (
    <>
      <Navbar />
      <main key={pathname}><Outlet /></main>
      <Footer />
      <BottomNav />
    </>
  );
}

const OWNER_NAV = [
  ['/owner', 'Overview', 'grid', true], ['/owner/appointments', 'Appointments', 'list'], ['/owner/calendar', 'Calendar', 'calendar'],
  ['/owner/services', 'Services', 'scissors'], ['/owner/business', 'Business Profile', 'building'], ['/owner/hours', 'Working Hours', 'clock'],
  ['/owner/reviews', 'Reviews', 'star'], ['/owner/settings', 'Settings', 'settings'],
];
const ADMIN_NAV = [
  ['/admin', 'Dashboard', 'grid', true], ['/admin/users', 'Users', 'users'], ['/admin/businesses', 'Businesses', 'building'],
  ['/admin/bookings', 'Bookings', 'calendar'], ['/admin/reviews', 'Reviews', 'star'],
];

// Separate shell for business owners and admins: sidebar on desktop, scrollable pills on mobile.
export function DashboardLayout({ role }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const items = role === 'OWNER' ? OWNER_NAV : ADMIN_NAV;
  const link = ([to, label, icon, end]) => <NavLink key={to} to={to} end={end} className="side-link"><Icon name={icon} />{label}</NavLink>;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div style={{ padding: '.2rem .5rem 1rem' }}><Brand to={role === 'OWNER' ? '/owner' : '/admin'} /></div>
        <div className="side-sep" style={{ marginTop: 0 }}>{role === 'OWNER' ? 'Business' : 'Platform'}</div>
        {items.map(link)}
        <div className="side-foot">
          <Link className="side-link" to="/"><Icon name="compass" />View website</Link>
          <button className="side-link" style={{ background: 'none', border: 0, width: '100%', cursor: 'pointer', font: 'inherit' }} onClick={async () => { await logout(); nav('/'); }}><Icon name="logout" />Sign out</button>
        </div>
      </aside>
      <div className="shell-main">
        <div className="shell-top">
          <div className="grow"><div className="xs faint">{fmtDate(todayStr(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
          <span className="live hide-sm">Live</span>
          <NotificationBell />
          <Link to="/profile" aria-label="My account"><Avatar user={user} /></Link>
        </div>
        <nav className="mobile-tabs" aria-label="Sections">
          {items.map(([to, label, , end]) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}
        </nav>
        <div className="shell-body" key={pathname}><Outlet /></div>
      </div>
    </div>
  );
}
