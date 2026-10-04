import { Link } from 'react-router-dom';
import { Brand } from './Navbar.jsx';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div style={{ maxWidth: 320 }}>
          <Brand />
          <p style={{ marginTop: '.8rem' }}>Book your time. Skip the wait. Trusted salons and parlours, one live schedule.</p>
        </div>
        <div className="col" style={{ gap: '.5rem' }}>
          <b style={{ color: 'var(--text)' }}>Explore</b>
          <Link to="/businesses?type=SALON">Salons</Link><Link to="/businesses?type=PARLOUR">Parlours</Link><Link to="/businesses?avail=today">Available today</Link>
        </div>
        <div className="col" style={{ gap: '.5rem' }}>
          <b style={{ color: 'var(--text)' }}>For businesses</b>
          <Link to="/login">List your business</Link><Link to="/login">Owner sign in</Link>
        </div>
      </div>
      <div className="container xs faint" style={{ marginTop: '1.6rem' }}>© {new Date().getFullYear()} Book My Slot</div>
    </footer>
  );
}
