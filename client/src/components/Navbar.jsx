import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from './Icon.jsx';
import NotificationBell, { usePopover } from './NotificationBell.jsx';
import { Avatar } from './ui.jsx';

export const Brand = ({ to = '/' }) => (
  <Link to={to} className="brand"><span className="brand-mark"><Icon name="scissors" size={18} /></span>Book My Slot</Link>
);

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const menu = usePopover();
  const dash = user?.role === 'OWNER' ? '/owner' : user?.role === 'ADMIN' ? '/admin' : null;

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Brand />
        <nav className="nav-links" aria-label="Main">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/businesses">Explore</NavLink>
          <NavLink to="/my-bookings">Bookings</NavLink>
          {dash && <NavLink to={dash}>Dashboard</NavLink>}
        </nav>
        <div className="nav-right">
          <button className="icon-btn" onClick={() => nav('/businesses')} aria-label="Search"><Icon name="search" /></button>
          {user && <NotificationBell />}
          {user ? (
            <div className="pop-wrap" ref={menu.ref}>
              <button onClick={() => menu.setOpen(!menu.open)} aria-label="Account menu" style={{ border: 0, padding: 0, background: 'none', borderRadius: '50%' }}><Avatar user={user} /></button>
              {menu.open && (
                <div className="popover menu" onClick={() => menu.setOpen(false)}>
                  <div style={{ padding: '.6rem .75rem' }}><b>{user.name}</b><div className="muted xs">{user.email}</div></div>
                  <hr className="divider" style={{ margin: '.3rem 0' }} />
                  {user.role === 'CUSTOMER' && <button className="menu-item" onClick={() => nav('/my-bookings')}><Icon name="calendar" /> My bookings</button>}
                  {dash && <button className="menu-item" onClick={() => nav(dash)}><Icon name="grid" /> Dashboard</button>}
                  <button className="menu-item" onClick={() => nav('/profile')}><Icon name="user" /> My account</button>
                  <button className="menu-item" onClick={async () => { await logout(); nav('/'); }}><Icon name="logout" /> Sign out</button>
                </div>
              )}
            </div>
          ) : <Link className="btn ghost sm hide-m" to="/login">Sign in</Link>}
          <Link className="btn sm hide-m" to="/businesses">Find a Slot</Link>
        </div>
      </div>
    </header>
  );
}
