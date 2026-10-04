import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import Icon from '../components/Icon.jsx';
import { Brand } from '../components/Navbar.jsx';
import { ErrorBox } from '../components/ui.jsx';
import { errMsg } from '../services/api.js';
import { IMG } from '../utils/images.js';

export const homeFor = (role) => (role === 'OWNER' ? '/owner' : role === 'ADMIN' ? '/admin' : '/');

// One screen for sign in and sign up: Google is the only way in.
export default function Login() {
  const { googleLogin } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [role, setRole] = useState('CUSTOMER');
  const [error, setError] = useState('');

  const google = async (credential) => {
    setError('');
    try {
      const { user, created } = await googleLogin(credential, role);
      nav(created && user.role === 'OWNER' ? '/owner/business' : loc.state?.from || homeFor(user.role), { replace: true });
    } catch (err) { setError(errMsg(err)); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-art" style={{ backgroundImage: `url(${IMG.auth})` }}>
        <div>
          <div className="eyebrow"><Icon name="sparkles" size={14} /> Book My Slot</div>
          <h1 style={{ fontSize: '2.6rem' }}>Book your time.<br />Skip the wait.</h1>
          <p className="muted">One live schedule for online bookings and walk-ins — for customers and the businesses they love.</p>
        </div>
      </div>
      <div className="auth-card">
        <div className="inner">
          <div style={{ marginBottom: '1.6rem' }}><Brand /></div>
          <h2>Welcome</h2>
          <p className="muted small">Continue with Google. New here? Your account is created automatically.</p>
          <ErrorBox message={error} />
          <div className="choice-grid" style={{ gridTemplateColumns: '1fr 1fr', margin: '1.2rem 0' }} role="radiogroup" aria-label="Account type for new users">
            <button type="button" className={`choice ${role === 'CUSTOMER' ? 'on' : ''}`} onClick={() => setRole('CUSTOMER')}><b>Customer</b><span>Book appointments</span></button>
            <button type="button" className={`choice ${role === 'OWNER' ? 'on' : ''}`} onClick={() => setRole('OWNER')}><b>Business owner</b><span>List my salon / parlour</span></button>
          </div>
          <GoogleButton onCredential={google} text="continue_with" />
          <p className="xs faint" style={{ marginTop: '1.4rem', textAlign: 'center' }}>Account type applies only when creating a new account.</p>
        </div>
      </div>
    </div>
  );
}
