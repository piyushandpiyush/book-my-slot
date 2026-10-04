import { NavLink, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';

// Mobile-only bottom navigation for the customer experience. Hidden on the booking flow so its
// own sticky "Continue" bar owns the bottom edge.
export default function BottomNav() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/booking/')) return null;
  return (
    <nav className="bottom-nav" aria-label="Primary">
      <NavLink to="/" end><Icon name="home" /><span>Home</span></NavLink>
      <NavLink to="/businesses"><Icon name="compass" /><span>Explore</span></NavLink>
      <NavLink to="/my-bookings"><Icon name="calendar" /><span>Bookings</span></NavLink>
      <NavLink to="/profile"><Icon name="user" /><span>Profile</span></NavLink>
    </nav>
  );
}
